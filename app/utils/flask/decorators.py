from functools import wraps

import bcrypt
from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app.extensions import cache
from app.models import User


def require_password_confirmation(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        # If user already has password auth, just verify the current password
        if user.primary_login_method == 'password':
            password = request.json.get('password')
            if not password or not bcrypt.checkpw(
                password.encode('utf-8'),
                user.password.encode('utf-8')
            ):
                return jsonify({'error': 'Invalid password'}), 401
            return f(*args, **kwargs)

        # For OAuth-only users, require them to set up a password
        if not user.password:
            if 'password' not in request.json or not request.json['password']:
                return jsonify({
                    'error': 'You must set up a password before unlinking your OAuth account'
                }), 400

            return f(*args, **kwargs)

        return f(*args, **kwargs)
    return decorated_function


def rate_limit_oauth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()

        # Rate limiting key includes IP and user_id
        key = f'oauth_limit:{request.remote_addr}:{user_id}'
        ttl_key = f'oauth_limit_ttl:{request.remote_addr}:{user_id}'

        # Get current attempts and TTL
        attempts = cache.get(key) or 0
        remaining_time = cache.get(ttl_key)

        if attempts >= 5:  # Max 5 attempts per hour
            if not remaining_time:
                remaining_time = 3600  # Default to 1 hour if TTL is not found
                cache.set(ttl_key, remaining_time, timeout=remaining_time)

            minutes_left = remaining_time // 60
            return jsonify({
                'error': f'Too many OAuth attempts. Please try again in {minutes_left} minutes.'
            }), 429

        # Increment attempts and set TTL
        cache.set(key, attempts + 1, timeout=3600)  # 1 hour timeout
        cache.set(ttl_key, 3600, timeout=3600)  # 1 hour timeout

        return f(*args, **kwargs)
    return decorated_function
