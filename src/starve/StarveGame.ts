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

    let shuffle = function<T>(elmts: T[])
    {
        for (let i = 0; i < elmts.length; ++i) {
            let rnd = Math.random() * elmts.length | 0;
            [elmts[i], elmts[rnd]] = [elmts[rnd], elmts[i]];
        }
        return elmts;
    };

    let dictLoaded = function(
        easyWordSet: Set<string>,
        rareWordSet: Set<string>,
        synonymMap: Map<string, string>
    ) {
        let usedWords: string[] = [];
        let roundSeconds = 20;
        let sourceWord: string = null;
        let counterStartedAt: number = null;
        let livesLeft = 3;
        let happinessLevel = 0;

        let easyWordsByLetter = S.list(easyWordSet).groupByS(w => w[0]);
        let rareWordsByLetter = S.list(rareWordSet).groupByS(w => w[0]);

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
            if (happinessLevel > 0) {
                gui.main.classList.add('happy');
            } else {
                gui.main.classList.remove('happy');
            }
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
            let msg = sourceWord
                + '<br/>' + shuffle(easyWordsByLetter[sourceWord[0]]).slice(0, 5).join(', ')
                + '<br/>' + shuffle(rareWordsByLetter[sourceWord[0]]).slice(0, 5).join(', ');

            Dom.showMessageDialog(msg).then = () => {
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

            if (typedWord.slice(0,1) !== sourceWord[0]) {
                Dom.showMessageDialog('Wrong letter, your word must start with "' + sourceWord[0] + '", but you typed "' + typedWord + '"')
                    .then = () => gui.foodNameInput.focus();
            } else {
                if (synonymMap.has(typedWord)) {
                    typedWord = synonymMap.get(typedWord);
                }
                let index = usedWords.indexOf(typedWord);

                if (index > 0) {
                    Dom.showMessageDialog('You already used word ' + typedWord +' in ' + index + '-th round!')
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
                    ++happinessLevel;
                    Tls.timeout(2.0).then = () => --happinessLevel;
                }
            }
        };

        gui.foodNameForm.onsubmit = e => {
            e.preventDefault();
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
        Tls.ajax('/tests/grabs/wiki_food_articles.json', 'GET', {}).then = food_article_opinions =>
        Tls.ajax('/tests/grabs/wiki_food_synonims.json', 'GET', {}).then = wiki_redirects =>
        Tls.ajax('/tests/grabs/dict_food_rus_eng.json', 'GET', {}).then = dict =>
        Tls.ajax('/tests/grabs/vkusnaya_i_zdorovaya_verified.json', 'GET', {}).then = recipeBook =>
        Tls.ajax('/tests/grabs/food_names.json', 'GET', {}).then = synonymBundles => {
            let rareWords = new Set([]);
            let easyWords = new Set(Object.keys(dict).filter(w => w.length > 1));
            let synonymMap: Map<string, string> = new Map();

            let norm = (s: string) => Tls.removeParentheses(s)[0].toLowerCase();

            for (let words of synonymBundles) {
                for (let word of words) {
                    easyWords.add(word.toLowerCase());
                }
            }

            for (let wordRec of recipeBook) {
                if (/^[а-яА-Я]/.test(wordRec.key) && !wordRec.isRareWord) {
                    easyWords.add(norm((wordRec.key)));
                } else {
                    rareWords.add(norm(wordRec.key));
                }

                for (let synonym of wordRec.synonyms || []) {
                    synonymMap.set(norm(synonym), norm(wordRec.key));
                }
            }

            for (let opinion of food_article_opinions) {
                if (opinion.food_relevance_score >= 7) {
                    easyWords.add(norm(opinion.title));
                } else if (opinion.food_relevance_score >= 4) {
                    rareWords.add(norm(opinion.title));
                }
            }

            for (let synonym in wiki_redirects) {
                let mainTitle = wiki_redirects[synonym];
                synonymMap.set(norm(synonym), norm(mainTitle));
            }

            dictLoaded(easyWords, rareWords, synonymMap);
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