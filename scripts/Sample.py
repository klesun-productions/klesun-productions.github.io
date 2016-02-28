#!/usr/local/env python3

import re

# this class represents a sample file extracted from FluidSynth3
# the class can detect note semitone by file name

note_letters = {
    'C': 0,  # doh
    'D': 2,  # reh
    'E': 4,  # mih
    'F': 5,  # fah
    'G': 7,  # sol
    'A': 9,  # lah
    'B': 11  # tih
}

signs = {
    '#': +1, '# ': +1,
    'b': -1,
    ' ': 0, '': 0
}


class Sample:
    tunable_pattern = re.compile('^(.*)[ _]([a-gA-G])( |#|b|# )?(\d{1}|1\d{1})(\((L|R)\)|L)?\.wav$')
    tuneless_pattern = re.compile('^(.*)(\((L|R)\))?\.wav$')

    def __init__(self, file_name):
        self.file_name = file_name
        if self.tunable_pattern.match(self.file_name):
            self.name, self.letter, self.sign, self.octave, _, _ = \
                self.tunable_pattern.findall(self.file_name)[0]
        else:
            self.name, _, _ = self.tuneless_pattern.findall(self.file_name)[0]
            self.letter = self.sign = self.octave = ''

    def is_tunable(self):
        return self.tunable_pattern.match(self.file_name)

    def get_semitone(self) -> int:
        if self.is_tunable():
            semitone = int(self.octave) * 12 + \
                note_letters[self.letter.upper()] + \
                signs[self.sign]
            return semitone
        else:
            return -100
