
# this class (as obvious from name) provides info
# from midi file storage (maybe even data one day)

import os
from typing import Iterable
import re
import json
import os.path
from subprocess import call
import subprocess
import itertools
import codecs


class MidiFileProvider(object):

    # content_folder = '/home/klesun/Dropbox/';
    content_folder = '/home/klesun/mounted_fat/progas/shmidusic.lv/';
    decode_script_path = '/home/klesun/mounted_fat/progas/shmidusic/bin/';
    decode_script_class_path = 'org.shmidusic.stuff.scripts.MidiToReadableMidi';

    @classmethod
    def get_info_list(cls) -> Iterable[dict]:

        result = []

        pattern = re.compile('^0_([a-zA-Z0-9]{2,})_(.*)$')

        dir = cls.content_folder + '/midiCollection/'
        dirNames = ['.', 'watched', 'random_good_stuff']
        fileListList = [os.listdir(dir + dirName) for dirName in dirNames]
        fileList = [file for file in itertools.chain(*fileListList) if file.endswith('.mid')]

        for file in fileList:
            matches = pattern.findall(file)
            if len(matches):
                result.append({"fileName": matches[0][1], "score": matches[0][0], 'rawFileName': file})
            else:
                result.append({"fileName": file, "score": '', 'rawFileName': file})

        result = sorted(result, key=lambda k: (k['score'] if len(k['score']) > 0 else 'zzz' + k['fileName']))

        return result;

    @classmethod
    def get_shmidusic_list(cls) -> Iterable[dict]:

        result = []

        dir = cls.content_folder + '/Dropbox/yuzefa_git/a_opuses_json'
        for file in os.listdir(dir):
            if file.endswith(".mid.js"):

                with codecs.open(dir + "/" + file, 'r', 'utf-8') as content:
                    content_json = json.load(content, encoding='utf-8')
                    content.close()

                result.append({"fileName": file, "sheetMusic": content_json})

        return result

    @classmethod
    def get_standard_midi_file(cls, file_name) -> dict:

        result = {}

        midJsPath = cls.content_folder + '/midiCollectionDecoded/' + file_name + '.js';
        
        if not os.path.isfile(midJsPath): # handling cases when a midi file was added or renamed
            current_path = os.getcwd()
            os.chdir(cls.decode_script_path)
            call(["java", cls.decode_script_class_path, file_name])
            os.chdir(current_path)
        
        #'cd /home/klesun/progas/shmidusic/out'
        #'java org.shmidusic.stuff.scripts.MidiToReadableMidi'
        #''

        with codecs.open(midJsPath, 'r', 'utf-8') as content:
            content_json = json.load(content)
            content.close()

        return content_json
