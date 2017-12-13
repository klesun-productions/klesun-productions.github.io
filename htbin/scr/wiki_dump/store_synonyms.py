
import sqlite3
import re

# about 45.2% of wiki articles are pages consisting of single line:
# #REDIRECT [[You Main Title Here]]
# Main Title-s are usually the most descriptive, yet least
# intuitive, especially in plants/animals articles
#
# so, what this script does - runs through articles and stores redirects into a separate table

db_path = '/home/klesun/big/deleteMe/wikipedia_dump/ruwiki.db'

db = sqlite3.connect(db_path)
db_cursor = db.cursor()

chunk_size = 10000
for i in range(0, 2000):
    sql = '\n'.join([
        'SELECT wiki_id, wiki_title, wiki_text FROM page',
        'WHERE rowid >= :min_id',
        '  AND rowid < :min_id + :chunk_size',
        '  AND wiki_text LIKE "#%"',
    ])
    rows = list(db_cursor.execute(sql, (i * chunk_size, chunk_size)))
    rows_to_insert = []

    is_first = True
    for wiki_id, title, text in rows:
        if is_first:
            print(i, wiki_id, title)
            print(text)
            print()
            is_first = False

        spellings = ['REDIRECT', '[Rr]edirect', 'ПЕРЕНАПРАВ[А-Я]+', '[Пп]еренаправ[а-я]+']
        match = re.search(r'^#(' + '|'.join(spellings) + ')\s*\[\[(.+?)\]\]', text)
        if match: rows_to_insert.append({
            'wiki_id': wiki_id,
            'title': title,
            'main_title': match.group(2),
        })

    if len(rows_to_insert) > 0:
        db_cursor.executemany('\n'.join([
            'INSERT OR REPLACE INTO synonyms',
            '(wiki_id, title, main_title) VALUES (?, ?, ?)',
        ]), [(row['wiki_id'], row['title'], row['main_title']) for row in rows_to_insert])

    db.commit()