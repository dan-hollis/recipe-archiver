import logging.config
import urllib
from datetime import timedelta
from pathlib import Path

from flask import Flask
from flask_bcrypt import Bcrypt
from flask_bootstrap import Bootstrap5
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_mailman import Mail
from flask_session import Session
from flask_socketio import SocketIO
from flask_talisman import Talisman
from redis import Redis

from app.blueprints.errors import errors_blueprint
from app.blueprints.login import login_blueprint
from app.blueprints.logout import logout_blueprint
from app.blueprints.mfa import mfa_blueprint
from app.blueprints.oauth import oauth_blueprint
from app.blueprints.oauth_blueprints.discord import discord_blueprint
from app.blueprints.profile import profile_blueprint
from app.blueprints.react import react_blueprint
from app.blueprints.recipes import recipes_blueprint
from app.blueprints.signup import signup_blueprint
from app.blueprints.users import users_blueprint
from app.extensions import cache, db
from app.utils.flask.events import init_events


def create_app(config, debug=False):

    data_dir = Path(__file__).parent.parent / 'data'
    for subdir in ['logs', 'qr', 'recipes']:
        (data_dir / subdir).mkdir(parents=True, exist_ok=True)

    logging_config = config['logging']
    logging_config['handlers']['file']['filename'] = Path(__file__).parent.parent / 'logs' / 'flask.log'
    logging.config.dictConfig(logging_config)
    logger = logging.getLogger(__name__)

    template_folder = Path(__file__).parent.parent / 'app' / 'templates'
    static_folder = Path(__file__).parent.parent / 'app' / 'static'
    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)

    redis_url = f'redis://{config["redis"]["username"]}:{config["redis"]["password"]}@{config["redis"]["host"]}:{config["redis"]["port"]}'

    app.config['SECRET_KEY'] = config['flask']['secret_key']
    app.config['ENCRYPTION_KEY'] = config['flask']['encryption_key']

    app.config['SECURITY_PASSWORD_SALT'] = config['flask']['security_password_salt']
    app.config['BCRYPT_HANDLE_LONG_PASSWORDS'] = True

    app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://{config["postgres"]["username"]}:{urllib.parse.quote(config["postgres"]["password"])}@{config["postgres"]["host"]}:{config["postgres"]["port"]}/{config["postgres"]["database"]}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    app.config['MAIL_SERVER'] = config['mailman']['server']
    app.config['MAIL_PORT'] = int(config['mailman']['port'])
    app.config['MAIL_USE_TLS'] = config['mailman']['use_tls']
    app.config['MAIL_USERNAME'] = config['mailman']['username']
    app.config['MAIL_PASSWORD'] = config['mailman']['password']
    app.config['MAIL_TIMEOUT'] = int(config['mailman']['timeout'])

    app.config['CACHE_TYPE'] = 'RedisCache'
    app.config['CACHE_REDIS_URL'] = f'{redis_url}/{config["redis"]["cache_db"]}'

    app.config['SESSION_TYPE'] = 'redis'
    app.config['SESSION_REDIS'] = Redis(
        host=config['redis']['host'],
        port=int(config['redis']['port']),
        username=config['redis']['username'],
        password=config['redis']['password'],
        db=config['redis']['session_db']
    )
    app.config['SESSION_USE_SIGNER'] = True
    app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'None'

    app.config['JWT_SECRET_KEY'] = config['flask']['jwt_secret_key']
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    app.config['JWT_REMEMBER_ME_EXPIRES'] = timedelta(days=90)
    app.config['JWT_IDENTITY_CLAIM'] = 'sub'
    app.config['JWT_ERROR_MESSAGE_KEY'] = 'error'

    # Project configs in Flask
    app.config['RA_DATA_DIR'] = data_dir
    app.config['CONFIG'] = config
    app.config['APP_NAME'] = config['flask']['app_name']
    app.config['RECAPTCHA_PRIVATE_KEY'] = config['recaptcha']['private_key']
    app.config['RECAPTCHA_PUBLIC_KEY'] = config['recaptcha']['public_key']
    app.config['ADMIN_ROLES'] = config['flask']['admin_roles']
    app.config['RESET_PASS_TOKEN_MAX_AGE'] = int(config['flask']['reset_pass_token_max_age'])

    app.message_redis_client = Redis(
        host=config['redis']['host'],
        port=int(config['redis']['port']),
        username=config['redis']['username'],
        password=config['redis']['password'],
        db=config['redis']['message_db']
    )
    app.redis_url = redis_url

    db.init_app(app)

    cache.init_app(app)

    cors = CORS()
    cors.init_app(
        app,
        supports_credentials=True,
        origins=[
            *[f'https://{s}' for s in config['flask']['dev_servers']],
            *[f'https://{s}' for s in config['flask']['prod_servers']]
        ]
    )

    talisman = Talisman()
    talisman.init_app(
        app,
        content_security_policy={
            'default-src': [
                "'self'",
                'https://www.google.com',
                'https://www.gstatic.com/',
                # 'https://cdnjs.cloudflare.com',
                # 'https://cdn.jsdelivr.net',
                *[f'https://{s}' for s in config['flask']['dev_servers']],
                *[f'https://{s}' for s in config['flask']['prod_servers']]
            ],
            'style-src': [
                "'self'",
                "'unsafe-inline'"
            ],
            'connect-src': [
                "'self'",
                *[f'https://{s}' for s in config['flask']['dev_servers']],
                *[f'https://{s}' for s in config['flask']['prod_servers']],
                *[f'wss://{s}' for s in config['flask']['dev_sockets']],
                *[f'wss://{s}' for s in config['flask']['prod_servers']]
            ]
        },
        session_cookie_samesite=app.config['SESSION_COOKIE_SAMESITE'],
        content_security_policy_nonce_in=['script-src'],
        force_file_save=True,
        force_https_permanent=True
    )

    bcrypt = Bcrypt()
    bcrypt.init_app(app)

    bootstrap = Bootstrap5()
    bootstrap.init_app(app)

    mail = Mail()
    mail.init_app(app)

    sess = Session()
    sess.init_app(app)

    jwt = JWTManager()
    jwt.init_app(app)

    socketio = SocketIO()
    socketio.init_app(
        app,
        message_queue=f'{redis_url}/{config["redis"]["socket_db"]}',
        async_mode='threading' if debug else 'gevent_uwsgi',
        manage_session=False,
        logger=logger,
        engineio_logger=logger
    )

    app.register_blueprint(errors_blueprint)
    app.register_blueprint(login_blueprint, url_prefix='/api')
    app.register_blueprint(logout_blueprint, url_prefix='/api')
    app.register_blueprint(mfa_blueprint, url_prefix='/api/mfa')
    app.register_blueprint(profile_blueprint, url_prefix='/api/profile')
    app.register_blueprint(recipes_blueprint, url_prefix='/api/recipes')
    app.register_blueprint(users_blueprint, url_prefix='/api/users')
    app.register_blueprint(signup_blueprint, url_prefix='/api')

    app.register_blueprint(discord_blueprint, url_prefix='/oauth')

    app.register_blueprint(oauth_blueprint, url_prefix='/api/oauth')

    app.register_blueprint(react_blueprint)

    init_events(socketio)

    return app, socketio
