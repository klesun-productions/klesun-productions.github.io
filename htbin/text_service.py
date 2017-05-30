#!/usr/bin/env python3.5
# -*- coding: UTF-8 -*-

# this entry point should be used when response is clean text not wrapped inside json
# using this cuz i want to see nice rendered pages in chrome developer tools

import cgitb
cgitb.enable()

import json
import os
import urllib
import urllib.parse
import locale
import sys

import collections
from collections import namedtuple

import misc

def print_response(response: str, headers: list):
    for header in headers:
        print(header)

    print('')
    print(response)


def read_post() -> dict:
    post_text = sys.stdin.read()
    if post_text != "":
        return json.loads(post_text, object_pairs_hook=collections.OrderedDict)
    else:
        return {}

Fun = namedtuple('Fun', ['closure', 'headers'])
method_dict = {
    'get_url': Fun(
        closure=misc.get_url,
        headers=['Content-Type: text/html'],
    ),
}

def main():
    get_params = {k: v for k, v in [pair.split('=') for pair in os.environ['QUERY_STRING'].split('&')]}
    method = get_params.pop('f')

    if method in method_dict:
        func, headers = method_dict[method]
        post_params = read_post()

        func_params = post_params['params'] if 'params' in post_params else {}
        func_params.update({k:urllib.parse.unquote(v) for k,v in get_params.items()})

        resp = func(func_params)
        print_response(resp, headers)
    else:
        print("Content-Type: text")
        print('')
        print('Bad Request - Undefined Function - GET["f"] = "' + method + '"')

main()
