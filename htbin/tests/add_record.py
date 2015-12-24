#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# trying adding a record to sqlite table
# following the tutorial: http://zetcode.com/db/sqlitepythontutorial/

import sqlite3

with sqlite3.connect('../../user_data.db') as connection:

    cursor = connection.cursor()
    cursor.execute('SELECT SQLITE_VERSION()')

    data = cursor.fetchone()
    print('SQLite version', data)

    connection.close()