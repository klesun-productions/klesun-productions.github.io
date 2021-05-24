import Api from "./modules/Api.js";
import Dom from "./modules/utils/Dom.js";

const gui = {
    pack_list: document.getElementById('pack_list'),
};

const api = Api();

const main = async () => {
    const packNames = await api.getPackNames();
    for (const packName of packNames) {
        const packDetailsPanel = Dom('div', {class: 'packed-content'}, []);
        const decodedPackName = decodeURIComponent(
            packName.replace(/\.zip(?:\.\d+)?$/, '')
        );
        const packDom = Dom('div', {class: 'pack-item'}, [
            Dom('div', {class: 'pack-name-holder'}, decodedPackName),
            packDetailsPanel,
        ]);
        api.getPackDetails({packName}).then(details => {
            const {imgFileName, subdir, songNames} = details;
            const subdirUrl = '/entry/ddr-songs-browser/data/packs/' +
                encodeURIComponent(packName) + '/' +
                encodeURIComponent(subdir);
            const contentDom = Dom('div', {}, [
                ...!imgFileName ? [] : [
                    Dom('img', {
                        src: subdirUrl + '/' + encodeURIComponent(imgFileName),
                    }),
                ],
                Dom('div', {class: 'song-list'}, songNames.map(songName => {
                    const songDetailsPanel = Dom('div', {}, []);
                    const songDirUrl = subdirUrl + '/' + encodeURIComponent(songName);
                    // api.getSongFiles({packName, subdir, songName}).then(files => {
                    //     const songFile = files.find(f => f.match(/\.(mp3|ogg|wav|flac|acc|m3a)$/i));
                    //     const imgFiles = files.filter(f => f.match(/\.(png|je?pg|bmp|gif)$/i));
                    //     const cardImgFile = imgFiles.find(f => !f.match(/bg/i) && !f.match(/title/i)) || imgFiles[0];
                    //     songDetailsPanel.appendChild(Dom('img', {
                    //         src: songDirUrl + '/' + encodeURIComponent(cardImgFile),
                    //     }));
                    //     songDetailsPanel.appendChild(Dom('audio', {
                    //         src: songDirUrl + '/' + encodeURIComponent(songFile),
                    //     }));
                    // }).catch(error => songDetailsPanel.appendChild(
                    //     Dom('div', {class: 'content-retrieval-error'}, String(error)),
                    // ));
                    return Dom('div', {class: 'song-item'}, [
                        Dom('div', {class: 'song-name-holder'}, songName),
                        songDetailsPanel,
                    ]);
                })),
            ]);
            packDetailsPanel.appendChild(contentDom);
        }).catch(error => packDetailsPanel.appendChild(
            Dom('div', {class: 'content-retrieval-error'}, String(error)),
        ));
        gui.pack_list.appendChild(packDom);
    }
};

main().catch(error => {
    const msg = 'Main script failed';
    console.error(msg, error);
    alert(msg + ' - ' + error);
});