import pyotp

from app.extensions import db
from app.models import OAuth, User


def create(user_info, token):

    base_username = user_info.get('global_name') or user_info.get('username')
    username = base_username
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f'{base_username}{counter}'
        counter += 1

    user = User(
        username=username,
        email=user_info.get('email'),
        avatar=f"https://cdn.discordapp.com/avatars/{user_info['id']}/{user_info['avatar']}.png" if user_info.get('avatar') else 'profile_default_avatar.png',
        secret_token=pyotp.random_base32(),
        primary_login_method='discord'
    )

    user.discord_id = user_info['id']

    db.session.add(user)
    db.session.commit()

    oauth = OAuth(
        provider='discord',
        provider_user_id=str(user_info['id']),
        provider_user_login=user_info.get('username'),
        user_id=user.id,
        token=token
    )
    db.session.add(oauth)
    db.session.commit()

    return user


def delete(discord, config, oauth):

    try:
        request_url = 'https://discord.com/api/oauth2/token/revoke'
        request_headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        request_data = {
            'client_id': config['oauth']['discord']['client_id'],
            'client_secret': config['oauth']['discord']['client_secret'],
            'token': oauth.token
        }

        discord.post(request_url, data=request_data, headers=request_headers)

    except Exception as e:  # pylint: disable=broad-exception-caught
        raise e
