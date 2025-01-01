# pylint: disable=broad-exception-caught

import logging
import secrets
from datetime import timedelta

from flask import (Blueprint, current_app, jsonify, redirect, request, session,
                   url_for)
from flask_bcrypt import generate_password_hash
from flask_dance.consumer import oauth_authorized
from flask_dance.contrib.discord import discord
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                get_jwt_identity, jwt_required)

from app.blueprints.oauth_blueprints.discord import discord_blueprint
from app.config import load_config
from app.extensions import db
from app.models import OAuth, User
from app.utils.flask.decorators import (rate_limit_oauth,
                                        require_password_confirmation)
from app.utils.flask.oauth import discord_account
from app.utils.flask.password_check import password_check

oauth_blueprint = Blueprint('oauth', __name__)

logger = logging.getLogger(__name__)

config = load_config()


# Provider-specific handlers mapping
OAUTH_HANDLERS = {
    'discord': {
        'create': discord_account.create,
        'delete': discord_account.delete,
        'proxy': discord,
        'blueprint': discord_blueprint,
        'user_query': 'https://discord.com/api/users/@me',
        'username_param': 'username',
        'db_key': 'discord_id',
        'api_id_key': 'id'
    }
}


@oauth_blueprint.errorhandler(429)
def ratelimit_handler(_):
    return jsonify({
        'error': 'Too many OAuth attempts. Please try again later.',
        'retry_after': 3600  # 1 hour
    }), 429


@oauth_blueprint.route('/<provider>/link/init', methods=['POST'])
@jwt_required()
@rate_limit_oauth
def init_link_provider(provider):
    """Initialize the OAuth linking process"""
    try:
        logger.info('Initializing OAuth link for provider: %s', provider)
        user_id = get_jwt_identity()
        logger.info('User ID: %s', user_id)

        if provider not in OAUTH_HANDLERS:
            return jsonify({'error': 'Provider not implemented'}), 501

        # Generate state token and store user info
        state_token = secrets.token_urlsafe(32)

        session['oauth_state'] = state_token
        session['linking_user_id'] = user_id
        session['linking_provider'] = provider
        session.permanent = True
        current_app.permanent_session_lifetime = timedelta(minutes=5)

        logger.info('OAuth link initialized. State: %s, User: %s, Provider: %s',
                    state_token, user_id, provider)

        return jsonify({
            'success': True,
            'state': state_token
        })

    except Exception as e:
        logger.error('Error initializing OAuth link: %s', str(e))
        return jsonify({'error': 'Internal server error'}), 500


@oauth_blueprint.route('/<provider>/link', methods=['GET'])
def link_provider(provider):
    """Handle the OAuth linking redirect"""
    try:
        logger.info('OAuth link request for provider: %s', provider)

        # Verify state and provider
        state = request.args.get('state')
        if not state or state != session.get('oauth_state'):
            return jsonify({'error': 'Invalid state parameter'}), 400

        if provider not in OAUTH_HANDLERS:
            return jsonify({'error': 'Provider not implemented'}), 501

        # Get provider's Flask-Dance blueprint
        # oauth_blueprint = OAUTH_HANDLERS[provider]['blueprint']
        return redirect(url_for(f'{provider}.login'))

    except Exception as e:
        logger.exception('Error in link_provider: %s', str(e))
        return jsonify({'error': 'Internal server error'}), 500


