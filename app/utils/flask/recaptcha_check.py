import requests


def recaptcha_check(recaptcha_response, recaptcha_private_key):
    recaptcha_data = {
        'secret': recaptcha_private_key,
        'response': recaptcha_response
    }
    recaptcha_request = requests.post('https://www.google.com/recaptcha/api/siteverify', data=recaptcha_data, timeout=60)
    recaptcha_result = recaptcha_request.json()
    return recaptcha_result['success']
