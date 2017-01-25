
import {ServApi, article_row_t} from "../utils/ServApi";
import {YoutubeApi} from "../utils/YoutubeApi";
import {Tls} from "../utils/Tls";
import {ParseSoundFontFile, TransformSf2Parse, flattenSamples} from "../synths/soundfont/ParseSf2";
import {S} from "../utils/S";
import {Dom} from "../utils/Dom";

var Gui = function(mainControl: HTMLDivElement)
{
    var $$ = (selector: string, el?: HTMLElement) =>
        <HTMLElement[]>Array.from((el || document).querySelectorAll(selector));

    return {
        btns: {
            updateLinks: $$('#updateLinks', mainControl)[0],
            decodeSoundFont: $$('#decodeSoundFont', mainControl)[0],
            testDecodeSoundFont: $$('#testDecodeSoundFont', mainControl)[0],
            collectLikedSongs: $$('#collectLikedSongs', mainControl)[0],
        },
        foodArticleTable: $$('tbody.food-articles', mainControl)[0],
    };
};

/**
 * initializes the admin.html page controls
 */
export let Admin = function(mainControl: HTMLDivElement)
{
    var gui = Gui(mainControl);

    gui.btns.collectLikedSongs.onclick = () =>
        ServApi.collectLikedSongs(console.log);

    gui.btns.testDecodeSoundFont.onclick = () =>
        Tls.fetchJson('/out/sf2parsed/zunpet/sf2parser.out.json', sf2parse =>
            console.log(flattenSamples(TransformSf2Parse(<any>sf2parse))));

    gui.btns.decodeSoundFont.onclick = () =>
        Tls.fetchBinaryFile('/unversioned/soundfonts/fluid.sf2', byteBuffer => {
            var [soundFont, audioDataSamples] = ParseSoundFontFile(byteBuffer);
            console.log('Decoded Soundfont: ', soundFont);
            S.list(audioDataSamples).sequence = (d, i) =>
                ServApi.save_sample_wav({
                    sfname: 'fluid',
                    sampleNumber: i,
                    sampleName: d[1].sampleName,
                    sampleRate: d[1].sampleRate,
                    samplingValues: d[0],
                });
        });

    gui.btns.updateLinks.onclick = () =>
        ServApi.get_ichigos_midi_names((songs) =>
        ServApi.getYoutubeLinks((linksBySongName) =>
    {
        let ytb = YoutubeApi();

        let fetchNext = (i: number) =>
        {
            if (i < songs.length) {
                let songName = songs[i].fileName;
                if (songName in linksBySongName) {
                    fetchNext(i + 1);
                } else {
                    let retry = (tryN: number) => ytb.getVideoUrlsByApproxName(songName, urls => {
                        console.log(songName, urls);
                        if (urls.length === 0) {
                            console.log('pizda nam', songName);
                            if (tryN > 0) {
                                retry(tryN - 1);
                            } else {
                                fetchNext(i + 1);
                            }
                        } else {
                            ServApi.linkYoutubeLinks(songName, urls, id => {
                                console.log('ok', id, songName);
                                fetchNext(i + 1);
                            });
                        }
                    });
                    retry(5);
                }
            }
        };

        fetchNext(0);
    }));

    ServApi.get_assorted_food_articles = (articles) => {
        type book_t = {[word: string]: number};
        let whenRecipeBookLoaded = S.list(<Array<(b: book_t) => void>>[]);
        let findInBook = (word: string, book: book_t): number => {
            let popularity = 0;
            for (let subWord in word.split(' ')) {
                if (subWord in book) {
                    popularity += book[subWord];
                }
            }
            return popularity;
        };

        let detectOpinion = function(article: article_row_t): IOpt<number>
        {
            let noun = article.definition_noun.split(',')
                .filter(w => w.length > 1)[0] || '';

            let [cleanTitle, clarification] = Tls.removeParentheses(article.wiki_title);

            let isImmaterial = cleanTitle.split(' ').concat(!noun.endsWith('азвание') ? [noun] : []).some(
                word => ['изм', 'ние', 'ция', 'ство', 'ость', 'логия'].some(
                postfix => word.endsWith(postfix)));

            let isLatin = !/[А-Яа-я]/.test(cleanTitle);

            let isTaxon = article.aticle_type === 'taxon' || [
                'рыба', 'рыбы', 'разновидность', 'вид', 'род', 'растение', 'растения', 'дерево', 'млекопитающее', 'кустарник',
            ].includes(noun);

            let isChemical = [
                'белки', 'белок', 'соединение', 'соединения', 'рецептор', 'реагент', 'соли', 'гликопротеин', 'соль', 'аминокислота',
                'кислоты', 'элементы', 'элемент', 'альбумин', 'агонист', 'эфир', 'эфиры', 'гормон', 'молекулы', 'фермент', 'ферменты',
                'алкалоид',

            ].includes(noun);

            let isCodeOrProperName =
                /[0-9]/.test(article.wiki_title) ||
                /[A-ZА-Я].*[A-ZА-Я]/.test(article.wiki_title);

            let words = clarification.toLowerCase().split(' ')
                .concat(cleanTitle.toLowerCase().split(' '))
                .concat([noun]);

            let isFiction = words.some(word => [
                'кинокомедия', 'сериал', 'эпизод', 'телесериал', 'рассказ', 'повесть', 'роман', 'фильм', 'комедия', 'передача',
                'журнал', 'альбом', 'игра', 'книга', 'серия', 'картина', 'песня','балет', 'озеро', 'кинофильм', 'прозы', 'детектив',
                'баллада', 'шоу', 'опера', 'базар', 'сказка', 'сборник', 'поэма', 'том', 'драма', 'реалити-шоу', 'мультфильм',
                'пьеса', 'трактат', 'притча', 'телепередача', 'газета',
            ].includes(word));

            let isGeography = words.some(word => [
                'зона','музей', 'парк', 'замок', 'местность', 'резиденция', 'резервуар', 'остров', 'залив', 'город', 'монастырь',
                'завод', 'центр', 'учреждение', 'компания', 'организация', 'источник', 'синагога', 'водоём', 'памятник',
                'родник', 'водохранилище', 'долина', 'место', 'лес', 'заказник', 'воды', 'школа', 'клуб', 'сад', 'участок',
                'район', 'комбинат', 'острова', 'регион', 'издательство', 'гора',
            ].includes(word));

            let isFood = words.some(word => [
                'напиток', 'блюдо', 'блюда', 'сыр', 'суп', 'добавка', 'соус', 'плод', 'плоды', 'сладкое', 'полусладкое', 'приправа', 'сорт',
                'десерт', 'сладость', 'фрукты', 'фрукт', 'колбаса', 'лекарство', 'ликёр', 'мясо', 'пирог', 'чай', 'печенье',
                'квас', 'хлеб', 'масло', 'вино', 'специя', 'салат', 'закуска', 'сок', 'соки', 'выпечка', 'деликатес', 'сироп', 'зелье',
                'второе', 'ром', 'наркотик', 'корм', 'молоко', 'торт', 'гриб', 'кухни', 'конфеты', 'коктейль', 'горячее', 'холодное', 'бренд',
                'пряность', 'пиво', 'лепёшка', 'рагу', 'ягоды', 'сладости', 'таблетки', 'крупа', 'изделия', 'продукты', 'пища', 'кушанье',
                'аперитив', 'консервы', 'водка', 'каша', 'грибы', 'яд', 'вода', 'ингредиент', 'кофе', 'марка', 'изделие',
            ].includes(word));

            let isMiscNotFood = words.some(word => [
                'кампания', 'программа','совокупность', 'система', 'рок-группа', 'раздел', 'приём', 'объект',
                'производитель', 'специалист', 'процесс', 'заболевание', 'понятие', 'коллектив', 'выступления',
                'приспособление', 'сосуд', 'праздник', 'практика', 'среда', 'жанр', 'мазь', 'проект', 'путь', 'переход',
                'традиция', 'традиции', 'расстройство', 'отравление', 'способы', 'имя', 'направление', 'величина',
                'фамилия', 'стиль', 'персонаж', 'наука', 'отрасль', 'сотрудник', 'единица', 'факторы',
                'герой', 'использование', 'кухня', 'реакция', 'состояние', 'сеть', 'техника', 'инструмент',
                'богиня', 'божество', 'дух', 'конструкция', 'мифологии', 'устройство', 'кувшин', 'человек', 'заболевание', 'болезни',
                'модель', 'учение', 'конкурс', 'обработка', 'синдром', 'способ', 'Метод', 'процедура', 'процессы', 'теория',
                'снаряжение', 'показатель', 'машина', 'комплекс', 'автомат', 'аномалия', 'феномен', 'парадокс',
                'контейнер', 'акт', 'деталь', 'болезнь', 'расстройства', 'документ', 'свод', 'мероприятия', 'упаковка',
                'история', 'кухня', 'и', 'список', 'фонд', 'период', 'комиссия', 'диета', 'служба', 'устройства',
                'спецслужба', 'народ', 'минерал', 'фестиваль', 'удобрения', 'правило', 'набор', 'рынок', 'принцип', 'состояния',
                'народы', 'фирма', 'перечень', 'танец', 'философия',
            ].includes(word));

            if (isFood) {
                return S.opt(5); // food, set automatically
            } else if (isImmaterial || isCodeOrProperName || isChemical
                    || isFiction || isGeography || isMiscNotFood
            ) {
                return S.opt(1); // this is not food... probably
            } else if (article.food_weight > 10 && [
                'продукт', 'средство', 'средства', 'вещества',
                'вещество', 'препарат', 'паста',
            ].includes(noun)) {
                return S.opt(4); // likely food, set automatically
            } else if (article.food_weight > 10 && isTaxon && !isLatin) {
                return S.opt(4);
            } else if (isLatin) {
                return S.opt(1); // this is not food... probably
            } else {
                return S.opt(null);
            }
        };

        let getSortValue = (a: article_row_t) =>
            Tls.removeParentheses(a.wiki_title)[0]
                .split(' ')
                .map(w => w.length)
                .sort((a,b) => b - a)[0] || 0; // use largest

        gui.foodArticleTable.innerHTML = '';
        S.list(articles).sort(getSortValue).slice(0, 3000).forEach = article => gui.foodArticleTable.appendChild(Dom.mk.tr({
            children: [
                Dom.mk.td({innerHTML: article.wiki_id+''}),
                Dom.mk.td({innerHTML: article.aticle_type}),
                Dom.mk.td({innerHTML: article.definition_noun.split(',').filter(w => w.length > 1)[0]}),
                Dom.mk.td({innerHTML: article.wiki_title, className: 'article-title'}),
                Dom.mk.td({innerHTML: article.food_weight+''}),
                Dom.mk.td().with(td => whenRecipeBookLoaded.more = book => td.innerHTML = findInBook(article.wiki_title, book)+''),
                Dom.mk.td({children: [
                    Dom.mk.select({children: [
                        Dom.mk.option({innerHTML: '---', disabled: true, selected: true}),
                        Dom.mk.option({value: 9+'', innerHTML: '9: everyone knows this food'}),
                        Dom.mk.option({value: 8+'', innerHTML: '8: most people know this food'}),
                        Dom.mk.option({value: 7+'', innerHTML: '7: i know this food'}),
                        Dom.mk.option({value: 6+'', innerHTML: '6: food, never heard about it'}),
                        Dom.mk.option({value: 5+'', innerHTML: '5: food, set automatically'}),
                        Dom.mk.option({value: 4+'', innerHTML: '4: likely food, set automatically'}),
                        Dom.mk.option({value: 3+'', innerHTML: '3: postponed'}),
                        Dom.mk.option({value: 2+'', innerHTML: '2: i guess you can call it a food'}),
                        Dom.mk.option({value: 1+'', innerHTML: '1: this is not food, probably'}),
                        Dom.mk.option({value: 0+'', innerHTML: '0: this is not food'}),
                    ]}).with(select => {
                        select.onchange = _ => {
                            select.classList.remove('done-sending-opinion');
                            select.classList.add('sending-opinion');
                            ServApi.set_food_article_opinion({
                                wiki_id: article.wiki_id,
                                title: article.wiki_title,
                                food_relevance_score: +select.value,
                                food_relevance_message: select.options[select.selectedIndex].text,
                                definition_noun: article.definition_noun.split(',').filter(w => w.length > 1)[0],
                            }).then = (info: any) => {
                                select.classList.remove('sending-opinion');
                                if (info === 'stored OK') {
                                    select.classList.add('done-sending-opinion');
                                } else {
                                    console.error(info);
                                    select.classList.add('error-sending-opinion');
                                }
                            };
                        };

                        // detectOpinion(article).get = v => {
                        //     select.value = v + '';
                        //     select.onchange(null);
                        // }
                    }),
                ]}),
            ],
        }).s);
    };
};
