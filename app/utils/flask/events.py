from dataclasses import dataclass, field
from datetime import datetime, timezone
from functools import wraps
from typing import List

import bleach
from dateutil.relativedelta import relativedelta
from flask import request
from flask_jwt_extended import decode_token, get_jwt_identity
from flask_jwt_extended.exceptions import JWTDecodeError, NoAuthorizationError
from flask_socketio import disconnect, emit, join_room
from redis import Redis
from sqlalchemy import and_, func, or_

from app.config import load_config
from app.extensions import db
from app.models import Message, MessageReaction, Notification, User
from app.utils.flask.message_queue import (handle_websocket_cluster,
                                           process_message)

config = load_config()

redis_client = Redis(
    host=config['redis']['host'],
    port=int(config['redis']['port']),
    username=config['redis']['username'],
    password=config['redis']['password'],
    db=config['redis']['message_db']
)


@dataclass
class ChatMessage:
    sender_id: int
    recipient_id: int
    body: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class MessageStatus:
    message_id: int
    read: bool
    delivered: bool
    reactions: List[str]


def authenticated_only(f):
    """
    Wrapper function that restricts websockets to users with valid JWT tokens
    """
    @wraps(f)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            disconnect()
            return

        try:
            token = auth_header.split(' ')[1]
            # Decode and verify the token
            decoded_token = decode_token(token)

            # Check if token is expired
            exp_timestamp = decoded_token['exp']
            current_timestamp = datetime.now(timezone.utc).timestamp()
            if current_timestamp > exp_timestamp:
                disconnect()
                return

        except (JWTDecodeError, NoAuthorizationError, IndexError):
            disconnect()
            return

        return f(*args, **kwargs)
    return wrapped


