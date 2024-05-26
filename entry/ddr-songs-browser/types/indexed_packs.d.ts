

export type Song = {
  "songName": "VerTex^2",
  "headers": {
    "MUSIC": "VerTex^2.ogg",
    "OFFSET": "0.007",
    "SAMPLESTART": "40.980",
    "SAMPLELENGTH": "12.800",
    "SELECTABLE": "YES",
    "TITLE"?: "VerTex²",
    "SUBTITLE"?: "[NATEBAT]",
    "ARTIST"?: "ZiGZaG",
    "BANNER"?: "VerTex^2-bn.png",
    "BACKGROUND"?: "VerTex^2-bg.png",
    "CDTITLE"?: "./CDTITLES/BEATMANIA IIDX.PNG",
  },
  "smFileName": "VerTex^2.sm",
  "smMd5": "89ea424ff6756b18d1a2368eabb2637f",
  "smModifiedAt": "2011-03-14T12:11:12.000Z",
  /** file names excluding .sm file and Thumbs.db */
  "restFileNames": ["VerTex^2-bg.png","VerTex^2.dwi","VerTex^2.ogg","VerTex^2.png"],
  "totalBars": 129,
  "charts": [
    {"desc":"K. Ward","diff":"Easy","meter":"9","totalSteps":485},
    {"type":"dance-double","desc":"M. Emirzian","diff":"Easy","meter":"5","totalSteps":233},
    {"type":"dance-double","desc":"M. Emirzian","diff":"Hard","meter":"10","totalSteps":607},
    {"type":"dance-double","desc":"M. Emirzian","diff":"Medium","meter":"8","totalSteps":380},
    {"type":"dance-double","desc":"M. Emirzian","diff":"Challenge","meter":"13","totalSteps":820},
    {"desc":"Copied from K. Ward","diff":"Medium","meter":"11","totalSteps":709},
    {"desc":"Copied from","diff":"Hard","meter":"14","totalSteps":944}
  ],
  "format"?: undefined,
};

export type AnyFormatSong = Song | {
    "format":"MISSING_SM_FILE",
    "songName":"I Run (So Far Away) (Gareth Emery Remix)",
    "fileNames":[],
}

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