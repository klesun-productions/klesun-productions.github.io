import type { AnyFormatSong } from "../types/indexed_packs";
import type { BpmUpdate, Measure, MeasureDivision, YaSmParsed } from "./YaSmParser";
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
    column: number,
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
    return fileNames?.find(n => n.match(/bn.*\.(png|jpe?g|bmp)/i))
        ?? fileNames?.find(n => n.toLowerCase().startsWith(song.songName.toLowerCase()) && n.match(/\.(png|jpe?g|bmp)/i));
}

export function getBgFileName(song: AnyFormatSong) {
    const fileNames = !song.format ? song.restFileNames : song.fileNames;
    if (!song.format && song.headers.BACKGROUND) {
        const found = song.restFileNames.find(n => n.toLowerCase() === song.headers.BACKGROUND.toLowerCase());
        if (found) {
            return found;
        }
    }
    return fileNames?.find(n => n.match(/bg.*\.(png|jpe?g|bmp)/i));
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
                        1: "🡻",
                        2: "🡹",
                        3: "🡺",
                    }[column] ?? value;
                } else if (value === NoteValue.MINE) {
                    displayValue = "💣";
                }
                dom.textContent = displayValue;
                // TODO: use targetTimestamp and https://developer.mozilla.org/en-US/docs/Web/API/Animation/startTime
                dom.style.animationDuration = ARROW_FLY_SECONDS + "s";
                gui.flying_arrows_box.appendChild(dom);
                const launchedArrow: LaunchedArrow = {
                    column: column,
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
                        gui.hit_status_message_holder.removeAttribute("data-last-precision-rating");
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
            console.error("Missing NOTES or BPMS");
            return;
        }

        const { BPMS } = parsed;
        const TARGET_APM = 150;
        const charts = parsed.NOTES;
        const chartsWithNotes = charts
            .filter(c => countApm(BPMS, c.MEASURES) > 0);
        const chart = [...chartsWithNotes]
            .sort((a,b) => {
                const aTpm = countApm(BPMS, a.MEASURES);
                const bTpm = countApm(BPMS, b.MEASURES);
                return Math.abs(aTpm - TARGET_APM) - Math.abs(bTpm - TARGET_APM);
            })
            .find(c => c.MEASURES.every(m => m.every(d => d.length < 5)));
        gui.current_song_difficulties_list.append(...chartsWithNotes.map(c => Dom("li", {
            class: c === chart ? "selected-chart" : "",
        }, [
            Dom("span", {}, "APM: " + countApm(BPMS, c.MEASURES).toFixed(1)),
            Dom("span", {}, " "),
            Dom("span", {}, c.DESCRIPTION + " " + c.STEPSTYPE + " " + c.METER),
            Dom("span", {}, " "),
            Dom("span", {}, c.MEASURES.flatMap(m => m.map(d => d.length)).reduce((a,b) => Math.max(a, b), 0) + "b"),
        ])));
        if (!chart) {
            console.warn("No fitting chart found");
            return;
        }
        const chartIndex = charts.indexOf(chart);
        const reachedEnd = await playChart(playback, parsed, chartIndex);
        if (reachedEnd) {
            const LAST_HIGHSCORE_INDEX = +(window.localStorage.getItem("HIGHSCORE_INDEX") ?? "-1") + 1;
            window.localStorage.setItem("HIGHSCORE_LAST_INDEX", String(LAST_HIGHSCORE_INDEX));
            window.localStorage.setItem("HIGHSCORE_DATA_" + String(LAST_HIGHSCORE_INDEX).padStart(5, "0"), JSON.stringify({
                smMd5: song.smMd5,
                chartIndex: chartIndex,
                totalHits: playback.totalHits,
                hitErrorMsSum: playback.hitErrorMsSum,
            }));
            activePlayback = null;
        }
    };

    const playChart = async (playback: ActivePlayback, parsed: YaSmParsed, chartIndex: number) => {
        const { BPMS } = parsed;
        const chart = parsed.NOTES[chartIndex];
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
                    console.log("interrupting arrows launches due to new playback", { playback, activePlayback });
                    return false;
                }
                launchNote(playback, division, targetTimestamp, divisionIndex, divider);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * ARROW_FLY_SECONDS));
        return true;
    };

    const getPrecisionRating = (errorMs: number) => {
        const errorMsAbs = Math.abs(errorMs);
        if (errorMsAbs < 5) {
            return "BELOW_5ms";
        } else if (errorMsAbs < 10) {
            return "BELOW_10ms";
        } else if (errorMsAbs < 30) {
            return "BELOW_30ms";
        } else if (errorMsAbs < 60) {
            return "BELOW_60ms";
        } else if (errorMsAbs < 90) {
            return "BELOW_90ms";
        } else {
            return "OVER_90ms";
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
                // most likely specific to dancepad manufacturer - need to add key
                // mapping configuration screen and mb predefine mapping for known pads
                const sameButton =
                    aa.column === 0 && change.buttonIndex === 0 ||
                    aa.column === 1 && change.buttonIndex === 3 ||
                    aa.column === 2 && change.buttonIndex === 2 ||
                    aa.column === 3 && change.buttonIndex === 1;
                if (!sameButton) {
                    return false;
                }
                if (Math.abs(event.timestamp - aa.targetTimestamp) > 144) {
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
            gui.hit_status_message_holder.textContent = errorMs.toFixed(1) + " ms hit!";
            gui.hit_status_message_holder.setAttribute("data-status-kind", "HIT");
            gui.hit_status_message_holder.setAttribute("data-last-precision-rating", getPrecisionRating(errorMs));
            activePlayback.hitErrorMsSum += Math.abs(errorMs);
            ++activePlayback.totalHits;
            const avgErrorMs = activePlayback.hitErrorMsSum / activePlayback.totalHits;
            gui.hit_mean_error_message_holder.textContent = "AVG " + avgErrorMs.toFixed(1) + " ms hit!";
            gui.hit_mean_error_message_holder.textContent = "AVG " + avgErrorMs.toFixed(1) + " ms hit!";
            gui.hit_mean_error_message_holder.setAttribute("data-last-precision-rating", getPrecisionRating(avgErrorMs));
        }
    };

    return { playSong, handleGamepadInput };
};