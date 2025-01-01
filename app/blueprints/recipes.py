import json
import logging
import random
import string
from pathlib import Path
from typing import Dict, List

import bleach
from cryptography.fernet import Fernet
from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import func

from app.extensions import db
from app.models import Recipe, Tag, User, UserRecipeProgress
from app.utils.exceptions import (SpoonacularQuotaError,
                                  SpoonacularRateLimitError,
                                  SpoonacularUnauthorizedError)
from app.utils.recipe import (check_url, get_ingredients,
                              get_instructions_equipment, get_nutrients,
                              get_prep_cook_time, get_recipe_data)

logger = logging.getLogger(__name__)

recipes_blueprint = Blueprint('recipes', __name__)


def generate_random_filename(length: int = 24) -> str:
    """Generate a random filename using uppercase letters and digits."""
    return ''.join(random.SystemRandom().choices(string.ascii_uppercase + string.digits, k=length))


def process_tags(tags: List[str], new_tags_str: str) -> List[str]:
    """Process and combine existing and new tags."""
    new_tags = [
        bleach.clean(tag.strip().replace(' ', '.').lower())
        for tag in new_tags_str.split(',')
        if tag.strip()
    ]
    return list(set(tags + new_tags))


def calculate_calories(calories: float, servings: float, per_serving: bool = True) -> tuple[int, int]:
    """Calculate total and per-serving calories."""
    if per_serving:
        total = int(round(calories * servings))
        per_serving = int(calories)
    else:
        total = int(calories)
        per_serving = int(round(calories / servings))
    return total, per_serving


def create_recipe_data(data: Dict, recipe_url: str) -> tuple[Dict, str]:
    """
    Create standardized recipe data dictionary.

    Args:
        data: Raw recipe data dictionary
        recipe_url: URL of the recipe or 'self' for manual recipes

    Returns:
        tuple: (recipe_data, recipe_nutrients)
    """
    if recipe_url != 'self':
        calories, nutrients = get_nutrients(data['nutrition']['nutrients'])
        instructions, equipment = get_instructions_equipment(data['analyzedInstructions'])

        return {
            'name': data['title'],
            'source': data['sourceName'],
            'servings': data['servings'],
            'prep_time': get_prep_cook_time(data['preparationMinutes']),
            'cook_time': get_prep_cook_time(data['cookingMinutes']),
            'calories': calories,
            'calories_unit': 'serving',
            'ingredients': get_ingredients(data['extendedIngredients']),
            'instructions': instructions,
            'equipment': equipment,
        }, nutrients

    prep_minutes = (int(data.get('prep_time_hours', 0)) * 60 +
                    int(data.get('prep_time_minutes', 0)))
    cook_minutes = (int(data.get('cook_time_hours', 0)) * 60 +
                    int(data.get('cook_time_minutes', 0)))

    return {
        'name': data.get('name', ''),
        'source': 'self',
        'servings': data.get('servings', 0),
        'prep_time': get_prep_cook_time(prep_minutes),
        'cook_time': get_prep_cook_time(cook_minutes),
        'calories': data.get('calories', 0),
        'calories_unit': data.get('calories_unit', 'serving'),
        'ingredients': get_ingredients(data.get('ingredients', [])),
        'instructions': data.get('instructions', []),
        'equipment': data.get('equipment', []),
    }, ''


@recipes_blueprint.route('/add', methods=['POST'])
@jwt_required()
def add():
    try:
        data = request.json

        recipe_url = data.get('url', '')

        user_id = get_jwt_identity()

        user = db.session.query(User).get(int(user_id))

        # Process tags
        tags = process_tags(
            data.get('tags', []),
            data.get('new_tags', '')
        )

        # Handle URL-based recipe
        if recipe_url:
            url_status = check_url(recipe_url)
            if not url_status['status']:
                return jsonify({
                    'success': False,
                    'message': url_status['reason']
                }), 400

            # Check for existing recipe
            normalized_url = recipe_url.replace('http://', '').replace('https://', '')
            recipe_query = db.session.query(Recipe).filter(
                Recipe.url.icontains(normalized_url)
            ).first()

            if recipe_query and not data.get('overwrite_recipe'):
                return jsonify({
                    'success': False,
                    'message': f'Recipe with url {recipe_url} already exists in database',
                    'recipe_id': recipe_query.id
                }), 409

            if recipe_query:
                Path(recipe_query.backup_file).unlink(missing_ok=True)
                db.session.delete(recipe_query)
                db.session.commit()

            try:
                if not user.spoonacular_api_key:
                    raise SpoonacularUnauthorizedError
                else:
                    encryption_key = Fernet(current_app.config['ENCRYPTION_KEY'].encode())
                    spoonacular_api_key = encryption_key.decrypt(user.spoonacular_api_key.encode()).decode()
                recipe_data = get_recipe_data(recipe_url, spoonacular_api_key)
            except SpoonacularUnauthorizedError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid Spoonacular API Key'
                }), 401
            except (SpoonacularQuotaError, SpoonacularRateLimitError) as e:
                return jsonify({
                    'success': False,
                    'message': str(e)
                }), 429

        # Create recipe data
        recipe_data, recipe_nutrients = create_recipe_data(
            recipe_data if recipe_url else data,
            recipe_url
        )

        # Calculate calories
        calories_total, calories_serving = calculate_calories(
            float(recipe_data['calories']),
            float(recipe_data['servings']),
            recipe_data['calories_unit'] == 'serving'
        )

        # Setup backup file
        recipes_dir = Path(current_app.config['RA_DATA_DIR']) / 'recipes'
        recipes_dir.mkdir(parents=True, exist_ok=True)
        recipe_backup_file = recipes_dir / f'{generate_random_filename()}.json'

        # Create new recipe data
        new_recipe_data = {
            'url': bleach.clean(str(recipe_url or 'self')),
            'backup_file': str(recipe_backup_file),
            'calories_total': str(calories_total),
            'calories_serving': str(calories_serving),
            'nutrients': recipe_nutrients,
            'tags': [Tag(bleach.clean(str(tag))) for tag in tags],
            'users': [user],
        }

        # Handle special fields separately, then add remaining fields
        for k, v in recipe_data.items():
            if k in ['ingredients', 'instructions', 'equipment']:
                new_recipe_data[k] = v
            else:
                new_recipe_data[k] = bleach.clean(str(v))

        # Handle existing recipe with same name
        if recipe_url == 'self':
            recipe_query = db.session.query(Recipe).filter(
                func.lower(Recipe.name) == recipe_data['name'].lower()
            ).first()

            if recipe_query:
                if not data.get('overwrite_recipe'):
                    return jsonify({
                        'success': False,
                        'message': f'Recipe with name {recipe_data["name"]} already exists',
                        'recipe_id': recipe_query.id
                    }), 409

                Path(recipe_query.backup_file).unlink(missing_ok=True)
                db.session.delete(recipe_query)
                db.session.commit()

        # Save recipe
        new_recipe = Recipe(new_recipe_data)
        db.session.add(new_recipe)
        db.session.commit()

        # Backup recipe data
        backup_data = recipe_data if recipe_url else {
            **new_recipe_data,
            'tags': [t.id for t in new_recipe_data['tags']],
            'users': [user.id]
        }
        recipe_backup_file.write_text(json.dumps(backup_data), encoding='utf-8')

        return jsonify({
            'success': True,
            'message': f'Added recipe for {bleach.clean(recipe_data["name"])}',
            'recipe_id': new_recipe.id
        })

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error('Error adding recipe: %s', str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'An error occurred while adding the recipe'
        }), 500


