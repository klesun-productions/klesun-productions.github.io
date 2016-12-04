
# move contents of this file along appropriate names eventualle
import json
import os

page_data_dir = os.path.dirname(__file__) + '/../out/random_page_data'


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
