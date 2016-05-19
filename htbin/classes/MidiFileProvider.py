# this class (as obvious from name) provides info
# from midi file storage (maybe even data one day)

import os
import re
import json
import os.path
from subprocess import call
import subprocess
import itertools
import codecs
import classes.DbTables
from classes.DbTables import Listened
from pony.orm import db_session

dirpath = os.path.dirname(os.path.realpath(__file__))

class MidiFileProvider(object):
    content_folder = dirpath + '/../../'

    @classmethod
    def get_info_list(cls, params, user_ifno=None):

		# TODO: investigate, this function likely takes ~0.6 second every time, what i think is VERY SLOW

        result = []

        pattern = re.compile('^\.\/0_([a-zA-Z0-9]{2,})_(.*)\.mid$')

        root = cls.content_folder + '/midiCollection/'

        fileList = [os.path.relpath(curDir, root) + '/' + fileName
            for curDir, _, fileNames in os.walk(root) if not curDir.endswith('source_ichigos_com')
                for fileName in fileNames if fileName.endswith('.mid')]

        for file in fileList:
            matches = pattern.findall(file)
            if len(matches):
                result.append({"fileName": matches[0][1], "score": matches[0][0], 'rawFileName': file})
            else:
                result.append({"fileName": file, "score": '', 'rawFileName': file})

        result = sorted(result, key=lambda k: (k['score'] if len(k['score']) > 0 else 'zzz' + k['fileName']))

        return result

    @classmethod
    def get_shmidusic_list(cls):

        result = []

        dir = cls.content_folder + '/Dropbox/yuzefa_git/a_opuses_json'
        for file in os.listdir(dir):
            if file.endswith(".mid.js"):
                with codecs.open(dir + "/" + file, 'r', 'utf-8') as content:
                    content_json = json.load(content, encoding='utf-8')
                    content.close()

                result.append({"fileName": file, "sheetMusic": content_json})

        return result
