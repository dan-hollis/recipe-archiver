import logging
import random
import string
from pathlib import Path

import qrcode
from flask import Blueprint, current_app, jsonify, request, url_for
from flask_jwt_extended import (create_access_token, create_refresh_token,
                                get_jwt_identity, jwt_required)
from sqlalchemy.exc import SQLAlchemyError

from app.models import User, db

logger = logging.getLogger(__name__)

mfa_blueprint = Blueprint('mfa', __name__)


@mfa_blueprint.route('/disable', methods=['POST'])
@jwt_required()
def disable():
    data = request.get_json()
    otp = data.get('otp')

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({
            'success': False,
            'error': 'User not found'
        }), 404

    if user.is_otp_valid(otp):
        try:
            user.is_mfa_enabled = False
            db.session.commit()
            return jsonify({
                'success': True,
                'message': 'MFA disabled successfully'
            })
        except SQLAlchemyError as e:
            logger.error('Failed to disable MFA: %s', e)
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': 'Failed to disable MFA. Please try again.'
            }), 400
    else:
        return jsonify({
            'success': False,
            'error': 'Invalid OTP. Please try again.'
        }), 400


@mfa_blueprint.route('/verify', methods=['POST'])
@jwt_required()
def verify(user_id):

    request_data = request.json

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user or not user.check_mfa:
        return jsonify({
            'success': False,
            'error': 'Invalid request'
        }), 400

    if user.is_otp_valid(request_data['code']):
        try:
            if user.is_mfa_enabled:
                # Login case
                user.check_mfa = False
                db.session.commit()

                # Create tokens
                access_token = create_access_token(identity=user.id)
                refresh_token = create_refresh_token(identity=user.id)

                return jsonify({
                    'success': True,
                    'access_token': access_token,
                    'refresh_token': refresh_token,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email
                    }
                })
            else:
                # Setup case
                user.is_mfa_enabled = True
                user.check_mfa = False

                # Clean up QR code file
                images_dir = Path(current_app.root_path) / 'static' / 'img'
                (images_dir / user.mfa_qr).unlink(missing_ok=True)

                user.mfa_qr = False

                db.session.commit()

                return jsonify({
                    'success': True,
                    'message': 'MFA setup completed successfully'
                })

        except (SQLAlchemyError, OSError) as e:
            logger.error('Failed to verify MFA: %s', e)
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': 'Failed to verify MFA. Please try again.'
            }), 400
    else:
        user.check_mfa = False
        db.session.commit()
        return jsonify({
            'success': False,
            'error': 'Invalid MFA code. Please try again.'
        }), 400


@mfa_blueprint.route('/setup', methods=['GET'])
@jwt_required()
def setup():

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({
            'success': False,
            'error': 'User not found'
        }), 404

    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(user.get_authentication_setup_uri())
    qr.make(fit=True)
    qr_image = qr.make_image(fill_color='black', back_color='white')

    # Generate QR code and save it
    qr_random_name = ''.join(random.SystemRandom().choice(string.ascii_uppercase + string.digits) for _ in range(24))
    qr_file = f'{qr_random_name}_qr.png'
    static_dir = Path(current_app.root_path) / 'static' / 'img'
    qr_path = static_dir / qr_file

    with qr_path.open('wb') as f:
        qr_image.save(f)

    user.check_mfa = True
    user.mfa_qr = qr_file
    db.session.commit()

    return jsonify({
        'success': True,
        'qr_code': url_for('static', filename=f'img/{qr_file}'),
        'secret_token': user.secret_token
    })
