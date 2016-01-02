#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import cgitb
# enable debugging

cgitb.enable()
import cgi

import json
import os, sys
import base64

from classes.MidiFileProvider import MidiFileProvider
from pony.orm import Database, Required, Set, db_session
from datetime import datetime
from oauth2client import client, crypt

db = Database('sqlite', '/home/klesun/progas/shmidusic.lv/user_data.db')


class Listened(db.Entity):
    fileName = Required(str)
    dt = Required(datetime, default=datetime.now)
    gmailLogin = Required(str, default='anonymous')

db.generate_mapping(create_tables=True)


def print_response(response):
    print("Content-Type: text/json")  # can be either html (in case of exceptions) or json
    print('')
    print(response)


# @return dict|None
def fetch_info_from_login_token(token):
    google_api_shmidusic_project_id = '521166378127-6hmr4e9rspkj2amipftmkt4qukb1ljr4.apps.googleusercontent.com'
    try:
        userInfo = client.verify_id_token(token, google_api_shmidusic_project_id)
        return userInfo
    except crypt.AppIdentityError as exc:
        # log maybe?
        return None

@db_session
def log_finished(file_name, user_info=None):
    gmail_login = user_info['email'].split('@')[0] if user_info else 'anonymous'
    hit = Listened(fileName=file_name, gmailLogin=gmail_login)
    db.commit()


def execute_script():

    post_length = int(os.environ['CONTENT_LENGTH'])
    post_string = sys.stdin.read(post_length)
    params = json.loads(post_string)

    file_name = params['file_name']
    smf = MidiFileProvider.get_standard_midi_file(file_name)

    if 'finished_file_name' in params and params['finished_file_name']:

        user_info = (fetch_info_from_login_token(params['googleLogInIdToken'])
                 if 'googleLogInIdToken' in params else None)

        log_finished(params['finished_file_name'], user_info)

    print_response(json.dumps(smf))

execute_script()
