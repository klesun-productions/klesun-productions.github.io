#!/usr/bin/env python3.5

import json
import os

# a good man shared a tool to extract info from soundfonts - https://github.com/colinbdclark/sf2-parser
# the only thing, stuff is structured not very handy for the end-user like me (
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


def get_instrument_info(root: dict, instr_idx) -> dict:
    instr = root['instrument'][instr_idx]
    
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
            # instrument properties
            instr.update(properties)
        else:
            # sample properties
            sample = properties
            sample.update(root['sampleHeader'][sample['sampleID']['amount']])
            instr['samples'].append(sample)
    
    return instr


# @param root - output of sf2-parser project
# return in somehow more handy and understandable structure
def to_nested(root: dict) -> dict:

    # damn lepin!

    for pres_idx in range(0, len(root['presetHeader'])):
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
                instr_idx = state_props.pop('instrument')['amount']  # will always be the last. it's ok, they are same anyway
                pres['stateProperties'].append(state_props)

        # i think it's some sort of bug in the sf2parser - last preset is broken for some reason...
        if len(pres['stateProperties']) == 0:
            continue

        instr = pres['instrument'] = get_instrument_info(root, instr_idx)

    return root['presetHeader']
    

def to_nested_drums(root: dict) -> dict:
    
    # it's copypaste
    
    pres_idx = 158 # standard drum
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

    return pres

with open(script_dir + '/../unversioned/soundfonts_info2.js') as f:
    root = json.load(f)

#~ adapted = to_nested(root)
#~ 
#~ with open(script_dir + '../our/fluidPresets.json', 'w') as f:
    #~ json.dump(adapted, f)

drums = to_nested_drums(root)

with open(script_dir + '/../out/fluidDrumPresets.json', 'w') as f:
    json.dump(drums, f)
