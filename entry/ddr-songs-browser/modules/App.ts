
import Dom from "./utils/Dom.js";
import type { AnyFormatPack } from "../types/indexed_packs";
import type { PlaySongParams } from "../types/Player";
import PackCard from "../components/PackCard";

function getElementOfClassById<
    TCls extends abstract new (...args: never) => InstanceType<TCls>
>(id: string, cls: TCls): InstanceType<TCls> {
    const element = document.getElementById(id);
    if (element instanceof cls) {
        return element;
    } else {
        throw new Error("Failed to initialize UI: missing '" + id + "' or not of type " + cls);
    }
}

function getElementById(id: string): HTMLElement {
    return getElementOfClassById(id, HTMLElement);
}

const gui = {
    pack_list: getElementById("pack_list"),
    active_song_player: getElementOfClassById("active_song_player", HTMLAudioElement),
    active_song_details: getElementById("active_song_details"),
    play_random_song_btn: getElementById("play_random_song_btn"),
    gamepads_states_list: getElementById("gamepads_states_list"),
};

const playSong = ({ DATA_DIR_URL, pack, song, startAtSample = false }: PlaySongParams) => {
    const songDirUrl = DATA_DIR_URL + "/packs/" +
        encodeURIComponent(pack.packName) + "/" +
        encodeURIComponent(pack.subdir) + "/" +
        encodeURIComponent(song.songName);

    const errorHolder = Dom("span", { style: "color: red" });
    const baseItems = [
        errorHolder,
    ];
    if (pack.imgFileName) {
        baseItems.unshift(Dom("img", {
            src: DATA_DIR_URL + "/packs/" +
                encodeURIComponent(pack.packName) + "/" +
                encodeURIComponent(pack.subdir) + "/" +
                encodeURIComponent(pack.imgFileName),
        }));
    }
    gui.active_song_details.innerHTML = "";
    const detailsItemList = Dom("div", { class: "song-details-item-list" }, baseItems);
    gui.active_song_details.appendChild(
        detailsItemList
    );
    const fileNames = !song.format ? song.restFileNames : song.fileNames;
    const songFileName = !song.format && fileNames.find(n => n.toLowerCase() === song.headers.MUSIC.toLowerCase()) ||
        fileNames.find(n => n.match(/\.(ogg|wav|mp3|acc)$/i));
    if (!songFileName) {
        errorHolder.textContent = "Missing song file in " + fileNames.join(", ");
    } else {
        gui.active_song_player.src = songDirUrl + "/" + encodeURIComponent(songFileName);
        gui.active_song_player.play();
    }

    if (song.format) {
        return;
    }

    const { smModifiedAt, totalBars, charts, restFileNames, smMd5 } = song;
    const { TITLE, SUBTITLE, ARTIST, BANNER, BACKGROUND, CDTITLE, MUSIC, OFFSET, SAMPLESTART, SAMPLELENGTH, SELECTABLE, ...rest } = song.headers;
    detailsItemList.prepend(
        Dom("span", {}, TITLE ? " " + TITLE : ""),
        Dom("span", {}, SUBTITLE ? " " + SUBTITLE : ""),
        Dom("span", {}, ARTIST ? " by " + ARTIST : ""),
        Dom("span", {}, " " + smModifiedAt),
        Dom("span", {}, " " + smMd5),
        Dom("span", {}, JSON.stringify(rest))
    );
    if (CDTITLE) {
        detailsItemList.prepend(Dom("img", {
            src: songDirUrl + "/" + encodeURIComponent(CDTITLE),
        }));
    }
    if (BANNER) {
        detailsItemList.prepend(Dom("img", {
            src: songDirUrl + "/" + encodeURIComponent(BANNER),
        }));
    }
    const bgFileName = BACKGROUND && restFileNames.find(n => n.toLowerCase() === BACKGROUND.toLowerCase()) ||
        restFileNames.find(n => n.match(/bg.*\.(png|jpe?g|bmp)/i));
    document.body.style.backgroundImage = !bgFileName ? "none" :
        "url(\"" + songDirUrl + "/" + encodeURIComponent(bgFileName) + "\")";
    if (startAtSample && SAMPLESTART) {
        gui.active_song_player.currentTime = +SAMPLESTART;
    }
};

