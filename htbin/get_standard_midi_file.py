#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import cgitb
# enable debugging

cgitb.enable()
import cgi

import json
import os

from classes.MidiFileProvider import MidiFileProvider

print("Content-Type: text/html")
print('')


def execute_script():

    file_name = cgi.FieldStorage()['file_name'].value
    smf = MidiFileProvider.get_standard_midi_file(file_name)
    print(json.dumps(smf))

execute_script()
