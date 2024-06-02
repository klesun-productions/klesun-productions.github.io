import type { Pack } from "../types/indexed_packs";
import Dom from "../modules/utils/Dom.js";

export default function PackCard({ pack, DATA_DIR_URL }: {
    pack: Pack,
    DATA_DIR_URL: string,
}) {
    const packDetailsPanel = Dom("div", { class: "packed-content" }, []);
    const { imgFileName, subdir, packName } = pack;
    const decodedPackName = decodeURIComponent(
        packName.replace(/\.zip(?:\.\d+)?$/, "")
    );
    const packCard = Dom("div", { class: "pack-item" }, [
        Dom("div", {}, pack.subdirModifiedAt.slice(0, 10)),
        Dom("div", { class: "pack-name-holder" }, [
            Dom("span", {}, decodedPackName),
            Dom("a", {
                href: "https://api.klesun.net/ddr-songs-browser/ftp/pack.tar?" + new URLSearchParams({
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
    ]);
    packDetailsPanel.appendChild(contentDom);
    return packCard;
}