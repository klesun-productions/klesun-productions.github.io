#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

# this should be the only script we call from ajax
# it will contain the actionName -> method mapping

import cgitb

cgitb.enable()

import json
import signal
import os, sys

from classes.MidiFileProvider import MidiFileProvider
from contextlib import contextmanager
from oauth2client import client, crypt


def print_response(response):
    print("Content-Type: text/json")  # can be either html (in case of exceptions) or json
    print('')
    print(response)


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


def read_post() -> dict:

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

    post_length = int(os.environ['CONTENT_LENGTH']) - 1
    with time_limit(1):
        # post_length stores byte count, but stdin.read, apparently, takes the character count
        post_string = sys.stdin.buffer.read(post_length + 1).decode('utf-8')
    return json.loads(post_string)


method_dict = {
    'get_standard_midi_file': MidiFileProvider.get_standard_midi_file,
    'get_ichigos_midi_names': MidiFileProvider.get_info_list,
}


post = read_post()

method_name = post['methodName']
params = post['params']
user_info = (fetch_info_from_login_token(post['googleLogInIdToken'])
             if 'googleLogInIdToken' in post else None)

result = method_dict[method_name](params, user_info)
print_response(json.dumps(result))