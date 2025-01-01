import logging
from datetime import datetime, timezone

import pyotp
from flask import current_app
from flask_dance.consumer.storage.sqla import OAuthConsumerMixin
from flask_login import UserMixin
from marshmallow_sqlalchemy import SQLAlchemyAutoSchema
from sqlalchemy import BigInteger
from sqlalchemy.dialects.postgresql import ARRAY, JSON
from sqlalchemy.orm import attribute_mapped_collection

from app.config import load_config
from app.extensions import db

logger = logging.getLogger(__name__)

config = load_config()

recipe_tag = db.Table(
    'recipe_tag',
    db.Column('recipe_id', db.Integer, db.ForeignKey('recipe.id')),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'))
)

user_recipe = db.Table(
    'user_recipe',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('recipe_id', db.Integer, db.ForeignKey('recipe.id'))
)


class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String())
    name = db.Column(db.String())
    source = db.Column(db.String())
    backup_file = db.Column(db.String())
    servings = db.Column(db.Integer())
    prep_time = db.Column(db.String())
    cook_time = db.Column(db.String())
    calories = db.Column(db.Integer())
    calories_total = db.Column(db.Integer())
    calories_serving = db.Column(db.Integer())
    calories_unit = db.Column(db.String())
    nutrients = db.Column(ARRAY(JSON))
    ingredients = db.Column(ARRAY(db.String()))
    instructions = db.Column(JSON)
    equipment = db.Column(ARRAY(db.String()))
    tags = db.relationship('Tag', secondary=recipe_tag, backref='recipes')
    users = db.relationship('User', secondary=user_recipe, backref='recipes')
    progress = db.relationship(
        'UserRecipeProgress',
        cascade='all, delete-orphan',
        backref='recipe'
    )

    def __init__(self, new_recipe_data):
        self.url = new_recipe_data['url']
        self.name = new_recipe_data['name']
        self.source = new_recipe_data['source']
        self.backup_file = new_recipe_data['backup_file']
        self.servings = new_recipe_data['servings']
        self.prep_time = new_recipe_data['prep_time']
        self.cook_time = new_recipe_data['cook_time']
        self.calories = new_recipe_data['calories']
        self.calories_total = new_recipe_data['calories_total']
        self.calories_serving = new_recipe_data['calories_serving']
        self.calories_unit = new_recipe_data['calories_unit']
        self.nutrients = new_recipe_data['nutrients']
        self.ingredients = new_recipe_data['ingredients']
        self.instructions = new_recipe_data['instructions']
        self.equipment = new_recipe_data['equipment']
        self.tags = new_recipe_data['tags']
        self.users = new_recipe_data['users']

    def __repr__(self):
        return str(self.id)


