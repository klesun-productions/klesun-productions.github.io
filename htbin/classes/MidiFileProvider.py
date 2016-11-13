# this class (as obvious from name) provides info
# from midi file storage (maybe even data one day)

import os
import re
import os.path
from pony.orm import select, db_session
from classes.DbTables import SongRating
from shutil import copyfile

dirpath = os.path.dirname(os.path.realpath(__file__))


def make_order_value(rating: str) -> str:
    return rating.replace('+', 'a').replace('-', 'c').ljust(31, 'b')

class MidiFileProvider(object):
    content_folder = dirpath + '/../../Dropbox/web/'

    @classmethod
    @db_session
    def get_info_list(cls, params: dict) -> tuple:
        # TODO: investigate, this function likely takes ~0.6 second every time, what i think is VERY SLOW

        result = []

        root = cls.content_folder + '/midiCollection/'

        file_list = [os.path.relpath(curDir, root) + '/' + fileName
                     for curDir, _, fileNames in os.walk(root) if not curDir.endswith('source_ichigos_com')
                     for fileName in fileNames if fileName.endswith('.mid')]

        rating_by_name = {r.fileName: r.rating for r in select(r for r in SongRating)}

        for file in file_list:
            result.append({
                "fileName": file,
                "rawFileName": file,
                "rating": rating_by_name[file] if file in rating_by_name else ''
            })

        result = sorted(result, key=lambda k: (make_order_value(k['rating']) + k['fileName']))

        return result

    @classmethod
    @db_session
    def collect_liked_songs(cls, params: dict) -> tuple:
        root = cls.content_folder + '/midiCollection/'
        destination_root = '/unversioned/midiCollectionLiked/'

        file_list = [os.path.relpath(curDir, root) + '/' + fileName
                     for curDir, _, fileNames in os.walk(root) if not curDir.endswith('source_ichigos_com')
                     for fileName in fileNames if fileName.endswith('.mid')]

        rating_by_name = {r.fileName: r.rating for r in select(r for r in SongRating)}

        for file in file_list:
            if file in rating_by_name:
                rating = rating_by_name[file]
                if rating.startswith('+') and not rating.startswith('+---'):
                    dest_file = destination_root + file
                    if not os.path.exists(os.path.dirname(dest_file)):
                        os.makedirs(os.path.dirname(dest_file))
                    copyfile(root + file, dest_file)

        return 'peace and love', None