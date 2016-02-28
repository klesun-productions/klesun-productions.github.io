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


class MidiFileProvider(object):
    # content_folder = '/home/klesun/Dropbox/';
    content_folder = '/home/klesun/mounted_fat/progas/shmidusic.lv/'
    decode_script_path = '/home/klesun/mounted_fat/progas/shmidusic/bin/'
    decode_script_class_path = 'org.shmidusic.stuff.scripts.MidiToReadableMidi'

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

    @classmethod
    def get_standard_midi_file(cls, params, user_info=None):

        @db_session
        def log_finished(file_name):
            gmail_login = user_info['email'].split('@')[0] if user_info else 'anonymous'
            hit = Listened(fileName=file_name, gmailLogin=gmail_login)
            classes.DbTables.commit()

        if 'finished_file_name' in params and params['finished_file_name']:
            log_finished(params['finished_file_name'])

        file_name = params['file_name']

        result = {}

        mid_path = cls.content_folder + '/midiCollection/' + file_name
        mid_js_path = cls.content_folder + '/midiCollectionDecoded/' + file_name + '.js'
        os.makedirs(os.path.dirname(mid_js_path), exist_ok=True)

        if not os.path.isfile(mid_js_path):  # handling cases when a midi file was added or renamed
            current_path = os.getcwd()
            os.chdir(cls.decode_script_path)
            cmd = ["java", cls.decode_script_class_path, mid_path, mid_js_path]
            call(cmd)
            os.chdir(current_path)

        # 'cd /home/klesun/progas/shmidusic/out'
        # 'java org.shmidusic.stuff.scripts.MidiToReadableMidi'
        # ''

        with codecs.open(mid_js_path, 'r', 'utf-8') as content:
            content_json = json.load(content)
            content.close()

        return content_json
