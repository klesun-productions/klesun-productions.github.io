
import type { AnyFormatPack, AnyFormatSong, Pack } from "../types/indexed_packs";
import PackCard from "../components/PackCard";
import GamepadControl from "./GamepadControl";
import SongPlayer, { getBgFileName, getBnFileName } from "./SongPlayer";
import type { PlaySongParams } from "../types/SongPlayer";
import Dom from "./utils/Dom.js";

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
    active_song_player: getElementOfClassById("active_song_player", HTMLAudioElement),
    current_song_view_banner: getElementOfClassById("current_song_view_banner", HTMLImageElement),
    current_song_view_cdtitle: getElementOfClassById("current_song_view_cdtitle", HTMLImageElement),
    current_song_view_title: getElementById("current_song_view_title"),
    current_song_view_date: getElementById("current_song_view_date"),
    current_song_view_artist: getElementById("current_song_view_artist"),
    current_song_error_message_holder: getElementById("current_song_error_message_holder"),

    current_pack_view_title: getElementById("current_pack_view_title"),
    current_pack_view_banner: getElementOfClassById("current_pack_view_banner", HTMLImageElement),
    current_pack_view_songs_list: getElementOfClassById("current_pack_view_songs_list", HTMLUListElement),

    current_song_difficulties_list: getElementOfClassById("current_song_difficulties_list", HTMLUListElement),
    gamepads_states_list: getElementById("gamepads_states_list"),
    hit_status_message_holder: getElementById("hit_status_message_holder"),
    hit_mean_error_message_holder: getElementById("hit_mean_error_message_holder"),
    flying_arrows_box: getElementById("flying_arrows_box"),

    song_search_by_name: getElementOfClassById("song_search_by_name", HTMLInputElement),
    song_names_options: getElementById("song_names_options"),
    play_random_song_btn: getElementById("play_random_song_btn"),
    pack_list: getElementById("pack_list"),
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
    packs.sort((a, b) => {
        return Math.max(4, Math.min(b.songs.length, 40)) - Math.max(4, Math.min(a.songs.length, 40));
    }).sort((a,b) => {
        if (a.imgFileName && !b.imgFileName) {
            return -1;
        } else if (b.imgFileName && !a.imgFileName) {
            return 1;
        } else {
            return 0;
        }
    });
    return packs;
}

function initializeSelectedPackView(
    pack: Pack,
    packSubdirUrl: string,
    chooseSong: (song: AnyFormatSong) => void
) {
    if (pack.imgFileName) {
        const src = packSubdirUrl + "/" + encodeURIComponent(pack.imgFileName);
        gui.current_pack_view_banner.setAttribute("src", src);
    } else {
        gui.current_pack_view_banner.removeAttribute("src");
    }
    gui.current_pack_view_title.textContent = decodeURIComponent(
        pack.packName.replace(/\.zip(?:\.\d+)?$/, "")
    );
    gui.current_pack_view_songs_list.innerHTML = "";
    for (const song of pack.songs) {
        const songDirUrl = packSubdirUrl + "/" +
            encodeURIComponent(song.songName);
        const imageName = getBnFileName(song) ?? getBgFileName(song);
        gui.current_pack_view_songs_list.appendChild(Dom("li", {
            class: "current-pack-songs-list-entry",
            onclick: () => chooseSong(song),
        }, [
            Dom("div", {
                class: "current-pack-songs-list-entry-header",
            }, song.songName),
            Dom("img", {
                loading: "lazy",
                class: "current-pack-songs-list-entry-image",
                src: !imageName ? "" :
                    songDirUrl + "/" + encodeURIComponent(imageName),
            }),
        ]));
    }
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
    const player = SongPlayer({ gui });
    const gamepadControl = GamepadControl(gui);
    whenFirstGamepadConnected.then(
        e => gamepadControl.startGameLoop(event => {
            player.handleGamepadInput(event);
        })
    );
    const anyFormatPacks = await whenPacks;
    const packs = normalizePacks(anyFormatPacks);
    const searchNameToSongs: Record<string, { song: AnyFormatSong, pack: Pack }[]> = {};
    for (const pack of packs) {
        for (const song of pack.songs) {
            const searchName = song.songName + (!song.format ? " " + song.smMd5.slice(0, 4) : "");
            const packName = decodeURIComponent(pack.packName.replace(/.zip$/, ""));
            gui.song_names_options.append(Dom("option", {
                value: searchName,
            }, packName));
            searchNameToSongs[searchName] = searchNameToSongs[searchName] ?? [];
            searchNameToSongs[searchName].push({ song, pack });
        }
    }
    gui.song_search_by_name.onchange = (event) => {
        const matches = searchNameToSongs[gui.song_search_by_name.value] ?? [];
        if (matches.length > 0) {
            playSong(matches[0]);
        }
    };

    const havingValidSong = packs.filter(p => p.songs.some(s => !s.format));

    const playSong = ({ song, pack }: PlaySongParams) => {
        const packSubdirUrl = DATA_DIR_URL + "/packs/" +
            encodeURIComponent(pack.packName) + "/" +
            encodeURIComponent(pack.subdir);
        initializeSelectedPackView(pack, packSubdirUrl, song => {
            player.playSong({ song, packSubdirUrl });
        });
        player.playSong({ song, packSubdirUrl });
    };

    const playRandomSong = () => {
        const pack = havingValidSong[Math.floor(Math.random() * havingValidSong.length)];
        const validSongs = pack.songs.filter(s => !s.format);
        const song = validSongs[Math.floor(Math.random() * validSongs.length)];
        playSong({ pack, song });
        gui.active_song_player.onended = playRandomSong;
    };

    gui.play_random_song_btn.onclick = playRandomSong;

    let i = 0;
    for (const pack of packs) {
        const packDom = PackCard({ pack, DATA_DIR_URL });
        packDom.onclick = () => {
            const randomIndex = Math.floor(Math.random() * pack.songs.length);
            const randomSong = pack.songs[randomIndex];
            playSong({ pack, song: randomSong });
        };
        gui.pack_list.appendChild(packDom);
        if (++i % 10 === 0) {
            await new Promise(_ => setTimeout(_, 100));
        }
    }
}