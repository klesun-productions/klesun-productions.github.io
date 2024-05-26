
import type { AnyFormatPack } from "../types/indexed_packs";
import PackCard from "../components/PackCard";
import GamepadControl from "./GamepadControl";
import SongPlayer from "./SongPlayer";

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
    flying_arrows_box: getElementById("flying_arrows_box"),
};

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
    whenFirstGamepadConnected: Promise<GamepadEvent>,
}) {
    const player = SongPlayer({ DATA_DIR_URL, gui });
    const gamepadControl = GamepadControl(gui);
    whenFirstGamepadConnected.then(e => {
        gamepadControl.progressGameLoop();
        setInterval(() => gamepadControl.progressGameLoop());
    });
    const anyFormatPacks = await whenPacks;
    const packs = normalizePacks(anyFormatPacks);

    const havingValidSong = packs.filter(p => p.songs.some(s => !s.format));

    const playRandomSong = () => {
        const pack = havingValidSong[Math.floor(Math.random() * havingValidSong.length)];
        const validSongs = pack.songs.filter(s => !s.format);
        const song = validSongs[Math.floor(Math.random() * validSongs.length)];
        player.playSong({ pack, song });
        gui.active_song_player.onended = playRandomSong;
    };

    gui.play_random_song_btn.onclick = playRandomSong;

    let i = 0;
    for (const pack of packs) {
        const packDom = PackCard({ pack, DATA_DIR_URL, playSong: player.playSong });
        gui.pack_list.appendChild(packDom);
        if (++i % 10 === 0) {
            await new Promise(_ => setTimeout(_, 100));
        }
    }
}