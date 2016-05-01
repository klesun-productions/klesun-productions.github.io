

var Ns = Ns || {};

// thic class adapts output of "https://translate.google.com/translate_a/single" call
// to a simple dict with eng word/phrase as key and list of possible rus translations as value

Ns.GoogleTranslateAdapter = function (source) {
    var dict = {};

    /** @debug */
    for (var i = 0; i < source.length; ++i) {
        if (source[i][5] === null) {
            console.log(i, source[i]);
        }
    }

    source.forEach(p => p[5].forEach(t => dict[t[0]] = t[2].map(rus => rus[0])));

    return dict;
};

// array of translated paragraphs