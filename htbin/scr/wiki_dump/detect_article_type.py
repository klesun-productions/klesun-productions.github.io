
import sqlite3
import hell_wrapper

db_path = '/home/klesun/big/deleteMe/wikipedia_dump/ruwiki.db'

db = sqlite3.connect(db_path)
db_cursor = db.cursor()

chunk_size = 100
for i in range(0, 100000):
    sql = '\n'.join([
        'SELECT wiki_id, wiki_title, wiki_text, aticle_type FROM page',
        'WHERE ',
        '  aticle_type = "" AND',
        '  food_weight IS NULL',
        'ORDER BY rowid ASC LIMIT ?, ?'
    ])
    # sql = 'SELECT wiki_id, wiki_title, wiki_text, aticle_type FROM page WHERE wiki_title = "Огурец обыкновенный" ORDER BY rowid ASC LIMIT ?, ?'
    rows = list(db_cursor.execute(sql, (i * chunk_size, chunk_size)))
    for id, title, text, subject_type in rows:
        print(id, title)
        parsed = hell_wrapper.Wrap(text)
        weight = parsed.get_text_food_weight()
        definition_nouns = parsed.get_definition_nouns()

        subject_type = subject_type or parsed.subject_type
        print(subject_type, definition_nouns)
        print(parsed.meta_names)
        print(sum(weight.values()), weight)
        print(parsed.first_sentence)
        print()

        sql = 'UPDATE page SET aticle_type = ?, food_weight = ?, meta_names = ?, definition_noun = ? WHERE wiki_id = ?'
        db_cursor.execute(sql, (
            subject_type,
            sum(weight.values()),
            ','.join([n.strip() for n in parsed.meta_names]),
            ','.join(definition_nouns),
            id
        ))

    db.commit()