@recipes_blueprint.route('/table', methods=['GET'])
def table():
    query = db.session.query(Recipe)

    # Handle search
    search = request.args.get('search')
    if search:
        query = query.filter(Recipe.name.ilike(f'%{search}%'))

    total_records = query.count()

    # Handle sorting
    sort = request.args.get('sort')
    if sort:
        order = []
        for s in sort.split(','):
            direction = s[0]
            col = getattr(Recipe, 'name')
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
    for recipe in query:
        recipe_link = f'/recipes/{recipe.id}'
        table_data.append({
            'id': recipe.id,
            'name': f'{recipe.name} ({recipe.source})',
            'link': recipe_link,
            'source_url': recipe_link if recipe.url == 'self' else bleach.clean(recipe.url),
        })

    return {'status': 'success', 'data': table_data, 'total': total_records}, 200


@recipes_blueprint.route('/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    try:
        logger.info('Getting recipe with id: %s', recipe_id)
        recipe = db.session.query(Recipe).get(recipe_id)
        if not recipe:
            return jsonify({
                'success': False,
                'message': 'Recipe not found'
            }), 404

        return jsonify({
            'success': True,
            'recipe': {
                'id': recipe.id,
                'url': recipe.url,
                'name': recipe.name,
                'source': recipe.source,
                'servings': recipe.servings,
                'prep_time': recipe.prep_time,
                'cook_time': recipe.cook_time,
                'calories_total': recipe.calories_total,
                'calories_serving': recipe.calories_serving,
                'nutrients': recipe.nutrients,
                'ingredients': recipe.ingredients,
                'instructions': recipe.instructions,
                'equipment': recipe.equipment,
                'tags': [tag.name for tag in recipe.tags]
            }
        })

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error('Error getting recipe: %s', str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'An error occurred while getting the recipe'
        }), 500


@recipes_blueprint.route('/user/recipe-progress', methods=['POST'])
@jwt_required()
def update_recipe_progress():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        recipe_id = data.get('recipe_id')
        checked_ingredients = data.get('checked_ingredients')

        user = User.query.get(user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        # Store the progress in the user's profile
        # You might want to add a new model/table for this
        user_progress = UserRecipeProgress.query.filter_by(
            user_id=user_id,
            recipe_id=recipe_id
        ).first()

        if not user_progress:
            user_progress = UserRecipeProgress(
                user_id=user_id,
                recipe_id=recipe_id,
                checked_ingredients=checked_ingredients
            )
            db.session.add(user_progress)
        else:
            user_progress.checked_ingredients = checked_ingredients

        db.session.commit()

        return jsonify({'success': True})

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error('Error updating recipe progress: %s', str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating recipe progress'
        }), 500


@recipes_blueprint.route('/<int:recipe_id>', methods=['DELETE'])
@jwt_required()
def delete_recipe(recipe_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        recipe = Recipe.query.get(recipe_id)

        if not recipe:
            return jsonify({
                'success': False,
                'message': 'Recipe not found'
            }), 404

        # Check if user is authorized to delete the recipe
        if not (user.is_admin() or recipe in user.recipes):
            return jsonify({
                'success': False,
                'message': 'Unauthorized to delete this recipe'
            }), 403

        # Delete the backup file if it exists
        if recipe.backup_file:
            Path(recipe.backup_file).unlink(missing_ok=True)

        db.session.delete(recipe)
        db.session.commit()

        logger.info('Recipe %s deleted by user %s', recipe_id, user_id)
        return jsonify({
            'success': True,
            'message': 'Recipe deleted successfully'
        })

    except Exception as e:  # pylint: disable=broad-exception-caught
        logger.error('Error deleting recipe: %s', str(e), exc_info=True)
        return jsonify({
            'success': False,
            'message': 'An error occurred while deleting the recipe'
        }), 500
