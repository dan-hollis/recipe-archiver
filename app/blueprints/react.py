from pathlib import Path

from flask import Blueprint, current_app, send_from_directory

react_blueprint = Blueprint('react', __name__)


@react_blueprint.route('/', defaults={'path': ''})
@react_blueprint.route('/<path:path>')
def serve(path):
    if path.startswith('api/'):
        return {'error': 'Not Found'}, 404

    static_dir = Path(current_app.static_folder) / 'react'

    if path != '' and (static_dir / path).exists():
        return send_from_directory(static_dir, path)
    return send_from_directory(static_dir, 'index.html')
