#!/usr/bin/env python3.5
# -*- coding: UTF-8 -*-

import cgitb
cgitb.enable()
import sys

# pairing python3.5 with apache2 causes encoding problems
# for some stupid reason `locale.getpreferredencoding()` is 'ANSI_X3.4-1968' when
# you call it from browser, but when you call it from console it is 'utf-8'
# this page illustrates the problem

# to fix the problem:
# https://stackoverflow.com/questions/9322410/set-encoding-in-python-3-cgi-scripts


print('Content-Type: text/html; charset=utf-8')
print()

print('<html><body><pre>' + sys.stdout.encoding + '</pre>Hello world<body></html>')
# if you are using apache, line below will cause failure until you tweak apache config
# print('<html><body><pre>' + sys.stdout.encoding + '</pre>h€lló wörld<body></html>')
