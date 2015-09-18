
# this class (as obvious from name) provides info
# from midi file storage (maybe even data one day)

import os
from typing import Iterable
import re
import json
import os.path
from subprocess import call


class MidiFileProvider(object):

    @staticmethod
    def get_info_list() -> Iterable[dict]:

        result = []

        pattern = re.compile('^0_([a-zA-Z0-9]{2,})_(.*)$')

        for file in os.listdir('/home/klesun/Dropbox/midiCollection/'):
            matches = pattern.findall(file)
            if len(matches):
                result.append({"fileName": matches[0][1], "score": matches[0][0], 'rawFileName': file})
            # result.append({"fileName": file}) if not pattern.match(file) else {"fileName": file, "score": "guzno"}

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

        with open('/home/klesun/Dropbox/midiCollection_smf/' + file_name + '.js') as content:
            content_json = json.load(content)

        return content_json