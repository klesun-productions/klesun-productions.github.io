/// <reference path="../../src/references.ts" />

import {ComposeGui} from "./ComposeGui";

import EventMapping from "./EventMapping";
import ComposeActions from "./ComposeActions";
import ComposePlayback from "./ComposePlayback";


/**
 * this function binds some events: midi/mouse/keyboard to the
 * SheetMusicPainter in other words, it allows to write the sheet music
 */
const index = (cont: HTMLDivElement) => {
    let gui = ComposeGui(cont);
    let painter = gui.painter;
    let configCont = gui.configCont;

    let control = painter.getControl();
    const composeActions = ComposeActions({
        control, synthSwitch: gui.synthSwitch,
        configCont, painter, gui,
    });
    const composePlayback = ComposePlayback({
        gui, control, composeActions,
    });

    const main = () => {
        EventMapping({
            control, gui, composeActions,
            painter, composePlayback,
        });
    };

    return main();
};

export default index;
