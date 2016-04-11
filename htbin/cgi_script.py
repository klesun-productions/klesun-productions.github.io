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


def include_util_js():
    for path, subdirs, files in os.walk('util/'):
        if not path == 'util/flowSrc':
            for name in files:
                if name.endswith('.js'):
                    if not name.endswith('-compiled.js'):
                        print('<script src="/' + path + '/' + name + '" type="text/javascript"></script>')


def execute_script():
    print("Content-Type: text/html")
    print('')
    print('<meta charset="utf-8"/>');

    include_util_js()

    with codecs.open('./templates/main_page.html', 'r', 'utf-8') as content_file:
        main_page_html = content_file.read()
        content_file.close()

    # if hosting under Windows
    if os.name == 'nt':
        main_page_html = translit(main_page_html, 'ru', reversed=True)

    print(main_page_html)


execute_script()
