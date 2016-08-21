/// <reference path="../references.ts" />
/// <reference path="./Shmidusicator.ts" />

// this object provides some shortcut methods
// to edit content of Painter.ts

import * as Ds from "../DataStructures";
import Shmidusicator from "./Shmidusicator";
import {ICanvasProvider} from "./Painter";
import {TactMeasurer} from "./Painter";

export function Control($chordListCont: JQuery, canvaser: ICanvasProvider, configCont: HTMLElement): IControl
{
    var $parentEl = $chordListCont.parent();

    var scrollToIfNeeded = function(chordEl: HTMLElement)
    {
        /** @TODO: it does not take into account window scroll prostion
         * scroll window heavily to the buttom and play, say, elfen lied */

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
        var chord = $chordListCont.find(' > .chordSpan')[chordIndex];
        chord && scrollToIfNeeded(chord);

        setChordFocus(chordIndex);

        var $note = $(chord).find('.noteCanvas[data-tune="' + sem + '"][data-channel="' + chan + '"]');
        $note.addClass('sounding');

        return () => { /*$(chord).removeClass('focused'); */$note.removeClass('sounding'); };
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
    }

    /** adds a chord element _at_ the index. or to the end, if index not provided */
    /** @unused */
    var addChord = function(chord: Ds.IShmidusicChord): number
    {
        var index = $chordListCont.find('.focused').index() + 1;
        var $chord = canvaser.makeChordSpan(chord);

        if (index <= 0) {
            $chordListCont.prepend($chord);
        } else if (index >= $chordListCont.find(' > .chordSpan').length) {
            $chordListCont.append($chord);
        } else {
            $chordListCont.find(' > .chordSpan:eq(' + index + ')').before($chord);
        }

        requestRecalcTacts();

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
            var $chord = $chordListCont.find('.focused');

            var selector = '.noteCanvas' +
                '[data-tune="' + note.tune + '"]' +
                '[data-channel="' + note.channel + '"]';

            if ($chord.children(selector).length === 0) {
                $chord.append(canvaser.makeNoteCanvas(note));
                requestRecalcTacts();
            }
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

    var changeNote = function(note: HTMLCanvasElement, property: string, value: string): void
    {
        $(note).attr('data-' + property, value);

        var newCanvas = canvaser.makeNoteCanvas(canvaser.extractNote(note));
        note.getContext('2d').clearRect(0,0,999999,999999);
        note.getContext('2d').drawImage(newCanvas, 0, 0);
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

    // TODO: make some sort of typed adapter to access note data attributes
    var setChannel = function(ch: number): void
    {
        ch = Math.max(0, Math.min(15, ch));

        var $chord = $chordListCont.find('.focused'),
            note: HTMLCanvasElement;

        if (note = <HTMLCanvasElement>$chordListCont.find('.focused .pointed')[0]) {
            // change channel of the note
            if (!$chord.find('.noteCanvas[data-channel="' + ch + '"][data-tune="' + $(note).attr('data-tune') + '"]').length) {
                changeNote(note, 'channel', ch + '');
            }
        } else {
            // focus the ch-th note in chord
        }
    };

    var chordsPerRow = () => ($chordListCont.width() / canvaser.getChordWidth()) | 0;

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
    };
};

export interface IControl {
    setNoteFocus: (sem: number, chan: number, velocity: number, chordIndex: number) => () => void,
    setChordFocus: {(index: number): number},
    moveChordFocus: {(sign: number): number},
    moveChordFocusRow: {(sign: number): void},
    pointNextNote: {(): Ds.IShNote[]},
    setChannel: {(ch: number): void},
    multiplyLength: {(factor: number): void},
    deleteFocused: {(backspace: boolean): void},
    addChord: {(chord: Ds.IShmidusicChord): number},
    addNote: {(note: Ds.IShNote, inNewChord: boolean): void},
    clear: {(): void},
    getFocusIndex: {(): number},
}