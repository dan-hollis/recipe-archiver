import bleach


def get_ingredients(recipe_ingredients_list):
    recipe_ingredients = []
    salt_pepper = False
    only_pepper = False
    only_salt = False
    for recipe_ingredient_item in recipe_ingredients_list:
        ingredient_amount = recipe_ingredient_item['amount']
        ingredient_unit = recipe_ingredient_item['unit']
        ingredient_name = recipe_ingredient_item['name']
        if ingredient_name.lower() in ['salt & pepper', 'salt and pepper', 'salt + pepper'] and ingredient_unit == 'serving':
            salt_pepper = True
            continue
        if ingredient_name.lower() == 'salt' and ingredient_unit == 'serving':
            only_salt = True
            continue
        if ingredient_name.lower() == 'pepper' and ingredient_unit == 'serving':
            only_pepper = True
            continue
        recipe_ingredients.append(bleach.clean(f'{ingredient_amount} {ingredient_unit} {ingredient_name}'))
    if salt_pepper:
        recipe_ingredients.append('Salt and pepper to taste')
    elif only_pepper or only_salt:
        if only_pepper:
            recipe_ingredients.append('Pepper to taste')
        if only_salt:
            recipe_ingredients.append('Salt to taste')
    return recipe_ingredients
