import requests

from modules.exceptions import (SpoonacularQuotaError,
                                SpoonacularRateLimitError,
                                SpoonacularUnauthorizedError)


def get_recipe_data(recipe_url, spoonacular_api_key):
    recipe_request_headers = {
        'x-api-key': spoonacular_api_key,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:10.0) Gecko/20100101 Firefox/10.0'
    }
    recipe_request_params = {
        'url': recipe_url,
        'includeNutrition': True,
        'forceExtraction': False,
        'analyze': False,
        'includeTaste': False
    }
    recipe_request = requests.get(
        'https://api.spoonacular.com/recipes/extract',
        headers=recipe_request_headers,
        params=recipe_request_params,
        timeout=60
    )

    recipe_data = recipe_request.json()
    try:
        if recipe_data['code'] == 401:
            raise SpoonacularUnauthorizedError
        elif recipe_data['code'] == 402:
            raise SpoonacularQuotaError
        elif recipe_data['code'] == 429:
            raise SpoonacularRateLimitError
    except KeyError:
        pass
    return recipe_data
