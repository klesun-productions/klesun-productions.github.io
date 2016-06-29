# this class (as obvious from name) provides info
# from midi file storage (maybe even data one day)

import os
import re
import os.path
from pony.orm import select, db_session
from classes.DbTables import SongRating

dirpath = os.path.dirname(os.path.realpath(__file__))


def make_order_value(rating: str) -> str:
    return rating.replace('1', 'a').replace('0', 'c').ljust(31, 'b')


class MidiFileProvider(object):
    content_folder = dirpath + '/../../'

    @classmethod
    @db_session
    def get_info_list(cls):

        # TODO: investigate, this function likely takes ~0.6 second every time, what i think is VERY SLOW

        result = []

        pattern = re.compile('^\.\/0_([a-zA-Z0-9]{2,})_(.*)\.mid$')

        root = cls.content_folder + '/midiCollection/'

        fileList = [os.path.relpath(curDir, root) + '/' + fileName
            for curDir, _, fileNames in os.walk(root) if not curDir.endswith('source_ichigos_com')
                for fileName in fileNames if fileName.endswith('.mid')]

        rating_by_name = {r.fileName: r.rating for r in select(r for r in SongRating)}

        for file in fileList:
            result.append({
                "fileName": file,
                "rawFileName": file,
                "rating": rating_by_name[file] if file in rating_by_name else ''
            })

        result = sorted(result, key=lambda k: (make_order_value(k['rating']) + k['fileName']))

        return result
