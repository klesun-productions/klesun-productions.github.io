/// <reference path="../references.ts" />

import {Tls} from "../utils/Tls";
export let StarveGui = function(mainCont: HTMLElement)
{
    let $$ = (s: string) => <HTMLElement[]>[...mainCont.querySelectorAll(s)];

    let cyrillicByLatin: {[k: string]: string} = {
        '`': 'ё',
        'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з', '[' : 'х', ']': 'ъ',
        'a': 'ф', 's': 'ы', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д', ';': 'ж', '\'': 'э',
        'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь', ',': 'б', '.': 'ю',
    };

    let self = {
        main: mainCont,

        startGameButton: <HTMLButtonElement>$$('button.start-game')[0],
        highScoreTbody: $$('.high-scores-cont tbody')[0],
        gamePlayAudio: <HTMLAudioElement>$$('audio.game-play-bgm')[0],
        gameOverAudio: <HTMLAudioElement>$$('audio.game-over-bgm')[0],

        foodNameForm: <HTMLFormElement>$$('form.type-word-starting-with')[0],
        foodNameInput: <HTMLInputElement>$$('input.food-name')[0],
        skipWordButton: <HTMLButtonElement>$$('button.skip')[0],

        foodLetterHolder: $$('.food-letter-holder')[0],
        secondsLeftHolder: $$('.seconds-left-holder')[0],
        livesLeftHolder: $$('.lives-left-holder')[0],
        timeLeftProgress: <HTMLProgressElement>$$('progress.time-left')[0],
    };

    self.foodNameInput.oninput =
        () => self.foodNameInput.value = self.foodNameInput.value
            .split('')
            .map(l => cyrillicByLatin[l.toLowerCase()] || l)
            .join('');

    return self;
};