const GAMEPAD_ID_TO_BUTTONS_STATE: Record<string, boolean[]> = {};

function updateButtonClass(gamepadId: string, buttonIndex: number, state: boolean) {
    let existing = null;
    for (const gamepadDiv of gui.gamepads_states_list.children) {
        if (gamepadDiv.getAttribute("data-id") === gamepadId) {
            existing = gamepadDiv;
            break;
        }
    }
    if (existing === null) {
        existing = document.createElement("div");
        gui.gamepads_states_list.appendChild(existing);
        existing.setAttribute("data-id", gamepadId);
        for (let i = 0; i < 4; ++i) {
            existing.appendChild(document.createElement("div"));
        }
        existing.children[0].textContent = "🡸";
        existing.children[1].textContent = "🡺";
        existing.children[2].textContent = "🡹";
        existing.children[3].textContent = "🡻";
    }
    if (buttonIndex < existing.children.length) {
        existing.children[buttonIndex].classList.toggle("pressed", state);
    }
}

function progressGameLoop() {
    for (const gamepad of navigator.getGamepads().slice(1)) {
        if (!gamepad) {
            continue;
        }
        const oldState = GAMEPAD_ID_TO_BUTTONS_STATE[gamepad.id] ?? [false, false, false, false];
        const newState = gamepad.buttons.map(b => b.pressed);
        for (let i = 0; i < newState.length; ++i) {
            const oldPressed = oldState[i] ?? false;
            const newPressed = newState[i];
            if (oldPressed !== newPressed) {
                updateButtonClass(gamepad.id, i, newPressed);
            }
        }
        GAMEPAD_ID_TO_BUTTONS_STATE[gamepad.id] = gamepad.buttons.map(b => b.pressed);
    }
}

function normalizePacks(anyFormatPacks: AnyFormatPack[]) {
    let packs = anyFormatPacks.flatMap(p => !p.format ? [p] : []);
    packs.sort((a, b) => {
        return new Date(b.subdirModifiedAt).getTime() - new Date(a.subdirModifiedAt).getTime();
    });

    const smMd5ToPackNames = new Map();
    packs = packs.filter(pack => {
        pack.songs = pack.songs.filter(song => {
            if (song.format) {
                return true;
            }

            if (!smMd5ToPackNames.has(song.smMd5)) {
                smMd5ToPackNames.set(song.smMd5, []);
            }
            smMd5ToPackNames.get(song.smMd5).push(pack.packName);
            if (smMd5ToPackNames.get(song.smMd5).length > 1) {
                return false;
            }

            const difficulties = song.format ? [] :
                song.charts.map(c => c.meter).sort((a,b) => +a - +b);
            if (difficulties.length > 0 && +difficulties[0] > 5) {
                return false; // hide hard songs, I'm a casual
            }

            return true;
        });
        return pack.songs.length > 0;
    });
    packs.sort((a, b) => Math.max(3, Math.min(b.songs.length, 40)) - Math.max(4, Math.min(a.songs.length, 40)));
    return packs;
}

export default async function ({
    DATA_DIR_URL,
    whenPacks,
    whenFirstGamepadConnected,
}: {
    DATA_DIR_URL: string,
    whenPacks: Promise<AnyFormatPack[]>,
    whenFirstGamepadConnected: Promise<void>,
}) {
    whenFirstGamepadConnected.then(e => {
        setInterval(() => progressGameLoop);
    });
    const anyFormatPacks = await whenPacks;
    const packs = normalizePacks(anyFormatPacks);

    const havingValidSong = packs.filter(p => p.songs.some(s => !s.format));

    const playRandomSong = () => {
        const pack = havingValidSong[Math.floor(Math.random() * havingValidSong.length)];
        const validSongs = pack.songs.filter(s => !s.format);
        const song = validSongs[Math.floor(Math.random() * validSongs.length)];
        playSong({ DATA_DIR_URL, pack, song, startAtSample: true });
        gui.active_song_player.onended = playRandomSong;
    };

    gui.play_random_song_btn.onclick = playRandomSong;

    let i = 0;
    for (const pack of packs) {
        const packDom = PackCard({ pack, DATA_DIR_URL, playSong });
        gui.pack_list.appendChild(packDom);
        if (++i % 10 === 0) {
            await new Promise(_ => setTimeout(_, 100));
        }
    }
}