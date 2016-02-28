#!/usr/env/python3

import sys
import re
import os
import shutil
from subprocess import call
from Sample import Sample
import json

# yuno, every instrument in soundfont have a midi number [0..128) assigned to it

script_dir = os.path.dirname(os.path.realpath(__file__))

def prepend_codes():
    index = -1
    last_name = ''
    
    with open(script_dir + '/samples_info.js') as f:
        sample_info_list = json.load(f)
    
    for info in sample_info_list:
        sample = Sample(info['sampleName'] + '.wav')
        if sample.name != last_name:
            last_name = sample.name
            index += 1
            sample_folder_path = script_dir + '/../generated_tunable/' + sample.name
            if os.path.exists(sample_folder_path):
                # os.rename(sample_folder_path, script_dir + '/../generated_tunable/' + str(index))
                print(script_dir + '/../generated_tunable/' + str(index + 1) + '_' + sample.name)
            elif index < 115: # 115 - Woodblock - not tunable
                print('instrument without folder ', index, sample.name)

prepend_codes()

# leaving only number - no name
#~ folder_pattern = re.compile('^(\d{1,3})_.*$')
#~ for dir in os.listdir(script_dir + '/../generated_tunable/'):
    #~ if folder_pattern.match(dir):
        #~ print(dir)
        #~ code = folder_pattern.findall(dir)[0]
        #~ old_path = script_dir + '/../generated_tunable/' + dir
        #~ new_path = script_dir + '/../generated_tunable/' + code
        #~ # print(dir_path)
        #~ os.rename(old_path, new_path)
    
