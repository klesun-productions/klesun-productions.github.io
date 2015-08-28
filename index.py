#!/usr/bin/env python
# -*- coding: UTF-8 -*-

# enable debugging
import cgitb
cgitb.enable()

with open('templates/main_page.html') as content_file:
	main_page_html = content_file

print main_page_html
