import logging

from flask import Blueprint, request
from sqlalchemy import func

from app.extensions import db
from app.models import Recipe, User

logger = logging.getLogger(__name__)

users_blueprint = Blueprint('users', __name__)


@users_blueprint.route('/table', methods=['GET'])
def users_table():
    try:
        query = db.session.query(
            User,
            func.count(Recipe.id).label('recipe_count')  # pylint: disable=not-callable
        ).outerjoin(Recipe, User.recipes).group_by(User.id)

        # Handle search
        search = request.args.get('search')
        if search:
            query = query.filter(User.username.ilike(f'%{search}%'))

        # Get total before pagination
        total_records = db.session.query(User).count()

        # Handle sorting
        sort = request.args.get('sort')
        if sort:
            order = []
            for s in sort.split(','):
                direction = s[0]
                field = s[1:] if direction in ['+', '-'] else s

                # Special handling for recipe_count sorting
                if field == 'recipe_count':
                    col = func.count(Recipe.id).label('recipe_count')  # pylint: disable=not-callable
                else:
                    col = getattr(User, field)

                if direction == '-':
                    col = col.desc()
                order.append(col)
            if order:
                query = query.order_by(*order)

        # Handle pagination
        page = request.args.get('page', type=int, default=1)
        limit = request.args.get('limit', type=int, default=10)
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        # Format table data
        table_data = []
        for user, recipe_count in query:
            table_data.append({
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'recipe_count': recipe_count,
                'joined_date': user.joined_date.isoformat(),
            })

        return {
            'success': True,
            'status': 'success',
            'data': table_data,
            'total': total_records
        }, 200

    except Exception as e:  # pylint: disable=broad-except
        logger.error('Error in users table: %s', str(e), exc_info=True)
        return {
            'success': False,
            'status': 'error',
            'message': 'An error occurred while fetching users data'
        }, 500
