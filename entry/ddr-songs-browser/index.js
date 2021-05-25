import Api from "./modules/Api.js";
import Dom from "./modules/utils/Dom.js";

const gui = {
    pack_list: document.getElementById('pack_list'),
    active_song_player: document.getElementById('active_song_player'),
    active_song_details: document.getElementById('active_song_details'),
};

const api = Api();

const DATA_DIR_URL = '/entry/ddr-songs-browser/data';

const playSong = (subdirUrl, song) => {
    const { smModifiedAt, totalBars, charts } = song;
    const { TITLE, SUBTITLE, ARTIST, BANNER, BACKGROUND, CDTITLE, MUSIC, OFFSET, SAMPLESTART, SAMPLELENGTH, SELECTABLE, ...rest } = song.headers;
    const songDirUrl = subdirUrl + '/' + encodeURIComponent(song.songName);
    gui.active_song_details.innerHTML = '';
    gui.active_song_details.appendChild(Dom('div', {class: 'song-details-item-list'}, [
        Dom('span', {}, TITLE),
        Dom('span', {}, SUBTITLE),
        Dom('span', {}, 'by' + ARTIST),
        Dom('span', {}, smModifiedAt),
        Dom('span', {}, JSON.stringify(rest)),
    ]));
    gui.active_song_player.src = songDirUrl + '/' + encodeURIComponent(MUSIC);
    console.log(songDirUrl + '/' + encodeURIComponent(BACKGROUND));
    document.body.style.backgroundImage = 'url("' + songDirUrl + '/' + encodeURIComponent(BACKGROUND) + '")';
    gui.active_song_player.play();
};

const main = async () => {
    let indexedPacks = await fetch(DATA_DIR_URL + '/indexed_packs.json.gz')
        .then(rs => rs.json());
    indexedPacks = indexedPacks.filter(p => !p.format);
    indexedPacks.sort((a, b) => {
        return new Date(a.subdirModifiedAt) - new Date(b.subdirModifiedAt);
    });

    const smMd5ToPackNames = new Map();
    indexedPacks = indexedPacks.filter(pack => {
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
    indexedPacks.sort((a, b) => Math.max(3, Math.min(b.songs.length, 40)) - Math.max(4, Math.min(a.songs.length, 40)));

    let i = 0;
    for (const pack of indexedPacks) {
        const packDetailsPanel = Dom('div', {class: 'packed-content'}, []);
        const decodedPackName = decodeURIComponent(
            pack.packName.replace(/\.zip(?:\.\d+)?$/, '')
        );
        const packDom = Dom('div', {class: 'pack-item'}, [
            Dom('div', {}, pack.subdirModifiedAt),
            Dom('div', {class: 'pack-name-holder'}, decodedPackName),
            packDetailsPanel,
        ]);

        const {imgFileName, subdir} = pack;
        const subdirUrl = DATA_DIR_URL + '/packs/' +
            encodeURIComponent(pack.packName) + '/' +
            encodeURIComponent(subdir);
        const contentDom = Dom('div', {}, [
            ...!imgFileName ? [] : [
                Dom('img', {
                    class: 'pack-banner',
                    src: subdirUrl + '/' + encodeURIComponent(imgFileName),
                }),
            ],
            Dom('div', {class: 'song-list'}, pack.songs.flatMap(song => {
                const difficulties = song.format ? [] :
                    song.charts.map(c => c.meter).sort((a,b) => +a - +b);
                const songDetailsPanel = Dom('div', {}, []);
                if (!song.format && song.headers['BANNER']) {
                    songDetailsPanel.appendChild(Dom('img', {
                        class: 'song-banner',
                        // TODO: use same queueing as in http requests
                        //src: songDirUrl + '/' + encodeURIComponent(indexedSong.headers['BANNER']),
                    }));
                }
                return [Dom('div', {class: 'song-item'}, [
                    Dom('div', {class: 'song-name-holder'}, [
                        ...song.format ? [] : [
                            Dom('span', {
                                class: 'play-song-item-btn',
                                onclick: () => playSong(subdirUrl, song),
                            }, '▶'),
                        ],
                        Dom('span', {}, song.songName),
                        ...song.format ? [] : [
                            Dom('span', {}, difficulties.join('/')),
                        ],
                    ]),
                    songDetailsPanel,
                ])];
            })),
        ]);
        packDetailsPanel.appendChild(contentDom);

        gui.pack_list.appendChild(packDom);
        if (++i % 50 === 0) {
            await new Promise(_ => setTimeout(_, 400));
        }
    }

    console.log('smMd5ToPackNames', smMd5ToPackNames);
};

main().catch(error => {
    const msg = 'Main script failed';
    console.error(msg, error);
    alert(msg + ' - ' + error);
});