@oauth_blueprint.route('/unlink/<provider>', methods=['POST'])
@jwt_required()
@require_password_confirmation
@rate_limit_oauth
def unlink_provider(provider):
    try:
        if provider not in OAUTH_HANDLERS:
            return jsonify({'error': 'Provider not implemented'}), 501

        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if 'password' in request.json:
            password = request.json['password']
            if not password_check(password):
                return jsonify({
                    'success': False,
                    'error': 'Password does not meet requirements.'
                }), 400
            user.password = generate_password_hash(password).decode('utf8')
            user.primary_login_method = 'password'
            db.session.commit()

        # Prevent unlinking if it's the only authentication method
        if not user.has_alternate_login_methods(exclude_provider=provider):
            return jsonify({
                'error': 'Cannot unlink the only authentication method'
            }), 400

        # Find and delete the OAuth entry
        oauth = OAuth.query.filter_by(
            user_id=user.id,
            provider=provider
        ).first()

        if oauth:

            delete_func = OAUTH_HANDLERS[provider]['delete']
            provider_proxy = OAUTH_HANDLERS[provider]['proxy']
            db_key = OAUTH_HANDLERS[provider]['db_key']

            try:
                delete_func(provider_proxy, config, oauth)
            except Exception as e:
                logger.error('Error revoking %s token: %s', provider, str(e))

            setattr(user, db_key, None)

            del user.oauth[provider]

            db.session.delete(oauth)

            del current_app.blueprints[provider].token

            db.session.commit()

        return jsonify({'success': True})

    except Exception as e:
        logger.error('Error unlinking provider: %s', str(e))
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@oauth_authorized.connect_via(discord_blueprint)
def oauth_logged_in(blueprint, token):
    if not token:
        logger.error('No token received')
        return False

    provider = blueprint.name
    logger.info('OAuth callback started for provider: %s', provider)
    logger.info('Session state: %s', session.get('linking_user_id'))
    logger.info('Session provider: %s', session.get('linking_provider'))

    provider_proxy = OAUTH_HANDLERS[provider]['proxy']
    create_func = OAUTH_HANDLERS[provider]['create']
    username_param = OAUTH_HANDLERS[provider]['username_param']
    user_query = OAUTH_HANDLERS[provider]['user_query']
    db_key = OAUTH_HANDLERS[provider]['db_key']
    api_id_key = OAUTH_HANDLERS[provider]['api_id_key']

    try:
        logger.info('Starting OAuth callback for provider: %s', provider)

        if provider not in OAUTH_HANDLERS:
            logger.error('Provider not implemented: %s', provider)
            return jsonify({'error': 'Provider not implemented'}), 501

        logger.debug('OAuth blueprint token: %s', token)

        if not provider_proxy.authorized:
            logger.error('Authorization failed for provider: %s', provider)
            return jsonify({'error': 'Authorization failed'}), 401

        # Get user info from provider
        logger.info('Fetching user info from %s', provider)
        resp = blueprint.session.get(user_query)
        logger.debug('Provider API response: %s', resp.text if resp else 'No response')

        if not resp.ok:
            logger.error('Failed to get user info from %s: %s', provider, resp.text)
            return jsonify({'error': 'Failed to get user info'}), 400

        user_info = resp.json()
        logger.info('Received user info from %s: %s', provider, user_info.get(username_param))

        # Check if this is a linking flow
        linking_user_id = session.get('linking_user_id')
        if linking_user_id:
            logger.info('Linking flow detected for user: %s', linking_user_id)
            user = User.query.get(linking_user_id)
            if user:
                # Create OAuth entry for existing user
                oauth = OAuth(
                    provider=provider,
                    provider_user_id=str(user_info[api_id_key]),
                    provider_user_login=user_info.get(username_param),
                    user_id=user.id,
                    token=token
                )
                db.session.add(oauth)
                setattr(user, db_key, user_info[api_id_key])
                db.session.commit()
                logger.info('Successfully linked %s account for user %s', provider, user.id)
        else:
            oauth = OAuth.query.filter_by(
                provider_user_id=str(user_info[api_id_key]),
                provider_user_login=user_info.get(username_param),
                provider=provider
            ).first()
            if not oauth:
                logger.info('Creating new user for: %s', user_info.get(username_param))
                user = create_func(user_info, token)
            else:
                user = oauth.user

        # Create tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))

        # Use relative URL for the frontend callback
        redirect_url = f"/oauth/{provider}/callback"
        final_url = f"{redirect_url}?access_token={access_token}&refresh_token={refresh_token}&require_mfa={user.is_mfa_enabled}&user_id={user.id}"

        return redirect(final_url)

    except Exception as e:
        logger.exception('OAuth callback error: %s', str(e))
        db.session.rollback()
        return redirect('/login?error=auth_failed')
