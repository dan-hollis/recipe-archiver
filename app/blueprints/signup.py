import logging

import pyotp
import requests
from flask import Blueprint, current_app, jsonify, request
from flask_bcrypt import generate_password_hash

from app.models import User, db
from app.utils.flask.password_check import password_check

logger = logging.getLogger(__name__)

signup_blueprint = Blueprint('signup', __name__)


@signup_blueprint.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        recaptcha_response = data.get('recaptcha')

        # Verify reCAPTCHA
        verify_url = 'https://www.google.com/recaptcha/api/siteverify'
        verify_data = {
            'secret': current_app.config['RECAPTCHA_PRIVATE_KEY'],
            'response': recaptcha_response
        }
        verify_response = requests.post(verify_url, data=verify_data, timeout=60).json()

        if not verify_response['success'] or verify_response.get('score', 0) < 0.5:
            return jsonify({
                'success': False,
                'error': 'Invalid reCAPTCHA. Please try again.'
            }), 400

        # Extract data from request
        email = data.get('email')
        username = data.get('username')
        name = data.get('name')
        password = data.get('password')

        # Validate password
        if not password_check(password):
            return jsonify({
                'success': False,
                'error': 'Password does not meet requirements.'
            }), 400

        # Check if email exists
        if User.query.filter_by(email=email).first():
            return jsonify({
                'success': False,
                'error': 'Email address already exists.'
            }), 400

        # Check if username exists
        if User.query.filter_by(username=username).first():
            return jsonify({
                'success': False,
                'error': 'Username already exists.'
            }), 400

        # Create new user
        new_user = User(
            email=email,
            username=username,
            password=generate_password_hash(password).decode('utf8'),
            name=name,
            hidden_fields=['name', 'email'],
            role='user',
            theme='dark',
            secret_token=pyotp.random_base32()
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Account created successfully.'
        })

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error('Signup error: %s', str(e))
        return jsonify({
            'success': False,
            'error': 'Failed to create account.'
        }), 500
