import type { Pack } from "../types/indexed_packs";
import type { PlaySongParams } from "../types/Player";
import Dom from "../modules/utils/Dom.js";

export default function PackCard({ pack, DATA_DIR_URL, playSong }: {
    pack: Pack,
    DATA_DIR_URL: string,
    playSong: (params: PlaySongParams) => void,
}) {
    const packDetailsPanel = Dom("div", { class: "packed-content" }, []);
    const { imgFileName, subdir, packName } = pack;
    const decodedPackName = decodeURIComponent(
        packName.replace(/\.zip(?:\.\d+)?$/, "")
    );
    const packCard = Dom("div", { class: "pack-item" }, [
        Dom("div", {}, pack.subdirModifiedAt),
        Dom("div", { class: "pack-name-holder" }, [
            Dom("span", {}, decodedPackName),
            Dom("a", {
                href: "/ddr-songs-browser/ftp/pack.tar?" + new URLSearchParams({
                    json: JSON.stringify({
                        packName: pack.packName,
                        subdir: subdir,
                        songNames: pack.songs.map(s => s.songName),
                    }),
                }),
            }, " link"),
        ]),
        packDetailsPanel,
    ]);

    const subdirUrl = DATA_DIR_URL + "/packs/" +
        encodeURIComponent(packName) + "/" +
        encodeURIComponent(subdir);
    const contentDom = Dom("div", {}, [
        ...!imgFileName ? [] : [
            Dom("img", {
                class: "pack-banner",
                loading: "lazy",
                src: subdirUrl + "/" + encodeURIComponent(imgFileName),
            }),
        ],
        Dom("div", { class: "song-list" }, pack.songs.flatMap(song => {
            const difficulties = song.format ? [] :
                song.charts.map(c => c.meter).sort((a,b) => +a - +b);
            const songDetailsPanel = Dom("div", {}, []);
            if (!song.format && song.headers["BANNER"]) {
                songDetailsPanel.appendChild(Dom("img", {
                    class: "song-banner",
                    // TODO: use same queueing as in http requests
                    //src: songDirUrl + '/' + encodeURIComponent(indexedSong.headers['BANNER']),
                }));
            }
            return [Dom("div", { class: "song-item" }, [
                Dom("div", { class: "song-name-holder" }, [
                    ...song.format ? [] : [
                        Dom("span", {
                            class: "play-song-item-btn",
                            onclick: () => playSong({ DATA_DIR_URL, pack, song, startAtSample: true }),
                        }, "▶"),
                    ],
                    Dom("span", {}, song.songName),
                    ...song.format ? [] : [
                        Dom("span", {}, difficulties.join("/")),
                    ],
                ]),
                songDetailsPanel,
            ])];
        })),
    ]);
    packDetailsPanel.appendChild(contentDom);
    return packCard;
}