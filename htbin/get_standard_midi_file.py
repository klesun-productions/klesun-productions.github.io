#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import cgitb
# enable debugging

cgitb.enable()
import cgi

import json
import os
import base64

from classes.MidiFileProvider import MidiFileProvider
from pony.orm import Database, Required, Set, db_session
from datetime import datetime

print("Content-Type: text/html")
print('')

db = Database('sqlite', '/home/klesun/progas/shmidusic.lv/user_data.db')


class Listened(db.Entity):
    fileName = Required(str)
    dt = Required(datetime, default=datetime.now)
    gmailLogin = Required(str, default='anonymous')

db.generate_mapping(create_tables=True)


@db_session
def log_finished(file_name):
    hit = Listened(fileName=file_name)
    db.commit()


def execute_script():

    js = cgi.FieldStorage()['params_json_utf8_base64']
    params = json.loads(base64.b64decode(js.value).decode("utf-8"))
    
    file_name = params['file_name']
    smf = MidiFileProvider.get_standard_midi_file(file_name)
    print(json.dumps(smf))

    if 'finished_file_name' in params and params['finished_file_name']:
        # TODO: pass the user id as well... nobody prevents them to send requests manually though
        log_finished(params['finished_file_name'])

execute_script()
