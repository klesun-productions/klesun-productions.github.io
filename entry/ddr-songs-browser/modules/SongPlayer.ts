import type { Song } from "../types/indexed_packs";
import Dom from "./utils/Dom.js";
import type { PlaySongParams } from "../types/SongPlayer";

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

export default function SongPlayer({ DATA_DIR_URL, gui }: {
    DATA_DIR_URL: string,
    gui: {
        active_song_player: HTMLAudioElement,
        active_song_details: HTMLElement,
    },
}) {
    const playSong = ({ pack, song }: PlaySongParams) => {
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
        if (!song.format && song.headers.SAMPLESTART) {
            gui.active_song_player.currentTime = +song.headers.SAMPLESTART;
        }

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
    };

    return { playSong };
};