

"use strict";

var Ns = Ns || {};

// this class implementation process moved to /htbin/classes/TransLinker.py

/** @param translations - supposedly list of transslations of the same text
 * @return parsed and linked where succeeded */
Ns.Linker = function (translations) {
    var range = (l, r) => new Array(r - l).fill().map((_, k) => k + l);

    var extractSentences = rawText => rawText.split('.').map(s => 1 && { translations: [s] });

    var extractParagraphs = rawText => rawText.replace(/[^\.]\n/, ".\n").split(/\n/).map(p => 1 && {
        sentences: extractSentences(p),
        translations: [p]
    });

    var extractChapters = rawText => rawText.split(/\n([0-9]+|[IVX]+) ?\n/).map(c => 1 && {
        header: 'maybe other time',
        content: extractParagraphs(c),
        translations: [c]
    });

    // from eng to ru
    var translate = function () {
        var base = 'https://translate.google.com/translate_a/single';
        var text = 'The girl flitted closer, threw off her mantle and slowly, hesitantly, rested her knee on the edge of the large bed';
        var params = [['client', 't'], ['sl', 'en'], ['tl', 'ru'], ['hl', 'ru'], ['dt', 'at'], ['dt', 'bd'], ['dt', 'ex'], ['dt', 'ld'], ['dt', 'md'], ['dt', 'qca'], ['dt', 'rw'], ['dt', 'rm'], ['dt', 'ss'], ['dt', 't'], ['ie', 'UTF-8'], ['oe', 'UTF-8'], ['pc', '1'], ['otf', '1'], ['srcrom', '1'], ['ssel', '0'], ['tsel', '0'], ['kc', '1'], ['tk', '477054.92226'], ['q', encodeURIComponent(text)]];
        // var params = '?client=t&sl=en&tl=ru&hl=ru&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&ie=UTF-8&oe=UTF-8&pc=1&otf=1&srcrom=1&ssel=0&tsel=0&kc=1&tk=477054.92226&q=';
        // var url = base + params + text;
        var url = base + '?' + params.map(e => e[0] + '=' + e[1]).join('&');
    };

    var linkParagraphs = function (translations) {
        var sentenceCounts = translations.map(t => t.sentences.length);
        return sentenceCounts.reduce((a, b) => a === b && a) ? Maybe.ok({
            sentences: range(0, sentenceCounts[0]).map(i => 1 && {
                translations: translations.map(t => t.sentences[i].translations[0])
            }),
            translations: translations.map(t => t.translations[0])
        }) : Maybe.no('sentence count not equal: ' + sentenceCounts.join(', '));
    };

    var linkChapters = function (translations) {
        var paragraphCounts = translations.map(t => t.content.length);
        return paragraphCounts.reduce((a, b) => a === b && a) ? Maybe.all(range(0, paragraphCounts[0]).map(i => linkParagraphs(translations.map(t => t.content[i])))).map(ps => 1 && {
            header: 'other time',
            content: ps,
            translations: translations.map(c => c.translations[0])
        }) : Maybe.no('paragraph count not equal: ' + paragraphCounts.join(', '));
    };

    var link = function (translations) {
        console.log(translations);

        var chapterCounts = translations.map(t => t.length);
        return chapterCounts.reduce((a, b) => a === b && a) ? Maybe.all(range(0, chapterCounts[0]).map(i => linkChapters(translations.map(t => t[i])))) : Maybe.no('chapter count not equal: ' + chapterCounts.join(', '));
    };

    return link(translations.map(extractChapters));
};

class Maybe {
    static ok(value) {
        return new Maybe(true, value, null);
    }
    static no(error) {
        return new Maybe(false, null, error);
    }
    static all(maybeList) {
        var errors = Array.from(maybeList.keys()).filter(i => !maybeList[i].isOk).map(i => i + ' ' + maybeList[i].match(e => e, v => '-100'));

        if (errors.length === 0) {
            return Maybe.ok(maybeList.map(m => m.match(e => {
                throw new Error(JSON.stringify(m));
            }, v => v)));
        } else {
            return Maybe.no('Some elements failed: [' + errors.join(';') + ']');
        }
    }
    constructor(isOk, value, error) {
        this.isOk = isOk;
        this.value = value;
        this.error = error;
    }
    static notNull(val) {
        if (val === null || val === undefined) {
            throw new Error('zalupa');
        } else {
            return val;
        }
    }

    match(ifNo, ifOk) {
        return this.isOk ? ifOk(Maybe.notNull(this.value)) : ifNo(this.error);
    }
    map(ifOk) {
        return this.isOk ? Maybe.ok(ifOk(Maybe.notNull(this.value))) : Maybe.no(this.error);
    }
};