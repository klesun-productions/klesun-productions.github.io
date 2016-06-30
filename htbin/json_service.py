#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

# this should be the only script we call from ajax
# it will contain the actionName -> method mapping
import cgi

import cgitb
from collections import namedtuple

cgitb.enable()

from classes.Contribution import Contribution

import json
import signal
import os, sys
import time
import http.server

from classes.MidiFileProvider import MidiFileProvider
#from classes.TransLinker import TransLinker
from contextlib import contextmanager
from oauth2client import client, crypt


def print_response(response, headers: list):
    print("Content-Type: text/json")  # can be either html (in case of exceptions) or json
    for header in headers:
        print(header)

    print('')
    print(json.dumps(response))


class TimeoutException(Exception):
    pass

# @return dict|None
def fetch_info_from_login_token(token):
    google_api_shmidusic_project_id = '521166378127-6hmr4e9rspkj2amipftmkt4qukb1ljr4.apps.googleusercontent.com'
    try:
        user_info = client.verify_id_token(token, google_api_shmidusic_project_id)
        return user_info
    except crypt.AppIdentityError as exc:
        # log maybe?
        return None


# works only under linux
def read_post() -> dict:

    if not os.environ['CONTENT_LENGTH']:
        return {}
    post_length = int(os.environ['CONTENT_LENGTH']) - 1

    @contextmanager
    def time_limit(seconds):
        def signal_handler(signum, frame):
            raise TimeoutException("Timed out! " + os.environ['CONTENT_LENGTH'])

        signal.signal(signal.SIGALRM, signal_handler)
        signal.alarm(seconds)
        try:
            yield
        finally:
            signal.alarm(0)

    with time_limit(1):
        # post_length stores byte count, but stdin.read, apparently, takes the character count
        post_string = sys.stdin.buffer.read(post_length + 1).decode('utf-8')
    return json.loads(post_string)

def is_correct_password(entered_password: str) -> bool:
    local_config_path = 'unversioned/local.config.json'
    with open(os.path.dirname(__file__) + '/../' + local_config_path) as f:
        config = json.load(f)

    return entered_password == config['verySecurePassword']

Fun = namedtuple('Fun', ['closure', 'headers', 'is_secure'])
method_dict = {
    'get_ichigos_midi_names': Fun(
        closure=MidiFileProvider.get_info_list,
        headers=['Cache-Control: max-age=86400'],
        is_secure=False,
    ),
    'add_song_rating': Fun(
        closure=Contribution.add_song_rating,
        headers=[],
        is_secure=True,
    ),
    'undo_song_rating': Fun(
        closure=Contribution.undo_song_rating,
        headers=[],
        is_secure=True,
    ),
}

get_params = {k: v for k,v in [pair.split('=') for pair in os.environ['QUERY_STRING'].split('&')]}
method = get_params['f']

if method in method_dict:
    func, headers, is_secure = method_dict[method]
    post_params = read_post()
    if is_secure and not is_correct_password(post_params['verySecurePassword']):
        print_response((None, 'wrongPassword'), [])
    else:
        func_params = post_params['params'] if 'params' in post_params else {}
        result, error = func(func_params), None
        print_response((result, error), headers)
else:
    print("Content-Type: text")
    print('')
    print('Bad Request - Undefined Function - GET["f"] = "' + method + '"')

