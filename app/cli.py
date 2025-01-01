import argparse
import logging.config
from pathlib import Path

from flask.cli import FlaskGroup

from app import create_app
from app.config import load_config
from app.extensions import db, migrate

config = load_config()
app, socketio = create_app(config, debug=True)
migrate.init_app(app, db)


def create_cli_app(_):
    return app


cli = FlaskGroup(create_app=create_cli_app)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', help='Flask host address. Default 0.0.0.0', dest='host', metavar='0.0.0.0', type=str, nargs='?', const='0.0.0.0', default='0.0.0.0')
    parser.add_argument('--port', help='Flask port. Default 5005', dest='port', metavar='5005', type=int, nargs='?', const=5005, default=5005)
    args = parser.parse_args()

    logging_config = config['logging']
    logging_config['handlers']['file']['filename'] = Path(__file__).parent.parent / 'logs' / 'flask.log'
    logging.config.dictConfig(logging_config)
    logger = logging.getLogger(__name__)

    cert_file = Path(__file__).parent.parent / 'ra.pem'
    key_file = Path(__file__).parent.parent / 'ra-key.pem'

    logger.info('Starting Flask app on %s:%s', args.host, args.port)
    socketio.run(app, debug=True, host=args.host, port=args.port, ssl_context=(cert_file, key_file))
