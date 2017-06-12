#!/usr/bin/env python3.5
# -*- coding: UTF-8 -*-

import os
import sys

# looks like this is the only way to
# import files from parent directories
sys.path.insert(0, '../../htbin')

import service_util
from collections import namedtuple

out_dir = os.path.dirname(__file__) + '/out/'


def store_person_page(params: dict):
    login = params['login']
    page = params['page']
    file_dir = out_dir + '/person_pages'
    path = file_dir + '/' + login + '.html'

    if os.path.dirname(path) != file_dir:
        raise ValueError('file_name can not contain slashes: '
             + '<br/>' + os.path.dirname(path)
             + '<br/>' + file_dir)

    with open(path, 'w') as outfile:
        bytes_written = outfile.write(page)

    return {'success': True, 'bytes_written': bytes_written}

Fun = namedtuple('Fun', ['closure', 'headers'])
method_dict = {
    'store_person_page': Fun(
        closure=store_person_page,
        headers=['Content-Type: text/json'],
    ),
}

service_util.handle_request(method_dict)

