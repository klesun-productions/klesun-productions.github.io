/// <reference path="../references.ts" />

import {Dom} from "../utils/Dom";
import {S} from "../utils/S";
/**
 * provides handy access to user inputs from code
 */
export let GrabGui = function(guiCont: HTMLElement)
{
    let $$ = (s: string, root?: Element) => <HTMLElement[]>[...(root || guiCont).querySelectorAll(s)];

    let fallbackMaxWorkers = 2;
    let maxWorkersInput = S.opt(Dom.get().input('input#maxWorkers')[0]);

    return {
        get maxWorkers() {
            return maxWorkersInput
                .map(s => +s.value)
                .def(fallbackMaxWorkers);
        },
        set maxWorkers(value: number) {
            maxWorkersInput
                .err(() => fallbackMaxWorkers = value)
                .els = dom => dom.value = ''+value;
        },
        set maxWorkersChanged(cb: (v: number) => void) {
            maxWorkersInput.get = dom => dom.oninput = () => cb(+dom.value);
        },

        set statusText(msg: string) {
            S.opt(Dom.get(guiCont).textarea('#outputContainer')[0])
                .err(() => console.log('%% Fallback Grab status: ' + msg))
                .els = dom => dom.innerHTML = msg;
        },
    };
};