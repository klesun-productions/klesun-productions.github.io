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

print("Content-Type: text/html")
print('')


def execute_script():

    js = cgi.FieldStorage()['params_json_utf8_base64']
    params = json.loads(base64.b64decode(js.value).decode("utf-8"))
    
    file_name = params['file_name']
    smf = MidiFileProvider.get_standard_midi_file(file_name)
    print(json.dumps(smf))

execute_script()
