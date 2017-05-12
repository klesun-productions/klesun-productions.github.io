# this class (as obvious from name) provides info
# from midi file storage (maybe even data one day)

import os
import re
import os.path
from pony.orm import select, db_session
from classes.DbTables import SongRating
from shutil import copyfile

dirpath = os.path.dirname(os.path.realpath(__file__))


def make_order_value(rating: str) -> str:
    return rating.replace('+', 'a').replace('-', 'c').ljust(31, 'b')


class MidiFileProvider(object):
    project_root = dirpath + '/../../'
    content_folder = project_root + '/Dropbox/web/'
    soundfont_folder = project_root + '/out/sf2parsed/'

    @classmethod
    @db_session
    def get_info_list(cls, params: dict) -> tuple:
        # TODO: investigate, this function likely takes ~0.6 second every time, what i think is VERY SLOW

        result = []

        root = cls.content_folder + '/midiCollection/'

        file_list = [os.path.relpath(curDir, root) + '/' + fileName
                     for curDir, _, fileNames in os.walk(root) if not curDir.endswith('source_ichigos_com')
                     for fileName in fileNames if fileName.endswith('.mid') or fileName.endswith('.MID')]

        rating_by_name = {r.fileName: r.rating for r in select(r for r in SongRating)}

        for file in file_list:
            result.append({
                "fileName": file,
                "rawFileName": file,
                "rating": rating_by_name[file] if file in rating_by_name else ''
            })

        result = sorted(result, key=lambda k: (make_order_value(k['rating']) + k['fileName']))

        return result

    @classmethod
    def get_my_song_links(cls, params) -> list:
        url_base = '/unversioned/gits/riddle-needle/Assets/Audio/midjs/'
        root = cls.project_root + url_base
        return [{
                "name": fileName,
                "url": url_base + os.path.relpath(curDir, root) + '/' + fileName,
            }
            for curDir, _, fileNames in os.walk(root)
            for fileName in fileNames if fileName.endswith('.js') or fileName.endswith('.json')]

    @classmethod
    @db_session
    def collect_liked_songs(cls, params: dict):
        root = cls.content_folder + '/midiCollection/'
        destination_root = '/unversioned/midiCollectionLiked/'

        file_list = [os.path.relpath(curDir, root) + '/' + fileName
                     for curDir, _, fileNames in os.walk(root) if not curDir.endswith('source_ichigos_com')
                     for fileName in fileNames if fileName.endswith('.mid')]

        rating_by_name = {r.fileName: r.rating for r in select(r for r in SongRating)}

        for file in file_list:
            if file in rating_by_name:
                rating = rating_by_name[file]
                if rating.startswith('+') and not rating.startswith('+---'):
                    dest_file = destination_root + file
                    if not os.path.exists(os.path.dirname(dest_file)):
                        os.makedirs(os.path.dirname(dest_file))
                    copyfile(root + file, dest_file)

        return 'peace and love'

    @classmethod
    def save_sample_wav(cls, params):
        sfname = params['sfname'] # zunpet/fluid/generaluser/etc...
        sample_number = params['sampleNumber']
        sample_name = params['sampleName']
        sample_rate = params['sampleRate']

        # JSON.stringify() of Int16Array in javascript returns them as a dict for some reason
        sampling_values = list(params['samplingValues'].values())

        data_byte_list = [
            int(b)
            for n in sampling_values
            for b in n.to_bytes(2, byteorder='little', signed=True)
        ]

        path = cls.soundfont_folder + '/' + sfname + '/samples/' + str(sample_number) + '_' + sample_name + '.wav'
        with open(path, 'wb') as f:
            f.write(bytearray(cls.add_riff_header(sample_rate, data_byte_list)))

        return 'peace and love'

    @classmethod
    def add_riff_header(cls, sample_rate: int, data_bytes: list) -> list:
        def int_bytes(l, i):
            return [int(b) for b in i.to_bytes(l, byteorder='little', signed=False)]

        # sample_rate = 44100 # TODO: pass
        # sample_rate = 29000  # TODO: pass
        bits_per_sample = 16  # TODO: pass

        chunk_size = len(data_bytes) + 36  # file size - first 8 bytes
        sub_chunk_size = 16
        chan_cnt = 1

        block_align = chan_cnt * int(bits_per_sample / 8)
        byte_rate = block_align * sample_rate

        result = []

        result += [0x52, 0x49, 0x46, 0x46]  # RIFF
        result += int_bytes(4, chunk_size)
        result += [0x57, 0x41, 0x56, 0x45]  # WAVE
        result += [0x66, 0x6D, 0x74, 0x20]  # fmt
        result += int_bytes(4, sub_chunk_size)
        result += int_bytes(2, 1)  # PCM = 1 means data is not compressed
        result += int_bytes(2, chan_cnt)
        result += int_bytes(4, sample_rate)
        result += int_bytes(4, byte_rate)
        result += int_bytes(2, block_align)
        result += int_bytes(2, bits_per_sample)
        result += [0x64, 0x61, 0x74, 0x61]  # data
        result += int_bytes(4, len(data_bytes))
        result += data_bytes

        return result
