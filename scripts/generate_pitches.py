#!/usr/env/python3

import sys
import os
import shutil
import json
import subprocess

"""
This script takes soundfont raw wav files and transforms them into a
subfolder structure:
+-root
|
+--+- sample_file_name
   |
   +-- 0.wav // corrected fine tune if needed
   |
   +-- 0_loop.wav
   |
   +-- -1.wav
   |
   +-- -1_loop.wav
   |
   +-- 1.wav
   |
   +-- 1_loop.wav
   |
   ...

notice that we do not keep info about what semitone the 0 is
supposing this number is stored in instrument -> samples mapping. lame sf2
"""

script_dir = os.path.dirname(os.path.realpath(__file__))
source_dir = '/home/klesun/mounted_fat/progas/shmidusic.lv/unversioned/fluidSamples'
destination_dir = '/home/klesun/mounted_fat/progas/shmidusic.lv/out/fluidSamples';


# use this instead of "str(someVerySmallFloat)" for python would convert
# it to science notation "6.802721088435374e-05" instead of 0.00006802721088435374
def no_science(some_float):
    return '{0:.20f}'.format(some_float)


def shift_pitch(source, destination, semitones):
    freq_factor = 2**(semitones / 12.0)
    cmd = 'rubberband "' + source + '" -T ' + no_science(freq_factor) + \
          ' -f ' + no_science(freq_factor) + ' "' + destination + '"'
    subprocess.call(cmd, shell=True)


def cut_audio(source, destination, from_seconds, to_seconds):
    # пидорасы громкость увеличивают - смотри "Clarinet C#5(L)/-1_loop.wav"
    cmd = ['sox', source, destination, 'trim', no_science(from_seconds), '=' + no_science(to_seconds)]
    
    # @debug
    print(' '.join(cmd))
    
    subprocess.call(cmd)


def shift_lacking_pitches(diry, delta_left, delta_right):
    for i in range(delta_left, delta_right + 1):
        if not os.path.exists(diry + '/' + str(i) + '.wav'):
            shift_pitch(diry + '/0.wav', diry + '/' + str(i) + '.wav', i)
            shift_pitch(diry + '/0_loop.wav', diry + '/' + str(i) + '_loop.wav', i)
            

def do_script():
    
    with open(script_dir + '/out.js') as f:
        sf = json.load(f)
    
    for preset in sf:
        
        # @debug
        print('processing: ' + preset['presetName'])
        
        for sample in preset['instrument']['samples']:
            
            file_name = sample['sampleName']
            
            # @debug
            print('    ' + file_name)
            
            semitone = (sample['overridingRootKey']['amount']
                        if 'overridingRootKey' in sample
                        else sample['originalPitch'])
            
            low, high = ((sample['keyRange']['lo'], sample['keyRange']['hi'])
                         if 'keyRange' in sample
                         else (24, 127))
            
            correction_cents = (sample['fineTune']['amount'] 
                                if 'fineTune' in sample 
                                else 0)
            
            sample_rate = sample['sampleRate']
            start_loop = sample['startLoop']
            end_loop = sample['endLoop']
            
            source = source_dir + '/' + file_name + '.wav'
            outdir = destination_dir + '/' + file_name
            
            if not os.path.exists(outdir):
                os.mkdir(outdir)

                not_fine = outdir + '/0_loop_not_fine.wav'
                cut_audio(source, not_fine, start_loop / sample_rate, end_loop / sample_rate)
                
                shift_pitch(source, outdir + '/0.wav', correction_cents / 50)
                shift_pitch(not_fine, outdir + '/0_loop.wav', correction_cents / 50)
                
                os.remove(not_fine)
            
            shift_lacking_pitches(outdir, low - semitone, high - semitone)
            

# TODO: use srconv to prevent -60 pitches taking 2^5 * original size
# (i mean fix by decreasing samle rate)
do_script()
