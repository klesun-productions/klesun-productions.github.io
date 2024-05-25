import Api from "./modules/Api.js";
import Dom from "./modules/utils/Dom.js";


const gui = {
    pack_list: document.getElementById('pack_list'),
    /** @type {HTMLAudioElement} */
    active_song_player: document.getElementById('active_song_player'),
    active_song_details: document.getElementById('active_song_details'),
    play_random_song_btn: document.getElementById('play_random_song_btn'),
};

const api = Api();

const BACKEND_URL = "https://api.klesun.net";
const DATA_DIR_URL = BACKEND_URL + '/entry/ddr-songs-browser/data';

const playSong = ({pack, song, startAtSample = false}) => {
    const { smModifiedAt, totalBars, charts, restFileNames, smMd5 } = song;
    const { TITLE, SUBTITLE, ARTIST, BANNER, BACKGROUND, CDTITLE, MUSIC, OFFSET, SAMPLESTART, SAMPLELENGTH, SELECTABLE, ...rest } = song.headers;
    const songDirUrl = DATA_DIR_URL + '/packs/' +
        encodeURIComponent(pack.packName) + '/' +
        encodeURIComponent(pack.subdir) + '/' +
        encodeURIComponent(song.songName);

    const errorHolder = Dom('span', {style: 'color: red'});
    const items = [
        Dom('span', {}, TITLE ? ' ' + TITLE : ''),
        Dom('span', {}, SUBTITLE ? ' ' + SUBTITLE : ''),
        Dom('span', {}, ARTIST ? ' by ' + ARTIST : ''),
        Dom('span', {}, ' ' + smModifiedAt),
        Dom('span', {}, ' ' + smMd5),
        Dom('span', {}, JSON.stringify(rest)),
        errorHolder,
    ];
    if (CDTITLE) {
        items.unshift(Dom('img', {
            src: songDirUrl + '/' + encodeURIComponent(CDTITLE),
        }));
    }
    if (BANNER) {
        items.unshift(Dom('img', {
            src: songDirUrl + '/' + encodeURIComponent(BANNER),
        }));
    }
    if (pack.imgFileName) {
        items.unshift(Dom('img', {
            src: DATA_DIR_URL + '/packs/' +
                encodeURIComponent(pack.packName) + '/' +
                encodeURIComponent(pack.subdir) + '/' +
                encodeURIComponent(pack.imgFileName),
        }));
    }

    gui.active_song_details.innerHTML = '';
    gui.active_song_details.appendChild(
        Dom('div', {class: 'song-details-item-list'}, items),
    );
    const songFileName = restFileNames.find(n => n.toLowerCase() === MUSIC.toLowerCase()) ||
        restFileNames.find(n => n.match(/\.(ogg|wav|mp3|acc)$/i));
    if (!songFileName) {
        errorHolder.textContent = 'Missing song file in ' + restFileNames.join(', ');
    } else {
        gui.active_song_player.src = songDirUrl + '/' + encodeURIComponent(songFileName);
        gui.active_song_player.play();
    }
    const bgFileName = BACKGROUND && restFileNames.find(n => n.toLowerCase() === BACKGROUND.toLowerCase()) ||
        restFileNames.find(n => n.match(/bg.*\.(png|jpe?g|bmp)/i));
    document.body.style.backgroundImage = !bgFileName ? 'none' :
        'url("' + songDirUrl + '/' + encodeURIComponent(bgFileName) + '")';
    if (startAtSample && SAMPLESTART) {
        gui.active_song_player.currentTime = +SAMPLESTART;
    }
};

const main = async () => {
    let packs = await fetch(DATA_DIR_URL + '/indexed_packs.json.gz')
        .then(rs => rs.json());
    packs = packs.filter(p => !p.format);
    packs.sort((a, b) => {
        return new Date(b.subdirModifiedAt) - new Date(a.subdirModifiedAt);
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

    const havingValidSong = packs.filter(p => p.songs.some(s => !s.format));

    const playRandomSong = () => {
        const pack = havingValidSong[Math.floor(Math.random() * havingValidSong.length)];
        const validSongs = pack.songs.filter(s => !s.format);
        const song = validSongs[Math.floor(Math.random() * validSongs.length)];
        playSong({pack, song, startAtSample: true});
        gui.active_song_player.onended = playRandomSong;
    };

    gui.play_random_song_btn.onclick = playRandomSong;

    let i = 0;
    for (const pack of packs) {
        const packDetailsPanel = Dom('div', {class: 'packed-content'}, []);
        const {imgFileName, subdir, packName} = pack;
        const decodedPackName = decodeURIComponent(
            packName.replace(/\.zip(?:\.\d+)?$/, '')
        );
        const packDom = Dom('div', {class: 'pack-item'}, [
            Dom('div', {}, pack.subdirModifiedAt),
            Dom('div', {class: 'pack-name-holder'}, [
                Dom('span', {}, decodedPackName),
                Dom('a', {
                    href: '/ddr-songs-browser/ftp/pack.tar?' + new URLSearchParams({
                        json: JSON.stringify({
                            packName: pack.packName,
                            subdir: subdir,
                            songNames: pack.songs.map(s => s.songName),
                        }),
                    }),
                }, ' link'),
            ]),
            packDetailsPanel,
        ]);

        const subdirUrl = DATA_DIR_URL + '/packs/' +
            encodeURIComponent(packName) + '/' +
            encodeURIComponent(subdir);
        const contentDom = Dom('div', {}, [
            ...!imgFileName ? [] : [
                Dom('img', {
                    class: 'pack-banner',
                    loading: "lazy",
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
                                onclick: () => playSong({pack, song, startAtSample: true}),
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
        if (++i % 10 === 0) {
            await new Promise(_ => setTimeout(_, 100));
        }
    }
};

main().catch(error => {
    const msg = 'Main script failed';
    console.error(msg, error);
    alert(msg + ' - ' + error);
});