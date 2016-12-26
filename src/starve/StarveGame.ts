/// <reference path="../references.ts" />

import {Tls} from "../utils/Tls";
import {S} from "../utils/S";
import {Dom} from "../utils/Dom";
import {ServApi} from "../utils/ServApi";
import {StarveGui} from "./StarveGui";

/**
 * this is mapping from entry page to code
 */
export let StarveGame = function(mainCont: HTMLElement)
{
    let ajax = function (url: string, restMethod: string, params: {[k: string]: any}) {
        let result = {then: (data: any) => {}};
        var http = new XMLHttpRequest();
        http.open(restMethod, url, true);
        http.responseType = 'json';
        http.setRequestHeader('Content-Type', 'application/json;UTF-8');
        http.onload = () => result.then(http.response);
        http.send(restMethod === 'POST' ? JSON.stringify(params) : null);
        return result;
    };

    let gui = StarveGui(mainCont);

    let audioCtx = Tls.audioCtx;
    let eatingSfx: AudioBuffer = null;
    let brokenGlassSfx: AudioBuffer = null;
    Tls.getAudioBuffer(
        '/unversioned/imagesFromWeb/watermelon_eating_sound.ogg',
        (b) => eatingSfx = b
    );
    Tls.getAudioBuffer(
        '/unversioned/imagesFromWeb/broken_glass.ogg',
        (b) => brokenGlassSfx = b
    );

    let dictLoaded = function(easyWordSet: Set<string>, rareWordSet: Set<string>)
    {
        let usedWords: string[] = [];
        let roundSeconds = 30;
        let sourceWord: string = null;
        let counterStartedAt: number = null;
        let livesLeft = 3;

        let playSfx = function(sfx: AudioBuffer, pitchFactor: number)
        {
            let gainNode = audioCtx.createGain();
            gainNode.gain.value = 0.15;
            gainNode.connect(audioCtx.destination);

            let audioSrc = audioCtx.createBufferSource();
            audioSrc.buffer = sfx;
            audioSrc.playbackRate.value = pitchFactor;
            audioSrc.connect(gainNode);
            audioSrc.start();
        };

        let playEatingSfx = () =>  eatingSfx && playSfx(eatingSfx, 0.75 + Math.random() * 2);
        let playBrokenGlassSfx = () =>  brokenGlassSfx && playSfx(brokenGlassSfx, 0.75 + Math.random() / 2);

        let updateNumbers = function()
        {
            let secondsLeft = roundSeconds - (window.performance.now() - counterStartedAt) / 1000;
            gui.foodLetterHolder.innerHTML = sourceWord[0].toUpperCase();
            gui.secondsLeftHolder.innerHTML = (secondsLeft | 0) + '';
            gui.livesLeftHolder.innerHTML = livesLeft + '';
            gui.timeLeftProgress.value = secondsLeft / roundSeconds;
            return secondsLeft;
        };

        let resetCounter = function()
        {
            let optionList = [...easyWordSet];
            let rnd = Math.random() * optionList.length | 0;
            sourceWord = optionList[rnd];
            counterStartedAt = window.performance.now();
            updateNumbers();
            gui.foodNameInput.setAttribute('placeholder', sourceWord[0].toUpperCase() + '...');
            gui.foodNameInput.value = '';
            gui.foodNameInput.focus();
        };

        let loseLife = function()
        {
            if (counterStartedAt === null) return;

            playBrokenGlassSfx();
            usedWords.push(sourceWord);
            easyWordSet.delete(sourceWord);
            rareWordSet.delete(sourceWord);
            --livesLeft;
            counterStartedAt = null;
            Dom.showMessageDialog(sourceWord).then = () => {
                if (livesLeft > 0) {
                    resetCounter();
                    if (livesLeft === 1) {
                        gui.main.classList.add('last-life');
                    }
                } else {
                    gui.gamePlayAudio.pause();
                    gui.gameOverAudio.play();
                    gui.main.className += ' game-over';
                    let msg = 'Game Over. Congrats, you guessed ' + usedWords.length + ' words. Enter your nick-name for high-scores: ';
                    Dom.showInputDialog(msg, 'anonymous').then = playerName =>
                        ServApi.submit_starve_game_score({playerName: playerName, guessedWords: usedWords});
                }
            };
        };

        let onFrame = function()
        {
            if (counterStartedAt === null) return;

            let secondsLeft = updateNumbers();
            if (secondsLeft < 0) {
                loseLife();
            }
        };

        let validateWord = function(typedWord: string)
        {
            if (livesLeft < 1) return;

            let index = usedWords.indexOf(typedWord);
            if (typedWord.slice(0,1) !== sourceWord[0]) {
                Dom.showMessageDialog('Wrong letter, your word must start with "' + sourceWord[0] + '"')
                    .then = () => gui.foodNameInput.focus();
            } else if (index > 0) {
                Dom.showMessageDialog('You already used this word in ' + index + '-th round!')
                    .then = () => gui.foodNameInput.focus();
            } else if (!easyWordSet.has(typedWord) && !rareWordSet.has(typedWord)) {
                Dom.showMessageDialog('I don\'t know such food: "' + typedWord + '"')
                    .then = () => gui.foodNameInput.focus();
            } else {
                usedWords.push(typedWord);
                easyWordSet.delete(typedWord);
                rareWordSet.delete(typedWord);
                resetCounter();
                playEatingSfx();
            }
        };

        gui.foodNameForm.onsubmit = e => {
            e.preventDefault();
            // TODO: map latin characters to russian instantly, cuz it's really annoying to switch layout
            validateWord(gui.foodNameInput.value.toLowerCase());
        };

        gui.skipWordButton.onclick = loseLife;

        gui.startGameButton.onclick = () => {
            gui.main.className += ' game-started';
            setInterval(onFrame, 40);
            gui.gamePlayAudio.play();
            resetCounter();
        };

        gui.main.className += ' dict-loaded';
    };

    let main = function()
    {
        ajax('/tests/grabs/dict_food_rus_eng.json', 'GET', {}).then = dict =>
        ajax('/tests/grabs/vkusnaya_i_zdorovaya_verified.json', 'GET', {}).then = recipeBook =>
        ajax('/tests/grabs/food_names.json', 'GET', {}).then = synonymBundles => {
            let rareWords = new Set([]);
            let easyWords = new Set(Object.keys(dict).filter(w => w.length > 1));
            for (let words of synonymBundles) {
                for (let word of words) {
                    easyWords.add(word.toLowerCase());
                }
            }

            for (let wordRec of recipeBook) {
                // TODO: treat as synonyms instead of as separate words
                for (let word of (wordRec.synonyms || []).concat([wordRec.key])) {
                    if (/^[а-яА-Я]/.test(word) && !wordRec.isRareWord) {
                        easyWords.add(word.toLowerCase());
                    } else {
                        rareWords.add(word.toLowerCase());
                    }
                }
            }

            dictLoaded(easyWords, rareWords);
        };

        ServApi.get_starve_game_high_scores = highScores => {
            gui.highScoreTbody.innerHTML = '';
            let i = 1;
            S.list(highScores).sort(a => -a.score).slice(0, 5).forEach =
                record => gui.highScoreTbody.appendChild(Dom.mk.tr({
                    children: [
                        Dom.mk.td({innerHTML: i++ + ''}),
                        Dom.mk.td({innerHTML: record.playerName}),
                        Dom.mk.td({innerHTML: record.score + ''}),
                        Dom.mk.td({innerHTML: record.guessedWords, className: 'guessed-words'}),
                    ],
                }).s);
        };
    };

    main();
};