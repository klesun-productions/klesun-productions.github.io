#!/usr/env/python3

import sys
import re
import os
import shutil
from Sample import Sample

"""
this script creates 2 folders:
- generated_tunable
- generated_untunable
"""

script_dir = os.path.dirname(os.path.realpath(__file__))


def arrange_by_folders():

    if os.path.exists(script_dir + '/../generated_tunable/'):
        shutil.rmtree(script_dir + '/../generated_tunable/')
    if os.path.exists(script_dir + '/../generated_untunable/'):
        shutil.rmtree(script_dir + '/../generated_untunable/')

    for file in os.listdir(script_dir + '/../'):
        if file.endswith(".wav"):
            sample = Sample(file)
            if sample.is_tunable():
                dir_path = script_dir + '/../generated_tunable/' + sample.name
                os.makedirs(dir_path, exist_ok=True)
                shutil.copyfile(script_dir + '/../' + file, dir_path + '/' + str(sample.get_semitone()) + '.wav')
            else:
                dir_path = script_dir + '/../generated_untunable/'
                os.makedirs(dir_path, exist_ok=True)
                shutil.copyfile(script_dir + '/../' + file, dir_path + '/' + sample.file_name + '.wav')

arrange_by_folders()
