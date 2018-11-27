import re
import pymorphy2  # type: ignore
import os
import json

import typing
from typing import Iterable
from typing import Tuple
from typing import NamedTuple
from typing import Dict
from typing import Callable

SentenceT = typing.NamedTuple('SentenceT', [('rus', str), ('eng', str)])
ParagraphT = Iterable[SentenceT]
ChapterT = Iterable[ParagraphT]
BookT = Iterable[ChapterT]

script_dir = os.path.dirname(os.path.realpath(__file__))
content_dir = '/home/klesun/fat/p/shmidusic.lv/unv/wedmin/'


def _get_eng_phrase_to_translation_mapping() -> Dict[str, Iterable[str]]:
    path = content_dir + 'eng_rus_dict.json'
    with open(path, 'r') as f:
        engdict = json.load(f, 'utf-8')

    return engdict


# @return dict:
def _get_synonym_dict(infinite: Callable[[str], List[str]]) -> Dict[str, List[str]]:
    # @TODO:
    # - get the base dict
    # infinitize it
    path = content_dir + 'syn.json'
    with open(path, 'r') as f:
        source_syns = json.load(f, 'utf-8')

    result = {}  # type: Dict[str, List[str]]
    for keyword, opts in source_syns.iteritems():
        for infkeyword in infinite(keyword):
            
            infopts = [iw for w in opts
                       for sw in ' '.split(w)
                       for iw in infinite(sw)]

            result[infkeyword] = (list(set(result[infkeyword] + infopts))
                                  if infkeyword in result else infopts)

    return result


class TransLinker(object):
    def __init__(self):
        self.morph = pymorphy2.MorphAnalyzer()
        self.engdict = _get_eng_phrase_to_translation_mapping()
        self.syndict = _get_synonym_dict(self.__infinitives)

    @staticmethod
    def get_wedmin_eng_rus_linked(params, _) -> BookT:
        return [
            [
                [
                    SentenceT('жопа', 'ass')
                ]
            ]
        ]

    # @return a number from 0 to 1
    # 1 - when all words from rus match words in eng
    # 0 - when none of words in rus matches words in eng
    def __get_similarity(self, rus_sent: str, eng_sent: str) -> float:
        rus_words = [sw for w in re.finditer('[^А-я]*([А-я]*)[^А-я]*', rus_sent)
                     for iw in self.__infinitives(str(w))
                     for sw in self.__synonyms(iw)]
        eng_words = re.findall("[^A-z']*([A-z']*)[^A-z']*", eng_sent)

    def __infinitives(self, word: str) -> Iterable[str]:
        return ['Not', 'Implemented', 'Yet']

    def __synonyms(self, word: str) -> Iterable[str]:
        return ['Not', 'Implemented', 'Yet']

