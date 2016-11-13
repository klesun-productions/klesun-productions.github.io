#!/usr/bin/env python3.5

import json
import os
import copy

# a good man shared a tool to extract info from soundfonts - https://github.com/colinbdclark/sf2-parser
# the only thing, soundfont stuff is structured not very handy for the end-user like me (
# properties lay in a separate array and the root stores just the index in the array
# but what i think would be much easier to understand and use - nest the stuff in stuff
# )
# what this script produces:

"""
{
    "instruments": {
        "readableName": string,

        "chorusEffectsSend": ?int,
        "reverbEffectsSend": ?int,
        "modEnvToFilterFc": int,
        "releaseModEnv": int,
        "attackVolEnv": int,
        "sustainVolEnv": int,
        "releaseVolEnv": int,

        "samples": [{
            "keyRange": ?{
                "hi": int,
                "lo": int
            },
            "holdVolEnv": ?int,
            // ... в общем все поля до "sampleId"

            /** hmm, i kinda understand now. keyRange may intersect - in that case samples are played simulatenously */
            /** and if keyRange is not specified - instrument is played always, likely... */
            "sampleName": string,
            "sampleRate": int, // either 44100 or 22050
            "startLoop": int, // divide by "sampleRate" to get in seconds
            "endLoop": int,

            "sampleType": int, // looks like kinda useless
            "originalPitch": int, // looks like kinda useless
            "pitchCorrection": int, // looks like kinda useless
            "sampleLink": int // looks like kinda useless
        }, ...]
        # "instrumentModulatorIndex": int // reffers to the "instrumentZoneModulator" child index
    }
}
"""

# Ай да я, ай да угадал!
# Короче, флоуты здесь хранятся по-наркомански
# чтобы получить флоут, тебе надо возвести 2 ^ (число из этих данных / 1200)

script_dir = os.path.dirname(os.path.realpath(__file__))

# transforms dict of items with "amount" property to dict of their values
def flat_amounts(item_dict: dict) -> dict:
    f = lambda item: item['amount'] if 'amount' in item else item
    return {k: f(v) for k,v in item_dict.items()}

# i dunno the reason but _all_ sample names of _every_ soundfont have some
# trash after the filename, like "Nylon Guitar-C4\u0000h\fh\u0001"
# removing that trash
def clean_text(raw_text):
    # all lower than space is treated as end of string
    raw_text = raw_text + chr(0)
    end_idx = next(i for i,c in enumerate(raw_text) if ord(c) < 32)
    
    return raw_text[:end_idx]


def get_instrument_info(root: dict, instr_idx) -> dict:
    
    instr = copy.deepcopy(root['instrument'][instr_idx])
    
    instr['samples'] = []
    zone_start_idx = instr['instrumentBagIndex']
    zone_end_idx = (root['instrument'][instr_idx + 1]['instrumentBagIndex']
                    if instr_idx + 1 < len(root['instrument'])
                    else len(root['instrumentZone']))

    for zone_idx in range(zone_start_idx, zone_end_idx):

        gen_start_idx = root['instrumentZone'][zone_idx]['instrumentGeneratorIndex']
        gen_end_idx = (root['instrumentZone'][zone_idx + 1]['instrumentGeneratorIndex']
                       if zone_idx + 1 < len(root['instrumentZone'])
                       else len(root['instrumentZoneGenerator']))

        properties = [root['instrumentZoneGenerator'][idx] for idx in range(gen_start_idx, gen_end_idx)]
        properties = dict((p['type'], p['value']) for p in properties)

        if zone_idx == zone_start_idx:
            instr['generatorApplyToAll'] = flat_amounts(properties)
        else:
            sample_idx = properties['sampleID']['amount']
            sample = copy.deepcopy(root['sampleHeader'][sample_idx])
            sample['sampleName'] = clean_text(sample['sampleName']);
            sample['generator'] = flat_amounts(properties)
            instr['samples'].append(sample)
    
    instr['instrumentName'] = clean_text(instr['instrumentName'])
    return instr


