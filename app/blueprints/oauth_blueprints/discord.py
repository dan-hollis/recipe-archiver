from flask_dance.consumer.storage.sqla import SQLAlchemyStorage
from flask_dance.contrib.discord import make_discord_blueprint

from app.config import load_config
from app.extensions import cache, db
from app.models import OAuth

config = load_config()

discord_blueprint = make_discord_blueprint(
    client_id=config['oauth']['discord']['client_id'],
    client_secret=config['oauth']['discord']['client_secret'],
    scope=config['oauth']['discord']['scope'],
    redirect_url=config['flask']['oauth_redirect_url'],
    storage=SQLAlchemyStorage(
        OAuth,
        db.session,
        cache=cache
    )
)
