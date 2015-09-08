#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import cgitb
# enable debugging

cgitb.enable()

import json
import os

from classes.MidiFileProvider import MidiFileProvider

print("Content-Type: text/html")
print('')

def execute_script():
    midi_files = MidiFileProvider.get_info_list()
    print(json.dumps(midi_files))

execute_script()
