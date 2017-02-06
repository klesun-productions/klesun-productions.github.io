import json
import os
import sys
import collections

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