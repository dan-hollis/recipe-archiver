import requests


def check_url(recipe_url):
    article_headers = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:10.0) Gecko/20100101 Firefox/10.0'}
    try:
        article_response = requests.get(recipe_url, headers=article_headers, timeout=60)
    except requests.exceptions.ConnectionError as error:
        if 'Name or service not known' in str(error):
            return {'status': False, 'reason': [f'Error resolving {recipe_url}']}
        else:
            return {'status': False, 'reason': [f'Unknown connection error on {recipe_url}']}
    article_headers = article_response.headers
    if 'cf-mitigated' in article_headers:
        # Currently no way around cloudflare
        return {'status': False, 'reason': [f'Cloudflare protection detected on recipe URL {recipe_url}']}
    return {'status': True}
