import type { SmHeaders } from "../modules/YaSmParser";


export type Song = {
  "songName": "VerTex^2",
  "headers": Record<keyof SmHeaders, string>,
  "smFileName": "VerTex^2.sm",
  "smMd5": "89ea424ff6756b18d1a2368eabb2637f",
  "smModifiedAt": "2011-03-14T12:11:12.000Z",
  /** file names excluding .sm file and Thumbs.db */
  "restFileNames": ["VerTex^2-bg.png","VerTex^2.dwi","VerTex^2.ogg","VerTex^2.png"],
  "totalBars": 129,
  "charts": [
    { "desc":"K. Ward" | string,"diff":"Easy","meter":"9","totalSteps":485 },
    { "type":"dance-double","desc":"M. Emirzian","diff":"Easy","meter":"5","totalSteps":233 },
    { "type":"dance-double","desc":"M. Emirzian","diff":"Hard","meter":"10","totalSteps":607 },
    { "type":"dance-double","desc":"M. Emirzian","diff":"Medium","meter":"8","totalSteps":380 },
    { "type":"dance-double","desc":"M. Emirzian","diff":"Challenge","meter":"13","totalSteps":820 },
    { "desc":"Copied from K. Ward","diff":"Medium","meter":"11","totalSteps":709 },
    { "desc":"Copied from","diff":"Hard","meter":"14","totalSteps":944 }
  ],
  "format"?: undefined,
};

export type AnyFormatSong = Song | {
    "format":"MISSING_SM_FILE",
    "songName":"I Run (So Far Away) (Gareth Emery Remix)",
    "fileNames":[],
};

export type Pack = {
    packName: "DJKPack.zip",
    subdir: "DJKPack",
    subdirModifiedAt: "2016-09-26T18:04:36.000Z",
    imgFileName?: "DJKPack.png",
    songs: AnyFormatSong[],
    format?: undefined,
};

export type AnyFormatPack = Pack | {
    "format":"EMPTY_DIRECTORY",
    "packName":"DWI%20Extreme%20F%2004%20Full.zip",
};