
from xml.etree.ElementTree import iterparse
from xml.etree.ElementTree import Element
import json
import sys
import sqlite3

# takes wikipedia articles in xml dump and stores them in a database

read_bytes = []

wiki_dump_path = 'ruwiki-20161201-pages-articles-multistream.xml'
db = sqlite3.connect('ruwiki.db')
db_cursor = db.cursor()

def xml_to_dict(el: Element):
    result = {'attrs': {}, 'text': el.text, 'kids': {}}
    for attr, val in el.items():
        result['attrs'][attr] = val

    for kid in el:
        if type(kid) != str:
            if kid.tag not in result['kids']:
                result['kids'][kid.tag] = []
            result['kids'][kid.tag].append(xml_to_dict(kid));
    
    return result

def process_page(pageXml: Element):
    page = xml_to_dict(pageXml)
    ns = '{http://www.mediawiki.org/xml/export-0.10/}'
    id = page['kids'][ns + 'id'][0]['text']
    title = page['kids'][ns + 'title'][0]['text']
    wikitext = page['kids'][ns + 'revision'][0]['kids'][ns + 'text'][0]['text']
    db_cursor.execute('insert or ignore into page (wiki_id, wiki_title, wiki_text) values (?, ?, ?)', (id, title, wikitext))


i = 0
level = 0
for event, elem in iterparse(wiki_dump_path, events=('start', 'end')):
    level += 1 if event == 'start' else -1
    if level == 1 and event == 'end' and elem.tag.endswith('page'):
        if i % 1000 == 0:
            print('commit: ' + str(i))
            db.commit()
        process_page(elem)
        i += 1
        if i > 10000000:
            break
        elem.clear()

db.commit()
