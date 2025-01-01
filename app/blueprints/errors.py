import logging

from flask import Blueprint, jsonify

logger = logging.getLogger(__name__)

errors_blueprint = Blueprint('errors', __name__)


@errors_blueprint.app_errorhandler(404)
def not_found(_):
    return jsonify({'error': 'Not found'}), 404
