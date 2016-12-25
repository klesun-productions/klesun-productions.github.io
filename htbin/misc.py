
# move contents of this file along appropriate names eventualle
import json
import os
import sqlite3

import re
from collections import defaultdict

import pymorphy2

page_data_dir = os.path.dirname(__file__) + '/../out/random_page_data'
# this is single-time-use functionality, so that's okay
wiki_dump_db_path = '/home/klesun/big/deleteMe/wikipedia_dump/ruwiki.db'
recipe_book_path = '/home/klesun/big/p/shmidusic.lv/unversioned/misc/kniga_o_vkusnoj_i_zdorovoj_pische.txt'


def store_random_page_data(params: dict):
    file_name = params['file_name']
    page_data = params['page_data']
    path = page_data_dir + '/' + file_name + '.json'

    if os.path.dirname(path) != page_data_dir:
        raise ValueError('file_name can not contain slashes: '
             + '<br/>' + os.path.dirname(path)
             + '<br/>' + page_data_dir)

    with open(path, 'a') as outfile:
        json.dump(page_data, outfile, indent=2, ensure_ascii=False)
        outfile.write(',\n')

    return 'stored OK'


def get_assorted_food_articles(params: dict) -> list:
    db = sqlite3.connect(wiki_dump_db_path)
    db.row_factory = lambda c,row: {col[0]: row[i] for i,col in enumerate(c.description)}
    db_cursor = db.cursor()
    exec = lambda article_type: db_cursor.execute('\n'.join([
        'SELECT p.*',
        'FROM page p',
        'LEFT JOIN article_opinion ao ON p.wiki_id = ao.wiki_id',
        'WHERE',
        '  p.aticle_type IS NULL' if article_type is None else '  p.aticle_type = ?',
        '  AND ao.rowid IS NULL',
        'ORDER BY p.food_weight DESC LIMIT 1000',
    ]), () if article_type is None else (article_type,))

    return sorted([]
        # stupid OR performance in SQL queries
        + list(exec('taxon'))
        + list(exec(None))
    , key=lambda r: r['food_weight'], reverse=True)


def set_food_article_opinion(params: dict) -> list:
    db = sqlite3.connect(wiki_dump_db_path)
    db_cursor = db.cursor()
    sql = '\n'.join([
        'INSERT OR REPLACE INTO article_opinion',
        '(' + ','.join(params.keys()) + ') VALUES',
        '(' + ','.join([':' + k for k in params.keys()]) + ')',
    ])
    db_cursor.execute(sql, params)
    db.commit()

    return 'stored OK'


def get_recipe_book(params: dict) -> list:
    with open(recipe_book_path) as f:
        text = f.read()

    morph = pymorphy2.MorphAnalyzer()
    occurByWord = defaultdict(int)
    for match in re.finditer(r'([А-Яа-я\-]+)', text, flags=re.DOTALL):
        nouns = set()
        for parse in morph.parse(match.group(1)):
            if parse.tag.POS == 'NOUN':
                nouns.add(parse.normal_form)
        for noun in nouns:
            occurByWord[noun] += 1

    return occurByWord

