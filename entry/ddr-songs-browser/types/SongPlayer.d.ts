import type { AnyFormatSong, Pack } from "./indexed_packs";

export type PlaySongParams = {
    pack: Pack,
    song: AnyFormatSong,
};