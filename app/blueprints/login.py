import logging

import requests
from flask import Blueprint, current_app, jsonify, request
from flask_bcrypt import check_password_hash
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                get_jwt_identity, jwt_required)

from app.models import User

logger = logging.getLogger(__name__)

login_blueprint = Blueprint('login', __name__)


@login_blueprint.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        remember_me = data.get('remember_me', False)

        # Verify reCAPTCHA
        recaptcha_response = data.get('recaptcha')
        verify_url = 'https://www.google.com/recaptcha/api/siteverify'
        verify_data = {
            'secret': current_app.config['RECAPTCHA_PRIVATE_KEY'],
            'response': recaptcha_response
        }
        verify_response = requests.post(verify_url, data=verify_data, timeout=60).json()
        logger.info('reCAPTCHA verification response: %s', verify_response)

        if not verify_response['success'] or verify_response.get('score', 0) < 0.3:
            logger.warning('Invalid reCAPTCHA for username: %s', username)
            return jsonify({
                'success': False,
                'error': 'Invalid reCAPTCHA. Please try again.'
            }), 400

        user = User.query.filter(
            (User.username == username) | (User.email == username)
        ).first()
        logger.info('User query result for username: %s, found: %s', username, bool(user))

        if user and check_password_hash(user.password, password):
            access_token = create_access_token(identity=str(user.id))
            expires_delta = (
                current_app.config['JWT_REMEMBER_ME_EXPIRES']
                if remember_me
                else current_app.config['JWT_REFRESH_TOKEN_EXPIRES']
            )
            refresh_token = create_refresh_token(
                identity=str(user.id),
                expires_delta=expires_delta
            )

            logger.info('Successful login for user: %s (remember_me: %s)',
                        user.username, remember_me)

            return jsonify({
                'success': True,
                'access_token': access_token,
                'refresh_token': refresh_token,
                'require_mfa': user.is_mfa_enabled,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            })
        else:
            logger.warning('Failed login attempt for username: %s', username)
            return jsonify({
                'success': False,
                'error': 'Invalid username or password'
            }), 401

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error('Login error: %s', e, exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Unhandled error occurred during login'
        }), 500


@login_blueprint.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user)
    return jsonify({'succes': True, 'access_token': new_access_token}), 200
