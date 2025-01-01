import math

import bleach


def get_nutrients(recipe_nutrients):
    calories = 0
    nutrients = []
    for recipe_nutrient in recipe_nutrients:
        if recipe_nutrient['name'] == 'Calories':
            calories = math.ceil(recipe_nutrient['amount'])
            continue
        nutrient_info = {
            'name': bleach.clean(recipe_nutrient['name']),
            'unit': bleach.clean(str(recipe_nutrient['unit'].encode('utf-8').decode('utf-8'))),
            'percent': bleach.clean(format(recipe_nutrient['percentOfDailyNeeds'], '.2f')),
            'amount': bleach.clean(format(recipe_nutrient['amount'], '.2f'))
        }
        nutrients.append(nutrient_info)
    return calories, nutrients
