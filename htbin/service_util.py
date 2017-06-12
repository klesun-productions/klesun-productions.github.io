import cgitb
cgitb.enable()
import json
import os
import sys
import collections
import urllib
import urllib.parse

# this namespace provides common functions
# of both chunked and simple services


def read_get() -> dict:
    return {
        k: v for k, v in [
            pair.split('=') for pair in
            os.environ['QUERY_STRING'].split('&')
            if pair != ''
        ]
    }


def read_post() -> dict:
    post_text = sys.stdin.read()
    if post_text != "":
        return json.loads(post_text, object_pairs_hook=collections.OrderedDict)
    else:
        return {}


def is_correct_password(entered_password: str) -> bool:
    local_config_path = 'unversioned/local.config.json'
    with open(os.path.dirname(__file__) + '/../' + local_config_path) as f:
        config = json.load(f)

    return entered_password == config['verySecurePassword']

Fun = collections.namedtuple('Fun', ['closure', 'headers', 'is_secure'])


def print_response(response: str, headers: list):
    payload = json.dumps(response)
    for header in headers:
        print(header)

    print('')
    print(payload)


def handle_request(method_dict: dict):
    get_query = os.environ['QUERY_STRING']
    get_params = {k: v
        for k, v in [pair.split('=')
        for pair in get_query.split('&')]
    } if get_query else {}

    method = get_params.pop('f')

    if method in method_dict:
        func, headers = method_dict[method]
        post_params = read_post()

        func_params = post_params['params'] if 'params' in post_params else {}
        func_params.update({k:urllib.parse.unquote(v) for k,v in get_params.items()})

        resp = func(func_params)
        print_response(resp, headers)
    else:
        print("Content-Type: text")
        print('')
        print('Bad Request - Undefined Function - GET["f"] = "' + method + '"')
