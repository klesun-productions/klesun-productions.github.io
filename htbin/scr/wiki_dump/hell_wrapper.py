
import mwparserfromhell
from collections import OrderedDict
import re


# Дёня мне тут подсказал%
# что если написать игру, которая будет как алиас? компьютер
# даёт определение из википедии и игрок должен угадать слово
import pymorphy2


def extract_first_sentence(paragraph: str) -> str:
    level = 0
    for i in range(0, len(paragraph)):
        c = paragraph[i]
        if c == '(': level += 1
        elif c == ')': level -= 1
        elif c == '.' and level <= 0:
            return paragraph[:i]
        elif c == '\n':
            return paragraph[:i]
    
    return paragraph


def remove_text_in_parentheses(sentence: str) -> str:
    level = 0
    letters = []
    for c in sentence:
        if c == '(': level += 1
        if level <= 0:
            letters.append(c)
        if c == ')': level -= 1

    return ''.join(letters)


def nodes_to_text(nodes: list) -> str:
    return mwparserfromhell.wikicode.Wikicode(nodes).strip_code()


def find_usage_heading(headings: dict):
    for heading, text in headings.items():
        if re.search('(рименение|спользование|улинар|начение)', heading):
            return text

    return None


def get_text_food_weight(text: str, weight_by_pattern: dict) -> dict:
    result = {}

    for pattern, weight in weight_by_pattern.items():
        if pattern not in result:
            result[pattern] = 0
        result[pattern] += weight * len(re.findall(pattern, text))

    return result


def add_dict(a: dict, b: dict):
    result = {}
    for d in [a,b]:
        for k,v in d.items():
            if k not in result: 
                result[k] = 0
            result[k] += v
    return result


def mul_dict(d: dict, factor: float):
    return {k: v * factor for (k,v) in d.items()}


