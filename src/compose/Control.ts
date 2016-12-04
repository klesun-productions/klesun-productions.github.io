/// <reference path="../references.ts" />
/// <reference path="./Shmidusicator.ts" />

// this object provides some shortcut methods
// to edit content of Painter.ts

import * as Ds from "../DataStructures";
import {Shmidusicator} from "./Shmidusicator";
import {determinePosition, SongAccess, extractNote, CanvasProvider} from "./Painter";
import {TactMeasurer} from "./Painter";
import {IShNote} from "../DataStructures";
import {Tls, IOpt, Opt, IFraction} from "../utils/Tls";
import {Adp} from "../Adp";

export function Control($chordListCont: JQuery, configCont: HTMLElement)
{
    let canvaser = CanvasProvider(3);

    let $parentEl = $chordListCont.parent();
    let chordListCont = $chordListCont[0];

    let log = (msg: string, data: any) => console.log('# Score control message: ', msg, data);

    let scrollToIfNeeded = function(chordEl: HTMLElement)
    {
        /** @TODO: it does not work */

        let chordRect = chordEl.getBoundingClientRect();
        let scrollPaneRect = $parentEl[0].getBoundingClientRect();

        let isVisible = chordRect.top >= scrollPaneRect.top &&
            chordRect.bottom <= (window.innerHeight || document.documentElement.clientHeight);

        if (!isVisible) {
            let top = $(chordEl).offset().top -
                $parentEl.offset().top +
                $parentEl.scrollTop();

            $parentEl.scrollTop(top);
        }
    };

    let isHighlyLoaded = function()
    {
        return chordListCont.childNodes.length > 1000;
    };

    /** @return the focused index after applying bounds */
    let setChordFocus = function(index: number): number
    {
        let $chords = $chordListCont.find(' > .chordSpan');
        index = Math.min($chords.length - 1, Math.max(-1, index));

        let chord = $chords[index];
        chord && scrollToIfNeeded(chord);

        $chordListCont.find('.focused .pointed').removeClass('pointed');
        $chordListCont.find(' > .chordSpan.focused').removeClass('focused');
        $(chord).addClass('focused');

        return index;
    };

    let setNoteFocus = function(sem: number, chan: number, velocity: number, chordIndex: number)
    {
        let perform = function() {
            let chord = $chordListCont.find(' > .chordSpan')[chordIndex];
            chord && scrollToIfNeeded(chord);

            setChordFocus(chordIndex);

            let $note = $(chord).find('.noteCanvas[data-tune="' + sem + '"][data-channel="' + chan + '"]');
            $note.addClass('sounding');

            return () => { /*$(chord).removeClass('focused'); */ $note.removeClass('sounding'); };
        };

        if (!isHighlyLoaded()) {
            return perform();
        } else {
            return () => {};
        }
    };

    /** @return array with the newly pointed note or empty array */
    let pointNextNote = function(): Ds.IShNote[]
    {
        let getOrder = (note: any) =>
            + +$(note).attr('data-tune') * 16
            + +$(note).attr('data-channel');

        let notes = $chordListCont.find('.focused .noteCanvas').toArray()
            .sort((a,b) => getOrder(a) - getOrder(b));

        let pointed = $chordListCont.find('.focused .pointed')[0];
        let index = pointed ? notes.indexOf(pointed) + 1 : 0;

        $chordListCont.find('.pointed').removeClass('pointed');
        if (index < notes.length) {
            $(notes[index]).addClass('pointed');
            return [canvaser.extractNote(notes[index])];
        }

        return [];
    };

    let recalcTacts = function()
    {
        let tactSize = $(configCont).find('.holder.tactSize').val() || 1.0;

        $chordListCont.find('.tactNumberCont').html('&nbsp;');
        $chordListCont.find(' > .chordSpan')
            .removeClass('tactFinisher')
            .removeClass('doesNotFitIntoTact')
            .removeAttr('data-rest');

        let tacter = TactMeasurer(tactSize);
        let $chords = $chordListCont.find(' > .chordSpan').toArray().map(c => $(c));

        $chords.forEach(($span: JQuery) =>
        {
            let chordLength = $span.find('.noteCanvas').toArray()
                .map(n => $(n).attr('data-length')).sort()
                [0] || 0;

            if (tacter.inject(+chordLength)) {
                $span.find('.tactNumberCont').html(tacter.tactNumber().toString());
                $span.addClass('tactFinisher');
                if (tacter.hasRest()) {
                    $span.addClass('doesNotFitIntoTact')
                        .attr('data-rest', tacter.getRest())
                }
            }
        });
    };

    let tactRecalcRequested = false;
    let requestRecalcTacts = () => {
        if (!tactRecalcRequested) {
            tactRecalcRequested = true;
            setTimeout(() => {
                tactRecalcRequested = false;
                recalcTacts();
            }, 1000);
        }
    };

    let getCleanLength = function(num: number, den: number)
    {
        // num and den ar supposedly the smallest possible numbers to
        // describe fraction, for example they can not be 4/2 or 2/6
        den = den % 3 === 0 ? den / 3 : den;
        let stepsOverSemibreve = Math.log2(num);
        if (stepsOverSemibreve % 1 === 0 &&
            stepsOverSemibreve > 0
        ) {
            return num / den;
        } else {
            return (1 + num) / den / 2;
        }
    };

    let reduce2 = function(num: number) {
        while (num && num % 2 === 0) {
            num /= 2;
        }
        return num;
    };

    let getDotCount = (numerator: number) =>
        Math.log2(reduce2(+numerator) + 1) - 1;

    let setDotCount = function(num: number, den: number, dots: number): number
    {
        let cleanLength = getCleanLength(num, den);
        let result = 0;
        for (let i = 0; i < dots + 1; ++i) {
            result += cleanLength;
            cleanLength /= 2;
        }
        return result;
    };

    let addNoteToChord = function(note: IShNote, $chord: JQuery): HTMLElement
    {
        let selector = '.noteCanvas' +
            '[data-tune="' + note.tune + '"]' +
            '[data-channel="' + note.channel + '"]';

        if ($chord.children(selector).length === 0) {
            let [ivoryIndex, sign] = determinePosition(note.tune, 0);
            let noteDom = <HTMLCanvasElement>$('<div class="noteDom noteCanvas"></div>')
                .attr('data-tune', note.tune)
                .attr('data-channel', note.channel)
                .attr('data-length', note.length)
                [0]
                ;
            noteDom.style.setProperty('--ivory-index', ivoryIndex + '');

            let guessedLength = Shmidusicator.guessLength(note.length);
            let [num, den] = [guessedLength.num(), guessedLength.den()];

            let dots = getDotCount(num);

            $(noteDom).append([
                $('<div class="signHolder"/>')
                    .attr('data-sign', sign),
                $('<div class="tupletDenominatorHolder"/>')
                    .attr('data-tuplet-denominator', den % 3 === 0 ? 3 : 1),
                $('<div class="noteHolder"/>')
                    .attr('data-clean-length', getCleanLength(num, den))
                    .append([
                        $('<div class="dotsHolder"/>')
                            .attr('data-dots', '.'.repeat(dots)),
                    ]),
            ]);

            $chord.append(noteDom);

            requestRecalcTacts();

            return noteDom;
        } else {
            return null;
        }
    };

    let changeNote = function(note: HTMLElement, property: string, value: string)
    {
        let $chordEl = $(note).parent();
        let wasPointed = $(note).hasClass('pointed');
        let noteData = extractNote(note);
        note.remove();
        (<any>noteData)[property] = value;
        let newNoteEl = addNoteToChord(noteData, $chordEl);
        if (wasPointed) {
            $(newNoteEl).addClass('pointed');
        }

        return noteData;
    };

    /** adds a chord element _at_ the index. or to the end, if index not provided */
    /** @unused */
    let addChord = function(chord: Ds.IShmidusicChord): number
    {
        let index = $chordListCont.find('.focused').index() + 1;

        let $chord = $('<span class="chordSpan"></span>')
            .append($('<span class="tactNumberCont"></span>'))
            .append(Tls.digt(chord.startState || {})
                .toList((state, chan) => $('<div class="transitionState start"/>')
                    .attr('data-channel', chan)
                    .attr('data-pitch-bend', state.pitchBend)
                    .attr('data-volume', state.volume)
                ).s)
            .append(Tls.digt(chord.finishState || {})
                .toList((state, chan) => $('<div class="transitionState finish"/>')
                    .attr('data-channel', chan)
                    .attr('data-pitch-bend', state.pitchBend)
                    .attr('data-volume', state.volume)
                ).s)
            ;

        chord.noteList.forEach(n => addNoteToChord(n, $chord));

        if (index <= 0) {
            $chordListCont.prepend($chord);
        } else if (index >= $chordListCont.find(' > .chordSpan').length) {
            $chordListCont.append($chord);
        } else {
            $chordListCont.find(' > .chordSpan:eq(' + index + ')').before($chord);
        }

        $chord.click(() => {
            $chordListCont.find('.focused').removeClass('focused');
            $chord.addClass('focused');
        });

        return setChordFocus(index);
    };

    /** adds a note to the chord element _at_ the index. or to the end, if index not provided */
    let addNote = function(note: Ds.IShNote, inNewChord: boolean): void
    {
        if (!inNewChord || $chordListCont.find('.focused .pointed').length) {
            addNoteToChord(note, $chordListCont.find('.focused'));
        } else {
            addChord({noteList: [note]});
        }
    };

    /** @return the focused index after applying bounds */
    let deleteFocused = function(backspace: boolean): void
    {
        if (!$chordListCont.find('.focused .pointed').remove().length) {
            let chordIndex = $chordListCont.find('.focused').index();
            $chordListCont.find('.focused').remove();

            backspace && --chordIndex;
            setChordFocus(chordIndex);
        }
        requestRecalcTacts();
    };

    let flattenOpts = <T>(opts: IOpt<T>[]): IOpt<T[]> =>
        opts.every(o => o.has())
            ? Opt(opts.map(o => o.def(null)))
            : Opt(null);

    // i'm sorry
    let mult = (num: number, den: number, factor: number) => {
        let dots = getDotCount(num);
        if (dots > 0 && (factor === 2/3 || factor === 1.5)) {
            dots += factor === 1.5 ? 1 : -1;
            return setDotCount(num, den, dots);
        } else {
            return num * factor / den;
        }
    };

    let multiplyLength = function(factor: number)
    {
        let $chord = $chordListCont.find('.focused');
        let noteDom = $chord.find('.pointed')[0];
        let noteDoms = noteDom ? [noteDom] : $chord.children('.noteDom').toArray();

        let noteMaybes = noteDoms
            .map(extractNote)
            .map(Adp.Note);

        flattenOpts(noteMaybes)
            .err(() => log('some of notes have invalid length', noteMaybes))
            .els = notes => {
                let foreseen = notes.map(n => mult(n.num(), n.den(), factor));
                if (foreseen.every(Shmidusicator.isValidLength)) {
                    Tls.list(notes).forEach = (n, i) =>
                        changeNote(noteDoms[i], 'length', mult(n.num(), n.den(), factor) + '');

                    requestRecalcTacts();
                } else {
                    log('one of notes will surpass bounds if multiplied', foreseen);
                }
            };
    };

    let setChannel = function(ch: number): IShNote[]
    {
        ch = Math.max(0, Math.min(15, ch));

        let $chord = $chordListCont.find('.focused'),
            note: HTMLElement;

        if (note = <HTMLCanvasElement>$chordListCont.find('.focused .pointed')[0]) {
            // change channel of the note
            if (!$chord.find('.noteCanvas[data-channel="' + ch + '"][data-tune="' + $(note).attr('data-tune') + '"]').length) {
                return [changeNote(note, 'channel', ch + '')];
            }
        } else {
            // focus the ch-th note in chord
        }

        return [];
    };

    let chordsPerRow = () => ($chordListCont.width() / canvaser.getChordWidth()) | 0;

    let getChordList = () => $chordListCont.find(' > .chordSpan').toArray().map(SongAccess.extractChord);

    let getFocusedNotes = () => $chordListCont.find('.focused .pointed').length
        ? $chordListCont.find('.focused .pointed').toArray().map(canvaser.extractNote)
        : $chordListCont.find('.focused .noteCanvas').toArray().map(canvaser.extractNote);

    configCont.onchange = requestRecalcTacts;

    return {
        setNoteFocus: setNoteFocus,
        setChordFocus: setChordFocus,
        moveChordFocus: (sign: number) =>
            setChordFocus($chordListCont.find('.focused').index() + sign),
        moveChordFocusRow: (sign: number) => {
            let index = $chordListCont.find('.focused').index() + sign * chordsPerRow();
            if (index > -1 && index < $chordListCont.find(' > .chordSpan').length) {
                setChordFocus(index);
            }
        },
        pointNextNote: pointNextNote,

        setChannel: setChannel,
        multiplyLength: multiplyLength,
        deleteFocused: deleteFocused,
        addChord: addChord,
        addNote: addNote,
        clear: () => $chordListCont.empty(),

        getFocusIndex: () => $chordListCont.find('.focused').index(),
        getChordList: getChordList,
        getFocusedNotes: getFocusedNotes,
    };
};