def rate_limit(key_prefix, limit=5, period=60):
    """
    Rate limiting decorator for WebSocket events
    :param key_prefix: Prefix for the Redis key
    :param limit: Number of allowed requests in the period
    :param period: Time period in seconds
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            user_id = get_jwt_identity()
            key = f"{key_prefix}:{user_id}"

            # Check rate limit
            current = redis_client.get(key)
            if current and int(current) >= limit:
                emit('error', {'message': 'Rate limit exceeded'}, room=request.sid)
                return

            # Increment counter
            pipe = redis_client.pipeline()
            pipe.incr(key)
            pipe.expire(key, period)
            pipe.execute()

            return f(*args, **kwargs)
        return wrapped
    return decorator


def join_user_room(user_id: int) -> None:
    """Add user to their personal room for direct messages"""
    room = f"user_{user_id}"
    join_room(room)


def get_timestamp_diff(message_timestamp):
    current_timestamp = datetime.now()
    timestamp_diff = relativedelta(current_timestamp, message_timestamp)
    days_diff = timestamp_diff.days
    hours_diff = timestamp_diff.hours
    minutes_diff = timestamp_diff.minutes
    if not minutes_diff and not hours_diff and not days_diff:
        message_timestamp_diff = 'Just now'
    elif minutes_diff and not hours_diff:
        message_timestamp_diff = '1 minute ago' if minutes_diff == 1 else f'{minutes_diff} minutes ago'
    elif hours_diff and not days_diff:
        message_timestamp_diff = '1 hour ago' if hours_diff == 1 else f'{hours_diff} hours ago'
    else:
        message_timestamp_diff = '1 day ago' if days_diff == 1 else f'{days_diff} days ago'
    return message_timestamp_diff


def get_sidebar_data(user, recipient_user_id=False):
    sidebar_data = {'data': {}, 'current_chat_id': 0, 'recipient_user_found': False}
    user_received_messages = db.session.query(Message).filter(Message.recipient_id == user.id)
    user_sent_messages = db.session.query(Message).filter(Message.sender_id == user.id)
    user_messages = user_received_messages.union(user_sent_messages).order_by(Message.timestamp.asc()).all()
    for user_message in user_messages:
        if user_message.sender_id == user.id:
            user_message_sender = db.session.query(User).filter(User.id == user_message.recipient_id).first()
        else:
            user_message_sender = db.session.query(User).filter(User.id == user_message.sender_id).first()
        if recipient_user_id and recipient_user_id == user_message_sender.id:
            sidebar_data['recipient_user_found'] = True
        message_timestamp = user_message.timestamp
        message_timestamp_diff = get_timestamp_diff(message_timestamp)
        message_preview = user_message.body if len(user_message.body) <= 20 else f'{user_message.body[:20]}...'
        try:
            sidebar_data['data'][user_message_sender.username]['latest_timestamp'] = message_timestamp_diff
            sidebar_data['data'][user_message_sender.username]['message_preview'] = message_preview
        except KeyError:
            sidebar_data['data'][user_message_sender.username] = {
                'latest_timestamp': message_timestamp_diff,
                'message_preview': message_preview,
                'avatar': user_message_sender.avatar,
                'user_id': user_message_sender.id
            }
    for key, value in sidebar_data['data'].items():
        notification_count = db.session.execute(
            db.session.query(Notification)
            .filter_by(sender_id=value['user_id'])
            .filter_by(recipient_id=user.id)
            .statement
            .with_only_columns(func.count())  # pylint: disable=not-callable
            .order_by(None)).scalar()
        sidebar_data['data'][key]['notif_count'] = notification_count
    if recipient_user_id and not sidebar_data['recipient_user_found']:
        recipient_user = db.session.query(User).filter(User.id == recipient_user_id).first()
        sidebar_data['data'][recipient_user.username] = {
            'latest_timestamp': '',
            'message_preview': '',
            'avatar': recipient_user.avatar,
            'user_id': recipient_user.id
        }
    return sidebar_data


@authenticated_only
@rate_limit('message_send', limit=10, period=60)  # 10 messages per minute
def message_input(event_json):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    message_content = event_json['data']['message']
    recipient_user_id = current_user.current_chat_id

    if not recipient_user_id:
        return

    # Create message data
    message_data = {
        'sender_id': current_user.id,
        'recipient_id': recipient_user_id,
        'body': bleach.clean(message_content),
        'timestamp': datetime.now(timezone.utc)
    }

    # Queue message processing
    process_message.delay(message_data)

    # Get recipient for WebSocket handling
    recipient_user = User.query.get(recipient_user_id)

    # Emit to current user
    message_data = get_messages(recipient_user)
    emit('load_messages', message_data, to=current_user.websocket_id)

    # Update sidebar for current user
    sidebar_data = get_sidebar_data(current_user)
    sidebar_data['current_chat_id'] = current_user.current_chat_id
    emit('update_sidebar', sidebar_data, to=current_user.websocket_id)

    # Handle recipient notifications
    if recipient_user.websocket_id and recipient_user.current_chat_id == current_user.id:
        # Recipient has chat open - send message directly
        message_data['trigger_messages_loaded'] = True
        message_data['chat_recipient'] = {
            'username': current_user.username,
            'id': current_user.id
        }
        emit('load_messages', message_data, to=recipient_user.websocket_id)

    # Update recipient's sidebar
    sidebar_data = get_sidebar_data(recipient_user)
    sidebar_data['current_chat_id'] = recipient_user.current_chat_id
    emit('update_sidebar', sidebar_data, to=recipient_user.websocket_id)

    # Notify other servers about the new message
    handle_websocket_cluster('new_message', message_data)


@authenticated_only
@rate_limit('message_reaction', limit=20, period=60)  # 20 reactions per minute
def handle_reaction(data):
    message_id = data['message_id']
    reaction = data['reaction']

    message = Message.query.get(message_id)
    if message:
        new_reaction = MessageReaction(
            message_id=message_id,
            user_id=get_jwt_identity(),
            reaction=reaction
        )
        db.session.add(new_reaction)
        db.session.commit()

        emit('message_reaction', {
            'message_id': message_id,
            'reaction': reaction,
            'user_id': get_jwt_identity()
        }, broadcast=True)


@authenticated_only
@rate_limit('typing_indicator', limit=30, period=60)  # 30 typing updates per minute
def handle_typing(data):
    current_user_id = get_jwt_identity()
    recipient_id = data['recipient_id']
    is_typing = data['is_typing']

    recipient_room = f"user_{recipient_id}"
    emit('user_typing', {
        'user_id': current_user_id,
        'is_typing': is_typing
    }, room=recipient_room)


@authenticated_only
@rate_limit('message_status', limit=50, period=60)  # 50 status updates per minute
def handle_message_status(data):
    message_id = data['message_id']
    status_type = data['type']  # 'read' or 'delivered'

    message = Message.query.get(message_id)
    if message:
        if status_type == 'read':
            message.read_at = datetime.now(timezone.utc)
        elif status_type == 'delivered':
            message.delivered_at = datetime.now(timezone.utc)
        db.session.commit()

        # Notify sender
        emit('message_status_update', {
            'message_id': message_id,
            'status': status_type
        }, room=f"user_{message.sender_id}")


@authenticated_only
def get_messages(recipient_user, page=1, per_page=50):
    current_user_id = get_jwt_identity()

    messages = Message.query.filter(
        or_(
            and_(Message.sender_id == current_user_id,
                 Message.recipient_id == recipient_user.id),
            and_(Message.sender_id == recipient_user.id,
                 Message.recipient_id == current_user_id)
        )
    ).order_by(Message.timestamp.desc())\
     .paginate(page=page, per_page=per_page, error_out=False)

    return {
        'messages': [message.to_dict() for message in messages.items],
        'has_next': messages.has_next,
        'next_page': messages.next_num if messages.has_next else None
    }


@authenticated_only
def chat_user_connected(event_json):
    if event_json['data']['recipient']:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        recipient_user_id = int(event_json['data']['recipient'])
        recipient_user = db.session.query(User).filter(User.id == recipient_user_id).first()
        message_data = get_messages(recipient_user)
        current_user.current_chat_id = recipient_user.id
        db.session.commit()
        message_data['trigger_messages_loaded'] = True
        message_data['chat_recipient'] = {'username': recipient_user.username, 'id': recipient_user.id}
        emit('load_messages', message_data, to=current_user.websocket_id)
        sidebar_data = get_sidebar_data(current_user, recipient_user_id=recipient_user.id)
    else:
        sidebar_data = get_sidebar_data(current_user)
    sidebar_data['current_chat_id'] = current_user.current_chat_id
    emit('update_sidebar', sidebar_data, to=current_user.websocket_id)


@authenticated_only
def messages_loaded(event_json):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)

    try:
        db.session.query(Notification).filter(
            Notification.sender_id == current_user.current_chat_id,
            Notification.recipient_id == current_user_id
        ).delete()
        db.session.commit()
    except ValueError:
        pass
    sidebar_data = get_sidebar_data(current_user, recipient_user_id=event_json['data']['recipient'])
    sidebar_data['current_chat_id'] = current_user.current_chat_id
    emit('update_sidebar', sidebar_data, to=current_user.websocket_id)
    notification_count = db.session.execute(
        db.session.query(Notification)
        .filter_by(recipient_id=current_user.id)
        .statement
        .with_only_columns(func.count())  # pylint: disable=not-callable
        .order_by(None)).scalar()
    emit('push_notification', {'notification_count': notification_count}, to=current_user.websocket_id)


@authenticated_only
def update_message_counter():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    notification_count = db.session.execute(
        db.session.query(Notification)
        .filter_by(recipient_id=current_user.id)
        .statement
        .with_only_columns(func.count())  # pylint: disable=not-callable
        .order_by(None)).scalar()
    emit('push_notification', {'notification_count': notification_count}, to=current_user.websocket_id)


@authenticated_only
def refresh_sidebar():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    sidebar_data = get_sidebar_data(current_user)
    sidebar_data['current_chat_id'] = current_user.current_chat_id
    emit('update_sidebar', sidebar_data, to=current_user.websocket_id)


@authenticated_only
def theme_update(message_json):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    new_theme = message_json['data']['new_theme']
    if new_theme in ['auto', 'dark', 'light']:
        current_user.theme = new_theme
        db.session.commit()


@authenticated_only
def connected():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    current_user.websocket_id = request.sid
    current_user.last_seen = datetime.now(timezone.utc)
    join_user_room(current_user_id)
    db.session.commit()

    # Emit user online status to relevant users
    emit('user_status', {
        'user_id': current_user_id,
        'status': 'online'
    }, broadcast=True)


@authenticated_only
def disconnected():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    current_user.websocket_id = None
    current_user.current_chat_id = 0
    db.session.commit()


@authenticated_only
def handle_chat_user_connected(data):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    recipient_id = data['data']['recipient']
    current_user.current_chat_id = recipient_id
    db.session.commit()

    # Load existing messages
    messages = get_messages(User.query.get(recipient_id))
    emit('load_messages', messages, to=current_user.websocket_id)


@authenticated_only
def handle_message_input(data):
    message_data = {
        'sender_id': get_jwt_identity(),
        'recipient_id': data['recipient_id'],
        'body': data['message'],
        'timestamp': datetime.now(timezone.utc)
    }

    # Queue message processing
    process_message.delay(message_data)

    # Notify other servers
    handle_websocket_cluster('new_message', message_data)


def init_events(socketio):
    socketio.on_event('connect', connected)
    socketio.on_event('disconnect', disconnected)
    socketio.on_event('chat_user_connected', chat_user_connected)
    socketio.on_event('handle_chat_user_connected', handle_chat_user_connected)
    socketio.on_event('handle_message_input', handle_message_input)
    socketio.on_event('message_input', message_input)
    socketio.on_event('messages_loaded', messages_loaded)
    socketio.on_event('update_message_counter', update_message_counter)
    socketio.on_event('refresh_sidebar', refresh_sidebar)
    socketio.on_event('handle_typing', handle_typing)
    socketio.on_event('message_status', handle_message_status)
    socketio.on_event('message_reaction', handle_reaction)
    socketio.on_event('load_more_messages', get_messages)
    socketio.on_event('theme_update', theme_update)
