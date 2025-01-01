import json

from celery import Celery
from redis import Redis

from app.config import load_config
from app.extensions import db
from app.models import Message, Notification

config = load_config()

redis_url = f'redis://{config["redis"]["username"]}:{config["redis"]["password"]}@{config["redis"]["host"]}:{config["redis"]["port"]}/{config["redis"]["celery_db"]}'

celery = Celery('chat', broker=redis_url)
redis_client = Redis(
    host=config['redis']['host'],
    port=int(config['redis']['port']),
    username=config['redis']['username'],
    password=config['redis']['password'],
    db=config['redis']['message_db']
)


@celery.task
def process_message(message_data):
    """Process message in background"""
    # Store in database
    message = Message(**message_data)
    db.session.add(message)

    # Create notification
    notification = Notification(
        name='unread_message',
        sender_id=message_data['sender_id'],
        recipient_id=message_data['recipient_id'],
        timestamp=message_data['timestamp']
    )
    db.session.add(notification)
    db.session.commit()

    return message.id


def handle_websocket_cluster(event_type, data):
    """Handle WebSocket events across multiple servers"""
    message = {
        'type': event_type,
        'data': data
    }
    redis_client.publish('chat_events', json.dumps(message))