class User(UserMixin, db.Model):

    id = db.Column(db.Integer, primary_key=True)
    discord_id = db.Column(BigInteger)
    email = db.Column(db.String(100), unique=True, nullable=True)
    password = db.Column(db.String(128), nullable=True)
    name = db.Column(db.String(1000), nullable=True)
    username = db.Column(db.String(36), unique=True, nullable=False)
    hidden_fields = db.Column(ARRAY(db.String()), default=[])
    joined_date = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    date_format = db.Column(db.String(), default='MM-DD-YYYY', nullable=False)
    bio = db.Column(db.String(1000), nullable=True)
    quote = db.Column(db.String(200), nullable=True)
    role = db.Column(db.String(), default='user', nullable=False)
    theme = db.Column(db.String(), default='dark', nullable=False)
    profile_picture = db.Column(db.String(28), default='profile_default.png', nullable=False)
    avatar = db.Column(db.String(100), default='profile_default_avatar.png', nullable=False)
    mfa_qr = db.Column(db.String(31), default=False, nullable=False)
    spoonacular_api_key = db.Column(db.String(), nullable=True)
    is_mfa_enabled = db.Column(db.Boolean, default=False, nullable=False)
    check_mfa = db.Column(db.Boolean, default=False, nullable=False)
    secret_token = db.Column(db.String, unique=True, nullable=False)
    websocket_id = db.Column(db.String, unique=True, index=True)
    current_chat_id = db.Column(db.Integer, default=0, index=True)
    primary_login_method = db.Column(db.String(), nullable=False, default='password')

    def is_admin(self):
        return self.role in config['flask']['admin_roles']

    def get_authentication_setup_uri(self):
        return pyotp.totp.TOTP(self.secret_token).provisioning_uri(name=self.username, issuer_name=current_app.config['APP_NAME'])

    def is_otp_valid(self, user_otp):
        totp = pyotp.parse_uri(self.get_authentication_setup_uri())
        return totp.verify(user_otp)

    def has_alternate_login_methods(self, exclude_provider=None):
        """Check if user has alternative login methods besides the specified provider"""
        auth_methods = []

        # Check password
        if self.password:
            auth_methods.append('password')

        # Check OAuth connections
        oauth_providers = [
            provider for provider in self.oauth.keys()
            if provider != exclude_provider
        ]
        auth_methods.extend(oauth_providers)

        return len(auth_methods) >= 1

    def get_connected_providers(self):
        """Get all connected OAuth providers for the user"""
        logger.info("OAuth relationships for user %s: %s", self.id, self.oauth)

        providers = {
            provider: {
                'username': oauth.provider_user_login,
                'connected_at': oauth.created_at
            }
            for provider, oauth in self.oauth.items()
        }
        logger.info("Formatted providers: %s", providers)
        return providers

    def __repr__(self):
        return str(self.id)


class UserRecipeProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipe_id = db.Column(
        db.Integer,
        db.ForeignKey('recipe.id', ondelete='CASCADE'),
        nullable=False
    )
    checked_ingredients = db.Column(JSON)
    last_updated = db.Column(db.DateTime, default=datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint('user_id', 'recipe_id', name='unique_user_recipe_progress'),
    )


class OAuth(OAuthConsumerMixin, db.Model):
    __tablename__ = 'flask_dance_oauth'
    __table_args__ = (db.UniqueConstraint('provider', 'provider_user_id'),)
    provider_user_id = db.Column(db.String(256), nullable=False)
    provider_user_login = db.Column(db.String(256), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey(User.id), nullable=False)
    user = db.relationship(User, backref=db.backref('oauth', collection_class=attribute_mapped_collection('provider'), cascade='all, delete-orphan',))


class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String())

    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return self.name


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    body = db.Column(db.String(140))
    timestamp = db.Column(db.DateTime, index=True, nullable=False)
    sender_id = db.Column(db.Integer, index=True)
    recipient_id = db.Column(db.Integer, index=True)
    read_at = db.Column(db.DateTime, nullable=True)
    delivered_at = db.Column(db.DateTime, nullable=True)
    reactions = db.relationship('MessageReaction', backref='message', lazy='dynamic',
                                cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'body': self.body,
            'timestamp': self.timestamp.isoformat(),
            'sender_id': self.sender_id,
            'recipient_id': self.recipient_id,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None,
            'reactions': [reaction.to_dict() for reaction in self.reactions]
        }

    def __repr__(self):
        return f'<Message {self.body}>'


class MessageReaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    reaction = db.Column(db.String(32), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'message_id': self.message_id,
            'user_id': self.user_id,
            'reaction': self.reaction,
            'created_at': self.created_at.isoformat()
        }

    def __repr__(self):
        return f'<MessageReaction {self.reaction}>'


class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), index=True)
    timestamp = db.Column(db.DateTime, index=True, nullable=False)
    sender_id = db.Column(db.Integer, index=True)
    recipient_id = db.Column(db.Integer, index=True)


class UserSchema(SQLAlchemyAutoSchema):
    class Meta:
        model = User
        load_instance = True
        include_fk = True
        exclude = ('password', 'secret_token')
