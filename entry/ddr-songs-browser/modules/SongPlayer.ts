import type { Song } from "../types/indexed_packs";
import Dom from "./utils/Dom.js";
import type { PlaySongParams } from "../types/SongPlayer";
import type { BpmUpdate, Measure, MeasureDivision } from "./YaSmParser";
import { NoteValue, YaSmParser, YaSmParserError } from "./YaSmParser";

function renderSmData(song: Song, songDirUrl: string) {
    const { TITLE, SUBTITLE, ARTIST, BANNER, BACKGROUND, CDTITLE, MUSIC, OFFSET, SAMPLESTART, SAMPLELENGTH, SELECTABLE, ...rest } = song.headers;
    const items = [];
    items.unshift(
        Dom("span", {}, TITLE ? " " + TITLE : ""),
        Dom("span", {}, SUBTITLE ? " " + SUBTITLE : ""),
        Dom("span", {}, ARTIST ? " by " + ARTIST : ""),
        Dom("span", {}, " " + song.smModifiedAt),
        Dom("span", {}, " " + song.smMd5),
        Dom("span", {}, JSON.stringify(rest))
    );
    if (CDTITLE) {
        items.unshift(Dom("img", {
            src: songDirUrl + "/" + encodeURIComponent(CDTITLE),
        }));
    }
    if (BANNER) {
        items.unshift(Dom("img", {
            src: songDirUrl + "/" + encodeURIComponent(BANNER),
        }));
    }
    return items;
}

function beatsToMs(bpm: number, beats: number) {
    const minute = beats / bpm;
    return minute * 60 * 1000;
}

function getMsAt(allBpms: BpmUpdate[], measuresPassed: number) {
    const beatsPassed = measuresPassed * 4;
    const bpms = allBpms.filter(update => update.beat - beatsPassed < 0.000001);
    let msSkipped = 0;
    let beatsSkipped = 0;
    for (let i = 0; i < bpms.length - 1; ++i) {
        const intervalBeats = bpms[i + 1].beat - bpms[i].beat;
        msSkipped += beatsToMs(bpms[i].bpm, intervalBeats);
        beatsSkipped += intervalBeats;
    }
    const lastBpm = bpms[bpms.length - 1].bpm;
    return msSkipped + beatsToMs(lastBpm, beatsPassed - beatsSkipped);
}

function countApm(bpms: BpmUpdate[], measures: Measure[]) {
    const songDurationMs = getMsAt(bpms, measures.length + 1);
    const songDurationMinutes = songDurationMs / 1000 / 60;
    const actions = measures
        .flatMap(m => m)
        .flatMap(d => d)
        .filter(v => v !== NoteValue.NONE).length;
    return actions / songDurationMinutes;
}

const ARROW_FLY_SECONDS = 2;
const ARROW_TARGET_PROGRESS = 0.80;