# @param root - output of sf2-parser project
# return in somehow more handy and understandable structure
def to_nested(root: dict) -> dict:

    # damn lepin!
    
    result = []

    for pres_idx in range(0, len(root['presetHeader'])):
        pres = copy.deepcopy(root['presetHeader'][pres_idx])
        pres['presetName'] = clean_text(pres['presetName'])
        pres['stateProperties'] = []
        pzone_start_idx = pres.pop('presetBagIndex')
        pzone_end_idx = (root['presetHeader'][pres_idx + 1]['presetBagIndex']
                         if pres_idx + 1 < len(root['presetHeader'])
                         else len(root['presetZone']))

        for pzone_idx in range(pzone_start_idx, pzone_end_idx):

            gen_start_idx = root['presetZone'][pzone_idx]['presetGeneratorIndex']
            gen_end_idx = (root['presetZone'][pzone_idx + 1]['presetGeneratorIndex']
                           if pzone_idx + 1 < len(root['presetZone'])
                           else len(root['presetZoneGenerator']))

            # i don't really understand what these presets are needed for yet
            # but likely, it's to have different modifiers for different velocity,
            # what sux anyway, cuz most time there is just a linear difference in "Vol env release"
            state_props = [root['presetZoneGenerator'][idx] for idx in range(gen_start_idx, gen_end_idx)]
            state_props = dict((p['type'], p['value']) for p in state_props)

            if pzone_idx == pzone_start_idx and 'instrument' not in state_props:
                pres['generatorApplyToAll'] = flat_amounts(state_props)
            else:
                instr_idx = state_props.pop('instrument')['amount']
                pres['instrument'] = get_instrument_info(root, instr_idx)
                pres['instrument']['generator'] = flat_amounts(state_props)
        
        result.append(pres)

    result.sort(key=lambda a: a['bank'] * 128 + a['preset'])

    return result
    

def to_nested_drums(root: dict) -> dict:
    
    pres_idx = next(i for i,v in enumerate(root['presetHeader']) if v['bank'] == 128)
    
    # pres_idx = 158 # standard drum
    pres = root['presetHeader'][pres_idx]
    
    pres['stateProperties'] = []
    
    pzone_start_idx = pres.pop('presetBagIndex')
    pzone_end_idx = (root['presetHeader'][pres_idx + 1]['presetBagIndex']
                     if pres_idx + 1 < len(root['presetHeader'])
                     else len(root['presetZone']))

    instr_idx = None
    for pzone_idx in range(pzone_start_idx, pzone_end_idx):

        gen_start_idx = root['presetZone'][pzone_idx]['presetGeneratorIndex']
        gen_end_idx = (root['presetZone'][pzone_idx + 1]['presetGeneratorIndex']
                       if pzone_idx + 1 < len(root['presetZone'])
                       else len(root['presetZoneGenerator']))

        # i don't really understand what these presets are needed for yet
        # but likely, it's to have different modifiers for different velocity,
        # what sux anyway, cuz most time there is just a linear difference in "Vol env release"
        state_props = [root['presetZoneGenerator'][idx] for idx in range(gen_start_idx, gen_end_idx)]
        state_props = dict((p['type'], p['value']) for p in state_props)

        if pzone_idx == pzone_start_idx:
            # preset properties
            pres.update(state_props)
        else:
            # preset state properties
            instr_idx = state_props.pop('instrument')['amount']
            pres['stateProperties'].append(state_props)

            state_props['instrument'] = get_instrument_info(root, instr_idx)

    pres['presetName'] = clean_text(pres['presetName'])
    return pres


soundfont_dirs = [
#     '/home/klesun/fat/p/shmidusic.lv/out/sf2parsed/generaluser',
#     '/home/klesun/fat/p/shmidusic.lv/out/sf2parsed/fluid',
#     '/home/klesun/fat/p/shmidusic.lv/out/sf2parsed/arachno'
#     '/home/klesun/big/p/shmidusic.lv/out/sf2parsed/zunpet',
];

for soundfont_dir in soundfont_dirs:
    with open(soundfont_dir + '/sf2parser.out.json') as f:
        root = json.load(f)

    adapted = to_nested(root)

    with open(soundfont_dir + '/presets.json', 'w') as f:
        json.dump(adapted, f)
    with open(soundfont_dir + '/presets.pretty.json', 'w') as f:
        json.dump(adapted, f, indent=3)

    # well... damn mutability!
    with open(soundfont_dir + '/sf2parser.out.json') as f:
        root = json.load(f)

    drums = to_nested_drums(root)

    with open(soundfont_dir + '/drumPreset.json', 'w') as f:
        json.dump(drums, f)
