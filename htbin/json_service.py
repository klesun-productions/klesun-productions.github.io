#!/usr/bin/env python3.5
# -*- coding: UTF-8 -*-

# this should be the only script i call from ajax
# it will contain the actionName -> method mapping

import cgitb
cgitb.enable()
import sys
import select
import io
import shutil

from classes.Contribution import Contribution


import collections
from collections import namedtuple

import misc
import json
import os

import time

from classes.MidiFileProvider import MidiFileProvider
#from classes.TransLinker import TransLinker
from oauth2client import client, crypt


def print_response(response, headers: list):

    payload = json.dumps(response)

    print("Content-Type: text/json")
    for header in headers:
        print(header)

    print('')
    print(payload)

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
    runs_through_cgi = True
    if runs_through_cgi:
        if 'CONTENT_LENGTH' in os.environ:
            # http.server
            if not os.environ['CONTENT_LENGTH']:
                post_string = ''
            else:
                # hangs if you run script through http.server and don't check 'CONTENT_LENGTH'
                post_length = int(os.environ['CONTENT_LENGTH'])
                # post_length stores byte count, but stdin.read, apparently, takes the character count
                post_string = sys.stdin.buffer.read(post_length).decode('utf-8')
        else:
            # apache
            post_string = sys.stdin.read()

    else:
        # apache does not make script hang unlike cgi
        post_string = sys.stdin.read()

    return json.loads(post_string) if post_string else {}

def is_correct_password(entered_password: str) -> bool:
    local_config_path = 'unv/local.config.json'
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
    'get_user_profiles': Fun(
        closure=misc.get_user_profiles,
        headers=['Cache-Control: max-age=86400'],
        is_secure=False,
    ),
}

insecure_method_dict = {
    'get_assorted_food_articles': misc.get_assorted_food_articles,
    'get_recipe_book': misc.get_recipe_book,
    'submit_starve_game_score': Contribution.submit_starve_game_score,
    'get_starve_game_high_scores': Contribution.get_starve_game_high_scores,
    'get_food_article_opinions': misc.get_food_article_opinions,
    'get_wiki_article_redirects': misc.get_wiki_article_redirects,
    'get_animes': misc.get_animes,
    'get_true_anime_list': misc.get_true_anime_list,
    'get_mal_logins': misc.get_mal_logins,
    'get_last_fetched_user_id': misc.get_last_fetched_user_id,
    'get_anime_lists_to_fetch': misc.get_anime_lists_to_fetch,
    'get_profiles_to_fetch': misc.get_profiles_to_fetch,
    'get_undated_scores': misc.get_undated_scores,
    'get_my_song_links': MidiFileProvider.get_my_song_links,
    'get_url': misc.get_url,
}

secure_method_dict = {
    'collect_liked_songs': MidiFileProvider.collect_liked_songs,
    'save_sample_wav': MidiFileProvider.save_sample_wav,
    'set_food_article_opinion': misc.set_food_article_opinion,
    'add_song_rating': Contribution.add_song_rating,
    'add_animes': misc.add_animes,
    'add_recent_users': misc.add_recent_users,
    'add_user_animes': misc.add_user_animes,
    'add_mal_db_rows': misc.add_mal_db_rows,
    'undo_song_rating': Contribution.undo_song_rating,
    'link_youtube_links': Contribution.link_youtube_links,
    'get_dull_heavy_data': get_dull_heavy_data,

    # use this if you have an urge to pass some data through
    # XHR to be stored to reuse it after page reload
    'store_random_page_data': misc.store_random_page_data,
}

for name,function in secure_method_dict.items():
    method_dict[name] = Fun(
        closure=function,
        headers=[],
        is_secure=True,
    )

for name,function in insecure_method_dict.items():
    method_dict[name] = Fun(
        closure=function,
        headers=[],
        is_secure=False,
    )


def main():
    get_params = {k: v for k, v in [pair.split('=') for pair in os.environ['QUERY_STRING'].split('&')]}
    method = get_params.pop('f')

    if method in method_dict:
        func, headers, is_secure = method_dict[method]
        # post_params = read_post() if is_secure else {}
        post_params = read_post()
        if is_secure and not is_correct_password(post_params['verySecurePassword']):
            print_response((None, 'wrongPassword'), [])
        else:
            func_params = post_params['params'] if 'params' in post_params else {}
            # a hack implying that GET params and func_params are same thing
            # because i'm too lazy to refactor all functions right now
            func_params.update(get_params)

            result = func(func_params)
            print_response(result, headers)
    else:
        print("Content-Type: text")
        print('')
        print('Bad Request - Undefined Function - GET["f"] = "' + method + '"')

main()