export default function SongPlayer({ DATA_DIR_URL, gui }: {
    DATA_DIR_URL: string,
    gui: {
        active_song_player: HTMLAudioElement,
        active_song_details: HTMLElement,
        flying_arrows_box: HTMLElement,
    },
}) {
    let activePlaybackId = Symbol();

    const launchNote = (measureDivision: MeasureDivision, divisionIndex: number, divider: number) => {
        for (let column = 0; column < measureDivision.length; ++column) {
            const value = measureDivision[column];
            if (value !== "0") {
                const arrow = document.createElement("div");
                arrow.classList.toggle("flying-arrow", true);
                arrow.setAttribute("data-measure-progress", (divisionIndex / divider).toFixed(3));
                arrow.setAttribute("data-column", String(column));
                let displayValue = value;
                if (value === NoteValue.TAP) {
                    displayValue = {
                        0: "🡸",
                        1: "🡻",
                        2: "🡹",
                        3: "🡺",
                    }[column] ?? value;
                } else if (value === NoteValue.MINE) {
                    displayValue = "💣";
                }
                arrow.textContent = displayValue;
                arrow.style.left = (column + 1) * 60 + "px";
                arrow.style.animationDuration = ARROW_FLY_SECONDS + "s";
                gui.flying_arrows_box.appendChild(arrow);
                setTimeout(() => arrow.remove(), ARROW_FLY_SECONDS * 1000);
            }
        }
    };

    const playSong = async ({ pack, song }: PlaySongParams) => {
        const playbackId = Symbol();
        activePlaybackId = playbackId;
        const packSubdirUrl = DATA_DIR_URL + "/packs/" +
            encodeURIComponent(pack.packName) + "/" +
            encodeURIComponent(pack.subdir);
        const songDirUrl = packSubdirUrl + "/" +
            encodeURIComponent(song.songName);

        const errorHolder = Dom("span", { style: "color: red" });
        const fileNames = !song.format ? song.restFileNames : song.fileNames;
        const songFileName = !song.format && fileNames.find(n => n.toLowerCase() === song.headers.MUSIC.toLowerCase()) ||
            fileNames.find(n => n.match(/\.(ogg|wav|mp3|acc)$/i));
        if (!songFileName) {
            errorHolder.textContent = "Missing song file in " + fileNames.join(", ");
        } else {
            gui.active_song_player.src = songDirUrl + "/" + encodeURIComponent(songFileName);
            gui.active_song_player.play();
        }
        // if (!song.format && song.headers.SAMPLESTART) {
        //     gui.active_song_player.currentTime = +song.headers.SAMPLESTART;
        // }

        gui.active_song_details.innerHTML = "";
        const detailsItemList = Dom("div", { class: "song-details-item-list" }, [errorHolder]);
        gui.active_song_details.appendChild(
            detailsItemList
        );
        if (pack.imgFileName) {
            detailsItemList.prepend(Dom("img", {
                src: packSubdirUrl +
                    encodeURIComponent(pack.imgFileName),
            }));
        }

        if (song.format) {
            return;
        }

        const items = renderSmData(song, songDirUrl);
        detailsItemList.append(...items);
        const { BACKGROUND } = song.headers;
        const bgFileName = BACKGROUND && song.restFileNames.find(n => n.toLowerCase() === BACKGROUND.toLowerCase()) ||
            song.restFileNames.find(n => n.match(/bg.*\.(png|jpe?g|bmp)/i));
        document.body.style.backgroundImage = !bgFileName ? "none" :
            "url(\"" + songDirUrl + "/" + encodeURIComponent(bgFileName) + "\")";

        const smText = await fetch(songDirUrl + "/" + encodeURIComponent(song.smFileName))
            .then(rs => rs.text());
        let parsed;
        try {
            parsed = YaSmParser(smText);
        } catch (error) {
            if (error instanceof YaSmParserError) {
                console.warn("Failed to parse .sm file: " + error.message);
                console.info(error.parsed);
                return;
            } else {
                throw error;
            }
        }
        console.log("YaSmParse result", parsed);
        if (parsed.NOTES.length === 0 ||
            parsed.BPMS.length === 0
        ) {
            return;
        }

        const { BPMS } = parsed;
        const TARGET_APM = 150;
        const chart = [...parsed.NOTES]
            .filter(c => countApm(BPMS, c.MEASURES) > 0)
            .filter(c => c.MEASURES.every(m => m.every(d => d.length < 5)))
            .sort((a,b) => {
                const aTpm = countApm(BPMS, a.MEASURES);
                const bTpm = countApm(BPMS, b.MEASURES);
                return Math.abs(aTpm - TARGET_APM) - Math.abs(bTpm - TARGET_APM);
            })[0];
        if (!chart) {
            console.log("no 4-button charts");
            return;
        }
        console.log("playing chart of APM " + countApm(BPMS, chart.MEASURES), chart);
        const firstBeatMs = -(parsed.OFFSET ?? 0) * 1000 - 1000 * ARROW_FLY_SECONDS * ARROW_TARGET_PROGRESS;
        for (let measureIndex = 0; measureIndex < chart.MEASURES.length; ++measureIndex) {
            const measure = chart.MEASURES[measureIndex];
            const divider = measure.length;
            for (let divisionIndex = 0; divisionIndex < measure.length; ++divisionIndex) {
                const division = measure[divisionIndex];
                const expectedMs = firstBeatMs + getMsAt(
                    BPMS,
                    measureIndex + divisionIndex / divider
                );
                const waitMs = expectedMs - gui.active_song_player.currentTime * 1000;
                if (waitMs >= 4) {
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                }
                if (playbackId !== activePlaybackId) {
                    return;
                }
                launchNote(division, divisionIndex, divider);
            }
        }
    };

    return { playSong };
};