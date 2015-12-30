#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import cgitb
# enable debugging

cgitb.enable()

import json
import os
import sys
import codecs

# if hosting under Windows
if os.name == 'nt':
    from transliterate import translit

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


def include_util_js():

    for path, subdirs, files in os.walk('util/'):
        for name in files:
            print('<script src="/' + path + '/' + name + '" type="text/javascript"></script>')
            #print('<script>console.log("zhopa", "' + path + '", "' + name + '");</script>')


def execute_script():
    print("Content-Type: text/html")
    print('')
    print('<meta charset="utf-8"/>');

    pass_server_data_to_js()

    include_util_js()

    with codecs.open('./templates/main_page.html', 'r', 'utf-8') as content_file:
        main_page_html = content_file.read()
        content_file.close()

    # if hosting under Windows
    if os.name == 'nt':
        main_page_html = translit(main_page_html, 'ru', reversed=True)

    print(main_page_html)


execute_script()
