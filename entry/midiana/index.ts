/// <reference path="../../src/references.ts" />

import {ComposeGui} from "./ComposeGui";

const whenComposeActions = import("./ComposeActions");
import ComposePlayback from "./ComposePlayback";
import {Tls} from "../../src/utils/Tls";
import SfAdapter from '../../src/js/sfplayerjs/SfAdapter.js';

import('./moduleThatPrintsToConsole').then((pidorMod) => {
    console.log('guzno module 1', pidorMod);
});
import('./moduleThatPrintsToConsole').then((pidorMod) => {
    console.log('guzno module 2', pidorMod);
});

/**
 * this function binds some events: midi/mouse/keyboard to the
 * SheetMusicPainter in other words, it allows to write the sheet music
 */
const index = async ({
    cont, whenSfBuffer,
}: {
    cont: HTMLDivElement,
    whenSfBuffer: Promise<ArrayBuffer>,
}) => {
    const sf3Adapter = await whenSfBuffer.then(async sfBuffer => {
        return SfAdapter(sfBuffer, Tls.audioCtx, true);
    });
    let gui = ComposeGui(cont, sf3Adapter);
    let painter = gui.painter;
    let configCont = gui.configCont;

    let control = painter.getControl();
    const ComposeActions = (await whenComposeActions).default;
    const composeActions = ComposeActions({
        control, synthSwitch: gui.synthSwitch,
        configCont, painter, gui,
    });
    const composePlayback = ComposePlayback({
        gui, control, composeActions,
    });
    const MEventMapping = await import('./EventMapping');

    const main = async () => {
        MEventMapping.default({
            control, gui, composeActions,
            painter, composePlayback,
        });
        whenSfBuffer;
    };
    import('./moduleThatPrintsToConsole').then((pidorMod) => {
        console.log('guzno module 3', pidorMod);
    });
    import('./stuff/doStuff').then(stuffModule => {
        console.log('stuff module result', stuffModule);
    });

    return main();
};

export default index;
