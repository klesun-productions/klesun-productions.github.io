import type { AnyFormatSong } from "../types/indexed_packs";
import type { BpmUpdate, Measure, MeasureDivision } from "./YaSmParser";
import { NoteValue, YaSmParser, YaSmParserError } from "./YaSmParser";
import type { GamepadStateEvent } from "./types";
import Dom from "./utils/Dom.js";

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

type LaunchedArrow = {
    buttonIndex: number,
    noteValue: NoteValue | string,
    targetTimestamp: DOMHighResTimeStamp,
    dom: HTMLElement,
    wasHit: boolean,
};

type ActivePlayback = {
    launchedArrows: Set<LaunchedArrow>,
    hitErrorMsSum: number,
    totalHits: number,
};

export function getBnFileName(song: AnyFormatSong) {
    const fileNames = !song.format ? song.restFileNames : song.fileNames;
    if (!song.format && song.headers.BANNER) {
        const found = song.restFileNames.find(n => n.toLowerCase() === song.headers.BANNER.toLowerCase());
        if (found) {
            return found;
        }
    }
    return fileNames.find(n => n.match(/bn.*\.(png|jpe?g|bmp)/i))
        ?? fileNames.find(n => n.toLowerCase().startsWith(song.songName.toLowerCase()) && n.match(/\.(png|jpe?g|bmp)/i));
}

export function getBgFileName(song: AnyFormatSong) {
    const fileNames = !song.format ? song.restFileNames : song.fileNames;
    if (!song.format && song.headers.BACKGROUND) {
        const found = song.restFileNames.find(n => n.toLowerCase() === song.headers.BACKGROUND.toLowerCase());
        if (found) {
            return found;
        }
    }
    return fileNames.find(n => n.match(/bg.*\.(png|jpe?g|bmp)/i));
}

