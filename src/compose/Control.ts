/// <reference path="../references.ts" />
/// <reference path="./Shmidusicator.ts" />

// this object provides some shortcut methods
// to edit content of Painter.ts

import * as Ds from "../DataStructures";
import Shmidusicator from "./Shmidusicator";
import {determinePosition, SongAccess, extractNote, CanvasProvider} from "./Painter";
import {TactMeasurer} from "./Painter";
import {IShNote} from "../DataStructures";

export function Control($chordListCont: JQuery, configCont: HTMLElement)
{
    var canvaser = CanvasProvider(3);

    var $parentEl = $chordListCont.parent();
    var chordListCont = $chordListCont[0];

    var scrollToIfNeeded = function(chordEl: HTMLElement)
    {
        /** @TODO: it does not work */

        var chordRect = chordEl.getBoundingClientRect();
        var scrollPaneRect = $parentEl[0].getBoundingClientRect(); 

        var isVisible = chordRect.top >= scrollPaneRect.top &&
            chordRect.bottom <= (window.innerHeight || document.documentElement.clientHeight);

        if (!isVisible) {
            var top = $(chordEl).offset().top -
                $parentEl.offset().top +
                $parentEl.scrollTop();

            $parentEl.scrollTop(top);
        }
    };

    var isHighlyLoaded = function()
    {
        return chordListCont.childNodes.length > 1000;
    };

    /** @return the focused index after applying bounds */
    var setChordFocus = function(index: number): number
    {
        var $chords = $chordListCont.find(' > .chordSpan');
        index = Math.min($chords.length - 1, Math.max(-1, index));

        var chord = $chords[index];
        chord && scrollToIfNeeded(chord);

        $chordListCont.find('.focused .pointed').removeClass('pointed');
        $chordListCont.find(' > .chordSpan.focused').removeClass('focused');
        $(chord).addClass('focused');

        return index;
    };

    var setNoteFocus = function(sem: number, chan: number, velocity: number, chordIndex: number)
    {
        var perform = function() {
            var chord = $chordListCont.find(' > .chordSpan')[chordIndex];
            chord && scrollToIfNeeded(chord);

            setChordFocus(chordIndex);

            var $note = $(chord).find('.noteCanvas[data-tune="' + sem + '"][data-channel="' + chan + '"]');
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
    var pointNextNote = function(): Ds.IShNote[]
    {
        var getOrder = (note: any) =>
            + +$(note).attr('data-tune') * 16
            + +$(note).attr('data-channel');

        var notes = $chordListCont.find('.focused .noteCanvas').toArray()
            .sort((a,b) => getOrder(a) - getOrder(b));

        var pointed = $chordListCont.find('.focused .pointed')[0];
        var index = pointed ? notes.indexOf(pointed) + 1 : 0;

        $chordListCont.find('.pointed').removeClass('pointed');
        if (index < notes.length) {
            $(notes[index]).addClass('pointed');
            return [canvaser.extractNote(notes[index])];
        }

        return [];
    };

    var recalcTacts = function()
    {
        var tactSize = $(configCont).find('.holder.tactSize').val() || 1.0;

        $chordListCont.find('.tactNumberCont').html('&nbsp;');
        $chordListCont.find(' > .chordSpan')
            .removeClass('tactFinisher')
            .removeClass('doesNotFitIntoTact')
            .removeAttr('data-rest');

        var tacter = TactMeasurer(tactSize);
        var $chords = $chordListCont.find(' > .chordSpan').toArray().map(c => $(c));

        $chords.forEach(($span: JQuery) =>
        {
            var chordLength = $span.find('.noteCanvas').toArray()
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

    var tactRecalcRequested = false;
    var requestRecalcTacts = () => {
        if (!tactRecalcRequested) {
            tactRecalcRequested = true;
            setTimeout(() => {
                tactRecalcRequested = false;
                recalcTacts();
            }, 1000);
        }
    };

    var getDotCount = (numerator: number) => (<any>Math).log2(+numerator + 1) - 1;

    var addNoteToChord = function(note: IShNote, $chord: JQuery): HTMLElement
    {
        var selector = '.noteCanvas' +
            '[data-tune="' + note.tune + '"]' +
            '[data-channel="' + note.channel + '"]';

        if ($chord.children(selector).length === 0) {
            var [ivoryIndex, sign] = determinePosition(note.tune, 0);
            var noteDom = <HTMLCanvasElement>$('<div class="noteDom noteCanvas"></div>')
                .attr('data-tune', note.tune)
                .attr('data-channel', note.channel)
                .attr('data-length', note.length)
                [0]
                ;
            noteDom.style.setProperty('--ivory-index', ivoryIndex + '');

            var guessedLength = Shmidusicator.guessLength(note.length);
            var [num, den] = [guessedLength.num(), guessedLength.den()];
            if (den % 3 === 0) {
                den /= 3;
                var tupletDenominator = 3;
            } else {
                var tupletDenominator = 1;
            }

            var dots = getDotCount(num);

            $(noteDom).append([
                $('<div class="signHolder"/>')
                    .attr('data-sign', sign),
                $('<div class="tupletDenominatorHolder"/>')
                    .attr('data-tuplet-denominator', tupletDenominator),
                $('<div class="noteHolder"/>')
                    .attr('data-clean-length', (1 + dots) / den)
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

    var changeNote = function(note: HTMLCanvasElement, property: string, value: string)
    {
        var $chordEl = $(note).parent();
        var wasPointed = $(note).hasClass('pointed');
        var noteData = extractNote(note);
        note.remove();
        (<any>noteData)[property] = value;
        var newNoteEl = addNoteToChord(noteData, $chordEl);
        if (wasPointed) {
            $(newNoteEl).addClass('pointed');
        }

        return noteData;
    };

    /** adds a chord element _at_ the index. or to the end, if index not provided */
    /** @unused */
    var addChord = function(chord: Ds.IShmidusicChord): number
    {
        var index = $chordListCont.find('.focused').index() + 1;

        var $chord = $('<span class="chordSpan"></span>')
            .append($('<span class="tactNumberCont"></span>'));

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
    var addNote = function(note: Ds.IShNote, inNewChord: boolean): void
    {
        if (!inNewChord || $chordListCont.find('.focused .pointed').length) {
            addNoteToChord(note, $chordListCont.find('.focused'));
        } else {
            addChord({noteList: [note]});
        }
    };

    /** @return the focused index after applying bounds */
    var deleteFocused = function(backspace: boolean): void
    {
        if (!$chordListCont.find('.focused .pointed').remove().length) {
            var chordIndex = $chordListCont.find('.focused').index();
            $chordListCont.find('.focused').remove();

            backspace && --chordIndex;
            setChordFocus(chordIndex);
        }
        requestRecalcTacts();
    };

    var multiplyNoteLength = (note: HTMLCanvasElement, factor: number) =>
        changeNote(note, 'length', +$(note).attr('data-length') * factor + '');

    var multiplyLength = function(factor: number)
    {
        var okLength = (n: HTMLCanvasElement) => Shmidusicator.isValidLength(+$(n).attr('data-length') * factor);

        var $chord = $chordListCont.find('.focused'),
            note: HTMLCanvasElement;

        if (note = <HTMLCanvasElement>$chord.find('.pointed')[0]) {
            okLength(note) &&
            multiplyNoteLength(note, factor);
        } else {
            var notes = $chord.children('.noteCanvas').toArray();
            notes.every(okLength) &&
            notes.forEach(n => multiplyNoteLength(n, factor));
        }

        requestRecalcTacts();
    };

    var setChannel = function(ch: number): IShNote[]
    {
        ch = Math.max(0, Math.min(15, ch));

        var $chord = $chordListCont.find('.focused'),
            note: HTMLCanvasElement;

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

    var chordsPerRow = () => ($chordListCont.width() / canvaser.getChordWidth()) | 0;

    var getChordList = () => $chordListCont.find(' > .chordSpan').toArray().map(SongAccess.extractChord);

    var getFocusedNotes = () => $chordListCont.find('.focused .pointed').length
        ? $chordListCont.find('.focused .pointed').toArray().map(canvaser.extractNote)
        : $chordListCont.find('.focused .noteCanvas').toArray().map(canvaser.extractNote);

    configCont.onchange = requestRecalcTacts;

    return {
        setNoteFocus: setNoteFocus,
        setChordFocus: setChordFocus,
        moveChordFocus: (sign: number) =>
            setChordFocus($chordListCont.find('.focused').index() + sign),
        moveChordFocusRow: (sign: number) => {
            var index = $chordListCont.find('.focused').index() + sign * chordsPerRow();
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