# a wrapper to 
# @see https://github.com/earwig/mwparserfromhell
# provides handy access to most important parts of article
class Wrap(object):
    def __init__(self, text: str):
        self.root = mwparserfromhell.parse(text)
        self.text = self.root.strip_code()
        self.names = []
        self.meta_nodes = []
        self.introduction_nodes = []
        self.subject_type = None

        introduction_started = False        
        heading = None
        headings = OrderedDict()

        for node in self.root.nodes:
            if isinstance(node, mwparserfromhell.nodes.tag.Tag) and node.tag == 'b':
                introduction_started = True
                if heading is None:
                    self.names.append(node.contents)

            if isinstance(node, mwparserfromhell.nodes.heading.Heading):
                # ignoring nested headings
                if node.level == 2:
                    heading = str(node.title).strip()
                    headings[heading] = []

            if heading:
                headings[heading].append(node)
            elif introduction_started:
                self.introduction_nodes.append(node)
            else:
                self.meta_nodes.append(node)

        self.introduction = nodes_to_text(self.introduction_nodes)
        self.first_paragraph = self.introduction.split('\n')[0]
        self.first_sentence = extract_first_sentence(self.introduction)
        self.headings = OrderedDict((h, nodes_to_text(nodes)) for (h,nodes) in headings.items())
        self.meta_names = set(self.get_meta_template_names())

        if self.is_about_chemical():
            self.subject_type = 'chemical'
        elif self.is_about_person():
            self.subject_type = 'person'
        elif self.is_about_geography():
            self.subject_type = 'geography'
        elif (
            'аппарат' in self.first_sentence or
            'прибор' in self.first_sentence
        ):
            self.subject_type = 'device'
        elif (
            'метод' in self.first_sentence
        ):
            self.subject_type = 'method'
        elif self.is_about_taxon():
            self.subject_type = 'taxon'

    def get_meta_template_names(self) -> list:
        return [
            n.name.strip() 
            for n in self.meta_nodes 
            if isinstance(n, mwparserfromhell.nodes.template.Template)
            and n.name not in [
                'Перенаправление', 'Другие значения', 'значения', 
                'перенаправление', 'другое значение', 'другие значения', 
                'другие значения термина', 'Redirect', 'Значения',
            ]
        ]

    def get_definition_nouns(self) -> list:
        result = []
        sentence = remove_text_in_parentheses(self.first_sentence)
        match = re.search(r'^.+?\s+—\s+(.+)$', sentence)
        if match:
            morph = pymorphy2.MorphAnalyzer()
            definition = match.group(1)
            for word in re.split(r'[,\s]+', definition):
                parses = morph.parse(word)
                for parsed in parses:
                    if (parsed.tag.POS == 'NOUN' and
                        parsed.tag.case == 'nomn' # именительный падеж
                    ):
                        result.append(word)
                        break

        return result

    def get_text_food_weight(self) -> dict:
        result = {}
        
        weight_by_pattern = self.get_weight_by_pattern()

        result = add_dict(result, mul_dict(get_text_food_weight(self.first_sentence, weight_by_pattern), 40))
        result = add_dict(result, mul_dict(get_text_food_weight(self.first_paragraph, weight_by_pattern), 20))
        result = add_dict(result, mul_dict(get_text_food_weight(self.introduction, weight_by_pattern), 5))

        usage_text = find_usage_heading(self.headings)
        if usage_text:
            result = add_dict(result, mul_dict(get_text_food_weight(usage_text, weight_by_pattern), 5))

        total_weight = get_text_food_weight(self.text, weight_by_pattern)
        if len(self.text) < 10000: # small article
            total_weight = mul_dict(total_weight, 5)
        
        result = add_dict(result, total_weight)
        result = {k: v for (k,v) in result.items() if v > 0}
        
        return result

    def is_about_geography(self) -> bool:
        if ('Государство' in self.meta_names or
            'Река' in self.meta_names or
            'Море' in self.meta_names
        ):
            return True
        
        matched_known_prefixes = [n for n in self.meta_names if n.startswith('НП')] # capital city
        if matched_known_prefixes:
            return True
        
        return False

    def is_about_person(self) -> bool:
        first_sentence = self.first_sentence

        if ('Персона' in self.meta_names or
            'Философ' in self.meta_names or
            'Учёный' in self.meta_names or
            'Политический деятель' in self.meta_names or
            'Музыкант' in self.meta_names
        ):
            return True

        # birth/death dates
        months = [
            'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
            'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ]
        if (re.search('\d{1,2} (' + '|'.join(months) + ')', first_sentence) and
            re.search('(1\d|20)\d{2}', first_sentence)
        ):
            return True
        else:
            return False

    def is_about_chemical(self) -> bool:
        if 'Вещество' in self.meta_names:
            return True
        
        for node in self.introduction_nodes:
            if isinstance(node, mwparserfromhell.nodes.tag.Tag):
                if node.tag == 'sub' and node.contents.isnumeric():
                    return True
        
        if re.search('(\d*[A-Z][A-Za-z]){3,6}', self.first_sentence):
            return True
        
        return False

    def is_about_taxon(self) -> bool:
        if 'Таксон' in self.meta_names:
            return True

        if (
            ' род ' in self.first_sentence or
            ' вид ' in self.first_sentence or
            'семейств' in self.first_sentence or
            'руппа' in self.first_sentence or
            'отряд' in self.first_sentence or
            ' представител' in self.first_sentence
        ):
            return True

        return False

    def is_about_food(self) -> bool:
        if (self.subject_type is not None and
            self.subject_type is not 'chemical'
        ):
            return False

        weight = sum(self.get_text_food_weight().values())
        if weight > 15:
            return True

        return False

    def get_weight_by_pattern(self):
        is_about_chemical = self.subject_type is 'chemical'
        return {
            'моло[кч]': 0.1 if not is_about_chemical else 0,
            'масл': 0.1,
            'фрукт': 0.1,
            'овощ': 0.25,
            'ягод': 0.1,
            'хлеб': 0.1,
            'продукт': 0.1 if not is_about_chemical else 0,
            '[^а-я]плод(а|ы|[^а-я])': 0.25,

            'мясо': 0.5,

            'напиток': 0.5,
            'напитки': 0.5,
            '[^а-я]питани': 0.5,
            '[^а-я]соус': 0.5,
            '[^а-я]блюдо[^а-я]': 0.5,
            '[^а-я]в пищу': 2.5,
            'кулинар(и|н)': 0.75,
            'пищевой продукт': 1.0,
            'продукт питания': 1.0,
            'деликатес': 1.0,
            '[^а-я]десерт': 1.0,
            '[^а-я]съедобн': 1.0,
            '[^а-я]пить': 1.0,
            # problems?
            'наркот': 0.9,
            'отрав': 0.9,
            '[^а-я]витамин': 0.9,
            '[^а-я]опьян': 1.1,
            '[^а-я]диет': 1.1,
            '[^а-я]сорт(ы|а|ов)[^а-я]': 1.1,

            '[^а-я]белки': 0.5,
            '[^а-я]белок': 0.5,
            '[^а-я]белка': 0.5,
            '[^а-я]белком': 1,
            '[^а-я]жиры': 2,
            '[^а-я]углевод([^о]|ов)': 2,
            '[^а-я]энергетическ[а-я]+ ценност': 2,
            '[^а-я]питательн': 2,
            'сытн': 2,
            '[^а-я]сочн': 2,
            '[^а-я]оральн': 2,
            '[^а-я]сол(ит|ён([^о]|о[^с]))': 0.5 if not is_about_chemical else 0,
            '[^а-я]кислы': 2 if not is_about_chemical else 0,
            '[^а-я]лекарств': 2,
            'слад': 2,
            'горьк': 2,
            'вкус': 4,

            'пищев[а-я]+ добавк': 9,
            '[^а-я](приним|прмен)[а-я ,\(\)\-]+ (ингаляц|внутрь)': 9,
        }