export default function SongPlayer({ gui }: {
    gui: {
        active_song_player: HTMLAudioElement,
        current_song_difficulties_list: HTMLUListElement,
        flying_arrows_box: HTMLElement,
        hit_status_message_holder: HTMLElement,
        hit_mean_error_message_holder: HTMLElement,
        current_song_view_banner: HTMLImageElement,
        current_song_view_cdtitle: HTMLImageElement,
        current_song_view_title: HTMLElement,
        current_song_view_date: HTMLElement,
        current_song_view_artist: HTMLElement,
        current_song_error_message_holder: HTMLElement,
    },
}) {
    let activePlayback: null | ActivePlayback = null;

    const launchNote = (
        playback: ActivePlayback,
        measureDivision: MeasureDivision,
        targetTimestamp: DOMHighResTimeStamp,
        divisionIndex: number,
        divider: number
    ) => {
        for (let column = 0; column < measureDivision.length; ++column) {
            const value = measureDivision[column];
            if (value !== "0") {
                const dom = document.createElement("div");
                dom.classList.toggle("flying-arrow", true);
                dom.setAttribute("data-measure-progress", (divisionIndex / divider).toFixed(3));
                dom.setAttribute("data-column", String(column));
                let displayValue = value;
                if (value === NoteValue.TAP) {
                    displayValue = {
                        0: "🡸",
                        1: "🡺",
                        2: "🡹",
                        3: "🡻",
                    }[column] ?? value;
                } else if (value === NoteValue.MINE) {
                    displayValue = "💣";
                }
                dom.textContent = displayValue;
                const x = {
                    0: 0,
                    1: 3,
                    2: 2,
                    3: 1,
                }[column] ?? column;
                dom.style.left = (x + 1) * 60 + "px";
                // TODO: use targetTimestamp and https://developer.mozilla.org/en-US/docs/Web/API/Animation/startTime
                dom.style.animationDuration = ARROW_FLY_SECONDS + "s";
                gui.flying_arrows_box.appendChild(dom);
                const launchedArrow: LaunchedArrow = {
                    buttonIndex: column,
                    noteValue: value,
                    targetTimestamp: targetTimestamp,
                    dom: dom,
                    wasHit: false,
                };
                playback.launchedArrows.add(launchedArrow);
                setTimeout(() => {
                    if (!launchedArrow.wasHit) {
                        gui.hit_status_message_holder.textContent = "miss!";
                        gui.hit_status_message_holder.setAttribute("data-status-kind", "MISS");
                    }
                    playback.launchedArrows.delete(launchedArrow);
                    dom.remove();
                }, ARROW_FLY_SECONDS * 1000);
            }
        }
    };

    const playSong = async ({ packSubdirUrl, song }: { packSubdirUrl: string, song: AnyFormatSong }) => {
        const playback: ActivePlayback = {
            launchedArrows: new Set(),
            hitErrorMsSum: 0,
            totalHits: 0,
        };
        activePlayback = playback;
        console.log("ololo playing song", song);
        const songDirUrl = packSubdirUrl + "/" +
            encodeURIComponent(song.songName);

        const bnFileName = getBnFileName(song);
        gui.current_song_view_banner.src = bnFileName ? songDirUrl + "/" + encodeURIComponent(bnFileName) : "";
        gui.current_song_view_cdtitle.src = !song.format && song.headers.CDTITLE ? songDirUrl + "/" + encodeURIComponent(song.headers.CDTITLE) : "";
        gui.current_song_view_title.textContent = song.songName;
        gui.current_song_view_date.textContent = !song.format ? song.smModifiedAt.slice(0, 10) : "";
        gui.current_song_view_artist.textContent = !song.format && song.headers.ARTIST ? "by " + song.headers.ARTIST : "";
        gui.current_song_error_message_holder.textContent = "";
        gui.current_song_difficulties_list.innerHTML = "";

        const fileNames = !song.format ? song.restFileNames : song.fileNames;
        const songFileName = !song.format && fileNames.find(n => n.toLowerCase() === song.headers.MUSIC.toLowerCase()) ||
            fileNames.find(n => n.match(/\.(ogg|wav|mp3|acc)$/i));
        if (!songFileName) {
            gui.current_song_error_message_holder.textContent = "Missing song file in " + fileNames.join(", ");
        } else {
            gui.active_song_player.src = songDirUrl + "/" + encodeURIComponent(songFileName);
            gui.active_song_player.play();
        }
        // if (!song.format && song.headers.SAMPLESTART) {
        //     gui.active_song_player.currentTime = +song.headers.SAMPLESTART;
        // }

        const bgFileName = getBgFileName(song);
        document.body.style.backgroundImage = !bgFileName ? "none" :
            "url(\"" + songDirUrl + "/" + encodeURIComponent(bgFileName) + "\")";

        if (song.format) {
            return;
        }

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
        const charts = [...parsed.NOTES]
            .filter(c => countApm(BPMS, c.MEASURES) > 0)
            .sort((a,b) => {
                const aTpm = countApm(BPMS, a.MEASURES);
                const bTpm = countApm(BPMS, b.MEASURES);
                return Math.abs(aTpm - TARGET_APM) - Math.abs(bTpm - TARGET_APM);
            });
        const chart = charts
            .find(c => c.MEASURES.every(m => m.every(d => d.length < 5)));
        gui.current_song_difficulties_list.append(...charts.map(c => Dom("li", {
            class: c === chart ? "selected-chart" : "",
        }, [
            Dom("span", {}, countApm(BPMS, c.MEASURES).toFixed(1)),
            Dom("span", {}, " "),
            Dom("span", {}, c.DESCRIPTION + " " + c.DIFFICULTY + " " + c.METER),
            Dom("span", {}, " "),
            Dom("span", {}, "buttons: " + c.MEASURES.flatMap(m => m.map(d => d.length)).reduce((a,b) => Math.max(a, b), 0)),
        ])));
        if (!chart) {
            return;
        }

        console.log("playing chart of APM " + countApm(BPMS, chart.MEASURES), chart);
        const firstBeatMs = -(parsed.OFFSET ?? 0) * 1000 - 1000 * ARROW_FLY_SECONDS * ARROW_TARGET_PROGRESS;
        for (let measureIndex = 0; measureIndex < chart.MEASURES.length; ++measureIndex) {
            const measure = chart.MEASURES[measureIndex];
            const divider = measure.length;
            for (let divisionIndex = 0; divisionIndex < measure.length; ++divisionIndex) {
                const division = measure[divisionIndex];
                const expectedRelMs = firstBeatMs + getMsAt(
                    BPMS,
                    measureIndex + divisionIndex / divider
                );
                const songProgressMs = gui.active_song_player.currentTime * 1000;
                const waitMs = expectedRelMs - songProgressMs;
                const targetTimestamp = window.performance.now() + waitMs + 1000 * ARROW_FLY_SECONDS * ARROW_TARGET_PROGRESS;
                if (waitMs >= 4) {
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                } else if (waitMs <= -ARROW_FLY_SECONDS) {
                    continue; // song is ahead of arrows by several seconds: may happen if you fast-forward
                }
                if (playback !== activePlayback) {
                    return;
                }
                launchNote(playback, division, targetTimestamp, divisionIndex, divider);
            }
        }
    };

    const handleGamepadInput = (event: GamepadStateEvent) => {
        if (!activePlayback) {
            return;
        }
        const hitArrows: LaunchedArrow[] = [];
        for (const change of event.changes) {
            const firstArrow = [...activePlayback.launchedArrows].find(aa => {
                if (aa.wasHit) {
                    return false;
                }
                if (aa.buttonIndex !== change.buttonIndex) {
                    return false;
                }
                if (Math.abs(event.timestamp - aa.targetTimestamp) > 200) {
                    return false;
                }
                return change.newState === true && aa.noteValue === NoteValue.TAP
                    || change.newState === true && aa.noteValue === NoteValue.HOLD_HEAD
                    || change.newState === true && aa.noteValue === NoteValue.ROLL_HEAD
                    || change.newState === true && aa.noteValue === NoteValue.MINE
                    || change.newState === false && aa.noteValue === NoteValue.TAIL;
            });
            if (firstArrow) {
                hitArrows.push(firstArrow);
            }
        }
        for (const hitArrow of hitArrows) {
            hitArrow.dom.classList.toggle("was-hit", true);
            hitArrow.wasHit = true;
            const errorMs = event.timestamp - hitArrow.targetTimestamp;
            gui.hit_status_message_holder.textContent = errorMs.toFixed(1) + "ms hit!";
            gui.hit_status_message_holder.setAttribute("data-status-kind", "HIT");
            activePlayback.hitErrorMsSum += errorMs;
            ++activePlayback.totalHits;
            gui.hit_mean_error_message_holder.textContent = "AVG " + (activePlayback.hitErrorMsSum / activePlayback.totalHits).toFixed(1) + " ms hit!";
        }
    };

    return { playSong, handleGamepadInput };
};