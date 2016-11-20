#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

# this should be the only script we call from ajax
# it will contain the actionName -> method mapping
import cgi

import cgitb
from collections import namedtuple

import collections

cgitb.enable()

from classes.Contribution import Contribution

import json
import signal
import os, sys
import time
import http.server
import time

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


# works only under linux and only in "python -m http.server --cgi 80" - does not work in Apache
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

def get_dull_heavy_data (params):
    time.sleep(5)
    return None

Fun = namedtuple('Fun', ['closure', 'headers', 'is_secure'])
method_dict = {
    'get_ichigos_midi_names': Fun(
        closure=MidiFileProvider.get_info_list,
        headers=['Cache-Control: max-age=86400'],
        is_secure=False,
    ),
    'get_youtube_links': Fun(
        closure=Contribution.get_youtube_links,
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
    'link_youtube_links': Fun(
        closure=Contribution.link_youtube_links,
        headers=[],
        is_secure=True,
    ),
    'get_dull_heavy_data': Fun(
        closure=get_dull_heavy_data,
        headers=[],
        is_secure=False,
    ),
    'collect_liked_songs': Fun(
        closure=MidiFileProvider.collect_liked_songs,
        headers=[],
        is_secure=True,
    ),
    'save_sample_wav': Fun(
        closure=MidiFileProvider.save_sample_wav,
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

