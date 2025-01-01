# isort: skip_file
# fmt: off
# pylint: disable=wrong-import-position

from gevent import monkey
monkey.patch_all()

from app import create_app
from app.extensions import db, migrate
from app.config import load_config

config = load_config()
app, socketio = create_app(config)
migrate.init_app(app, db)

if __name__ == '__main__':
    socketio.run(app)
