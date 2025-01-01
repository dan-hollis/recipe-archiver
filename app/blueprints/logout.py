import logging

from flask import Blueprint, jsonify
from flask_jwt_extended import unset_jwt_cookies

logout_blueprint = Blueprint('logout', __name__)

logger = logging.getLogger(__name__)


@logout_blueprint.route('/logout', methods=['POST'])
def logout():
    response = jsonify({'message': 'Logged out successfully'})
    unset_jwt_cookies(response)
    return response, 200
