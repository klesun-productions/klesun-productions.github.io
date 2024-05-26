import type {AnyFormatSong, Pack} from "./indexed_packs";

export type PlaySongParams = {
    DATA_DIR_URL: string,
    pack: Pack,
    song: AnyFormatSong,
    startAtSample?: boolean
};