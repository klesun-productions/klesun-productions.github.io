/* @flow */

var Ns = Ns || {};

// this class adapts output of "https://translate.google.com/translate_a/single" call
// to a simple dict with eng word/phrase as key and list of possible rus translations as value

type AdaptedT = {
    [key: string]: string[]
};

Ns.GoogleTranslateAdapter = function(source: GoogleTranslateT): AdaptedT
{
    var dict = {};

    /** @debug */
    for (var i = 0; i < source.length; ++i) {
        if (source[i][5] === null) {
            console.log(i, source[i]);
        }
    }

    source
        .forEach(p => p[5]
            .forEach(t => dict[t[0]] = t[2]
                .map(rus => rus[0])));

    return dict;
};

// array of translated paragraphs
type GoogleTranslateT = Array<[
    Array<[ // 0. list of translated sentences. it is superset of the 5th tuple element content
        string, // 0. translated sentence
        string, // 1. original sentence
        ?any, ?any, ?number, // dunno those
    ]>,
    ?any, // 1. dunno
    string, // 2. source language
    ?any, // 3. dunno
    ?any, // 4. dunno
    Array<[ // 5. list of detailed translation of each phrase
        string, // 0. original word/phrase
        number, // 1. (1)
        Array<[ // 2. list of possible translations
            string, // 0. the translation
            number, // 1. (915)
            boolean,// 2. (true)
            boolean // 3 (false)
        ]>,
        [[number, number]], // 4. ([[23,26]], [[0,9]]) second - first = length
        ?any, // 5.
        number, // 6. (1)
        number // 7. (3)
    ]>,
    number, // 6. (0.91352242)
    ?any, // 7. dunno
    [ // 8.
        [string], // source language
        ?any,
        [number], // float
        [string]  // source language
    ],
]>;
