import sqlite3

import hell_wrapper

food_names = [
    'Огурец обыкновенный',
    'Крапива',
    'Шампиньон',
]

db_path = '/home/klesun/big/deleteMe/wikipedia_dump/ruwiki.db'

db = sqlite3.connect(db_path)
db_cursor = db.cursor()

question_marks = ','.join(['?'] * len(food_names))
sql = 'SELECT wiki_id, wiki_title, wiki_text, aticle_type FROM page WHERE wiki_title IN (' + question_marks + ')'
for id, title, text, subject_type in db.execute(sql, food_names):
    wrap = hell_wrapper.Wrap(text)
    print(title, wrap.get_text_food_weight())