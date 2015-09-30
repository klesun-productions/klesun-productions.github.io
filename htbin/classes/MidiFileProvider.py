
# this class (as obvious from name) provides info
# from midi file storage (maybe even data one day)

import os
from typing import Iterable
import re
import json
import os.path
from subprocess import call
import itertools


class MidiFileProvider(object):

    @staticmethod
    def get_info_list() -> Iterable[dict]:

        result = []

        pattern = re.compile('^0_([a-zA-Z0-9]{2,})_(.*)$')

        dir = '/home/klesun/Dropbox/midiCollection/'
        dirNames = ['.', 'watched', 'random_good_stuff']
        fileListList = [os.listdir(dir + dirName) for dirName in dirNames]
        fileList = [file for file in itertools.chain(*fileListList) if file.endswith('.mid')]

        for file in fileList:
            matches = pattern.findall(file)
            if len(matches):
                result.append({"fileName": matches[0][1], "score": matches[0][0], 'rawFileName': file})
            else:
                result.append({"fileName": file, "score": '', 'rawFileName': file})

        return result;

    @staticmethod
    def get_shmidusic_list() -> Iterable[dict]:

        result = []

        dir = '/home/klesun/Dropbox/yuzefa_git/a_opuses_json'
        for file in os.listdir(dir):
            if file.endswith(".mid.js"):

                with open(dir + "/" + file) as content:
                    content_json = json.load(content)

                result.append({"fileName": file, "sheetMusic": content_json})

        return result

    @staticmethod
    def get_standard_midi_file(file_name) -> dict:

        result = {}

        #'cd /home/klesun/progas/shmidusic/out'
        #'java org.shmidusic.stuff.scripts.MidiToReadableMidi'
        #''

        with open('/home/klesun/Dropbox/midiCollection_smf/' + file_name + '.js') as content:
            content_json = json.load(content)

        return content_json
