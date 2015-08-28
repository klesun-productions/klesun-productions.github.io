#!/usr/bin/env python
# -*- coding: UTF-8 -*-

import os

# enable debugging
import cgitb
cgitb.enable()

print("Content-Type: text/html")
print('')

with open('./templates/main_page.html') as content_file:
	main_page_html = content_file.read()

print(main_page_html)
