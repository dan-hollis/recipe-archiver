import logging

from cryptography.fernet import Fernet
from flask import Blueprint, current_app, jsonify, request
from flask_bcrypt import generate_password_hash
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import User, UserSchema
from app.utils.flask.password_check import password_check

logger = logging.getLogger(__name__)

profile_blueprint = Blueprint('profile', __name__)


@profile_blueprint.route('/<int:user_id>', methods=['GET'])
@jwt_required(optional=True)
def profile(user_id):
    try:
        current_user_id = get_jwt_identity()

        user = db.session.query(User).get(int(user_id))
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        user_schema = UserSchema()
        logger.info('User data: %s', user_schema.dump(user))
        # If viewing own profile or is admin, show all fields
        if current_user_id and (int(current_user_id) == user.id or db.session.query(User).get(int(current_user_id)).role == 'admin'):
            user_data = user_schema.dump(user)
            if user_data['spoonacular_api_key']:
                encryption_key = Fernet(current_app.config['ENCRYPTION_KEY'].encode())
                user_spoonacular_api_key = user_data['spoonacular_api_key']
                user_data['spoonacular_api_key'] = encryption_key.decrypt(user_spoonacular_api_key.encode()).decode()
            return jsonify({
                'success': True,
                'user': user_data
            })

        # Otherwise, only show non-hidden fields
        filtered_user = user_schema.dump(user)
        for field in (user.hidden_fields or []):
            if field in filtered_user:
                del filtered_user[field]

        if filtered_user['spoonacular_api_key']:
            encryption_key = Fernet(current_app.config['ENCRYPTION_KEY'].encode())
            user_spoonacular_api_key = filtered_user['spoonacular_api_key']
            filtered_user['spoonacular_api_key'] = encryption_key.decrypt(user_spoonacular_api_key.encode()).decode()
        return jsonify({
            'success': True,
            'user': filtered_user
        })

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error('Error fetching profile data: %s', str(e), exc_info=True)
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@profile_blueprint.route('/theme/update', methods=['POST'])
@jwt_required()
def update_theme():
    user_id = get_jwt_identity()
    user = db.session.query(User).get(int(user_id))
    request_data = request.json
    user.theme = request_data['theme']
    db.session.commit()
    return jsonify({'success': True})


@profile_blueprint.route('/edit', methods=['PUT'])
@jwt_required()
def edit_profile():
    try:
        current_user_id = get_jwt_identity()
        user = db.session.query(User).get(int(current_user_id))

        if not user:
            logger.warning('User not found for ID: %s', current_user_id)
            return jsonify({'success': False, 'error': 'User not found'}), 404

        data = request.json

        # Fields that can be updated
        updatable_fields = {
            'username': str,
            'quote': str,
            'bio': str,
            'hidden_fields': list,
            'spoonacular_api_key': str,
            'date_format': str,
            'password': str
        }

        # Update fields if they exist in request
        for field, field_type in updatable_fields.items():
            if field in data:
                try:
                    value = field_type(data[field])
                    if field == 'password':
                        if value:
                            value = generate_password_hash(value).decode('utf8')
                            if not password_check(value):
                                return jsonify({
                                    'success': False,
                                    'error': 'Password does not meet requirements.'
                                }), 400
                        else:
                            continue
                    elif field == 'spoonacular_api_key':
                        if value:
                            encryption_key = Fernet(current_app.config['ENCRYPTION_KEY'].encode())
                            value = encryption_key.encrypt(value.encode()).decode()
                    elif field == 'username':
                        if User.query.filter_by(username=value).first() and value != user.username:
                            return jsonify({
                                'success': False,
                                'error': 'Username already exists.'
                            }), 400
                    setattr(user, field, value)
                except (ValueError, TypeError) as e:
                    logger.error('Invalid value for %s: %s', field, str(e))
                    return jsonify({
                        'success': False,
                        'error': f'Invalid value for {field}'
                    }), 400

        db.session.commit()

        user_schema = UserSchema()

        user_data = user_schema.dump(user)
        if user_data['spoonacular_api_key']:
            encryption_key = Fernet(current_app.config['ENCRYPTION_KEY'].encode())
            user_spoonacular_api_key = user_data['spoonacular_api_key']
            user_data['spoonacular_api_key'] = encryption_key.decrypt(user_spoonacular_api_key.encode()).decode()

        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': user_data
        })

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error('Error updating profile: %s', str(e))
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@profile_blueprint.route('/connected-accounts', methods=['GET'])
@jwt_required()
def get_connected_accounts():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        connected_accounts = user.get_connected_providers()
        logger.info('Connected accounts for user %s: %s', user_id, connected_accounts)

        return jsonify({
            'success': True,
            'connected_accounts': connected_accounts
        })

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error('Error fetching connected accounts: %s', str(e))
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
