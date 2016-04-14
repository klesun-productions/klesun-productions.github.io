
/// <reference path="../references.ts" />

// this object provides some shortcut methods
// to edit content of Painter.ts

var Ns = Ns || {};
Ns.Compose = Ns.Compose || {};

Ns.Compose.Control = function($chordListCont: JQuery, canvaser: ICanvasProvider): IControl
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
        var $chords = $chordListCont.children();
        index = Math.min($chords.length - 1, Math.max(-1, index));

        var chord = $chords[index];
        chord && scrollToIfNeeded(chord);

        $chordListCont.find('.focused .pointed').removeClass('pointed');
        $chordListCont.children('.focused').removeClass('focused');
        $(chord).addClass('focused');

        return index;
    };

    var setNoteFocus = function(note: IShNote, chordIndex: number)
    {
        var chord = $chordListCont.children()[chordIndex];
        chord && scrollToIfNeeded(chord);

        setChordFocus(chordIndex);

        var $note = $(chord).find('.noteCanvas[data-tune="' + note.tune + '"][data-channel="' + note.channel + '"]');
        $note.addClass('sounding');

        return () => { /*$(chord).removeClass('focused'); */$note.removeClass('sounding'); };
    };

    var pointNextNote = function(): void
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
        }
    };

    /** adds a chord element _at_ the index. or to the end, if index not provided */
    var addChord = function(chord: IShmidusicChord): number
    {
        var index = $chordListCont.find('.focused').index() + 1;
        var $chord = canvaser.makeChordSpan(chord);

        if (index <= 0) {
            $chordListCont.prepend($chord);
        } else if (index >= $chordListCont.children().length) {
            $chordListCont.append($chord);
        } else {
            $chordListCont.children(':eq(' + index + ')').before($chord);
        }

        return setChordFocus(index);
    };

    /** adds a note to the chord element _at_ the index. or to the end, if index not provided */
    var addNote = function(note: IShNote): void
    {
        var $chord = $chordListCont.find('.focused');

        var selector = '.noteCanvas' +
            '[data-tune="' + note.tune + '"]' +
            '[data-channel="' + note.channel + '"]';

        if ($chord.children(selector).length === 0) {
            $chord.append(canvaser.makeNoteCanvas(note));
        }
    };

    /** @return the focused index after applying bounds */
    var deleteChord = function(): number
    {
        var index = $chordListCont.find('.focused').index();
        $chordListCont.find('.focused').remove();

        return setChordFocus(index);
    };

    var multiplyLength = (factor: number) => $chordListCont
        .find('.focused .pointed')
        .toArray()
        .forEach((note: HTMLCanvasElement) =>
        {
            var length = +$(note).attr('data-length') * factor,
                channel = +$(note).attr('data-channel');

            $(note).attr('data-length', length);

            // TODO: проёбывается бемоль
            // TODO: границу надобно поставить, а то пользователь не видит когда делает длиннее 1/1 или короче 1/32

            note.getContext('2d').clearRect(0,0,note.width,note.height);
            note.getContext('2d').drawImage(canvaser.getNoteImage(length, channel), 0, 0);
        });

    return {
        setNoteFocus: setNoteFocus,
        setChordFocus: setChordFocus,
        moveChordFocus: (sign: number) =>
            setChordFocus($chordListCont.find('.focused').index() + sign),
        pointNextNote: pointNextNote,
        deleteChord: deleteChord,
        addChord: addChord,
        addNote: addNote,
        multiplyLength: multiplyLength,
    };
};

interface IControl {
    setNoteFocus: {(note: IShNote, chordIndex: number): void},
    setChordFocus: {(index: number): number},
    moveChordFocus: {(sign: number): number},
    pointNextNote: {(): void},
    deleteChord: {(): number},
    addChord: {(chord: IShmidusicChord): number},
    addNote: {(note: IShNote): void},
    multiplyLength: {(factor: number): void},
}