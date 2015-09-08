#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import cgitb
# enable debugging

cgitb.enable()

import json
import os

from classes.MidiFileProvider import MidiFileProvider

def pass_server_data_to_js():

    shmidusic_list = MidiFileProvider.get_shmidusic_list()

    print('''
    <script>
        var Globals = {
			shmidusicList: ''' + json.dumps(shmidusic_list) + '''
        };
    </script>
    ''');
    pass


def execute_script():
    print("Content-Type: text/html")
    print('')
    print('<meta charset="utf-8"/>');

    pass_server_data_to_js()

    with open('./templates/main_page.html') as content_file:
        main_page_html = content_file.read()

    print(main_page_html)


execute_script()
