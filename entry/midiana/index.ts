/// <reference path="../../src/references.ts" />

import {ComposeGui} from "./ComposeGui";

import EventMapping from "./EventMapping";
import ComposeActions from "./ComposeActions";
import ComposePlayback from "./ComposePlayback";
import {Tls} from "../../src/utils/Tls";
import SfAdapter from '../../src/js/sfplayerjs/SfAdapter.js';

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
    const composeActions = ComposeActions({
        control, synthSwitch: gui.synthSwitch,
        configCont, painter, gui,
    });
    const composePlayback = ComposePlayback({
        gui, control, composeActions,
    });

    const loadFluid = async () => {
        let sfFluidUrl = 'https://dl.dropbox.com/s/dm2ocmb96nkl458/fluid.sf3?dl=0';
        const sfBuffer = await fetch(sfFluidUrl, {}).then(rs => rs.arrayBuffer());
        return SfAdapter(sfBuffer, Tls.audioCtx, true);
    };

    const main = async () => {
        EventMapping({
            control, gui, composeActions,
            painter, composePlayback,
        });
        whenSfBuffer;
    };

    return main();
};

export default index;
