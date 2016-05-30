
import {ISMFreaded} from "./player/Structurator";

// This is a global variable, that contains all classes
// It is intended to be used _only_ for debug
// Say, you press F12, open js console and wanna
// load soundfont info with SoundFontAdapter.ts - no problem!

declare var window: any;

export var Cls: any = window['Cls'] = {};