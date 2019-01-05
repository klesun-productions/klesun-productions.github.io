
import {Dom} from "../../../src/utils/Dom";
import {S} from "../../../src/utils/S";

/**
 * this function extracts useful data from a VK profile page
 * it should include the last time user was active, profile image,
 * other images, the education/job/relationship lines if any and posts
 */
export let ParseProfile = function(dom: HTMLElement)
{
    let parseProfileInfoBlock = function(dom: HTMLElement) {
        let result: {[k: string]: string} = {};
        for (let row of Dom.get(dom).any('.profile_info_row')) {
            let label = S.opt(Dom.get(row).any('.label')[0])
                .map(l => l.textContent.trim()).def(null);
            let labeled = S.opt(Dom.get(row).any('.labeled')[0])
                .map(l => l.textContent.trim()).def(null);
            result[label] = labeled;
        }
        return result;
    };

    let parseProfileInfoLong = function(dom: HTMLElement) {
        let result: {[k: string]: {[k: string]: string}} = {};
        for (let row of Dom.get(dom).any('.profile_info_block')) {
            let header = S.opt(Dom.get(row).any('.profile_info_header')[0])
                .map(l => l.textContent.trim()).def(null);
            let block = Dom.get(row).any('.profile_info')[0];
            if (!block) continue;
            result[header] = parseProfileInfoBlock(block);
        }
        return result;
    };

    let parsePageCounters = function(dom: HTMLElement) {
        let result: {[k: string]: string} = {};
        for (let row of Dom.get(dom).any('.page_counter')) {
            let label = S.opt(Dom.get(row).any('.label')[0])
                .map(l => l.textContent.trim()).def(null);
            let labeled = S.opt(Dom.get(row).any('.count')[0])
                .map(l => l.textContent.trim()).def(null);
            result[label] = labeled;
        }
        return result;
    };

    let extractBgImgUrl = (dom: HTMLElement) =>
        S.opt(dom.getAttribute('style'))
            .map(s => s.match(/url\((.*?)\)/))
            .map(m => m[1]);

    let parseReply = (dom: HTMLElement) => 1 && {
        login: S.opt(Dom.get(dom).a('.reply_author a')[0])
            .map(a => a.getAttribute('href')).def(null),
        dt: S.opt(Dom.get(dom).any('.reply_date')[0])
            .map(h => h.textContent.trim()).def(null),
        text: S.opt(Dom.get(dom).any('.wall_reply_text')[0])
            .map(h => h.textContent.trim()).def(null),
    };

    let parsePost = (dom: HTMLElement) => 1 && {
        login: S.opt(Dom.get(dom).a('.post_author a')[0])
            .map(a => a.getAttribute('href')).def(null),
        dt: S.opt(Dom.get(dom).any('.post_date')[0])
            .map(h => h.textContent.trim()).def(null),
        text: S.opt(Dom.get(dom).any('.published_comment .wall_post_text')[0])
            .map(h => h.textContent.trim()).def(null)
            || S.opt(Dom.get(dom).any('.post_content > .post_info > .wall_text .wall_post_text')[0])
            .map(h => h.textContent.trim()).def(null),
        originalLogin: S.opt(Dom.get(dom).a('.copy_post_author a')[0])
            .map(a => a.getAttribute('href')).def(null),
        originalDt: S.opt(Dom.get(dom).any('.copy_post_date')[0])
            .map(h => h.textContent.trim()).def(null),
        originalText: S.opt(Dom.get(dom).any('.copy_quote .wall_post_text')[0])
            .map(h => h.textContent.trim()).def(null),
        postImgUrl: S.opt(Dom.get(dom).any('.wall_text .page_post_sized_thumbs *')[0])
            .fap(extractBgImgUrl).def(null),
        peopleLiked: S.opt(Dom.get(dom).any('.post_full_like .post_like_count')[0])
            .map(h => h.textContent.trim()).def(null),
        peopleSaw: S.opt(Dom.get(dom).any('.post_views .post_views_count')[0])
            .map(h => h.textContent.trim()).def(null),
        replies: Dom.get(dom).any('.replies .reply')
            .map(parseReply),
    };

    let parseModuleItems = (rowDom: HTMLElement, type?: string) => {
        let get = Dom.get(rowDom);
        if (type === 'profile_friends') {
            return get.any('.people_cell').map(cell => ({
                imgUrl: Dom.get(cell).img().map(img => img.getAttribute('src'))[0],
                url: Dom.get(cell).any('people_cell_ava').map(a => a.getAttribute('href'))[0],
                name: Dom.get(cell).any('people_cell_ava').map(a => a.getAttribute('title'))[0],
            }));
        } else if (type === 'profile_gifts') {
            return get.img('.profile_gift_img').map(img => ({
                imgUrl: img.getAttribute('src'),
                url: '',
                name: img.getAttribute('alt'),
            }));
        } else if (type === 'profile_idols') {
            return [{
                imgUrl: get.any('.thumb').map(thumb => (thumb.style['background-image'] || '').slice(4, -1))[0],
                url: get.a().map(a => a.getAttribute('href'))[0] || rowDom.getAttribute('href'),
                name: get.any('.thumb').map(a => a.getAttribute('alt'))[0],
                description: get.any('.group_desc').map(a => a.innerText.trim())[0],
            }];
        } else if (type === 'profile_albums') {
            return [{
                imgUrl: get.img().map(img => img.getAttribute('src'))[0],
                url: get.a().map(a => a.getAttribute('href'))[0],
                name: get.img().map(a => a.getAttribute('alt'))[0],
            }];
        } else if (type === 'profile_videos') {
            return [{
                imgUrl: get.any('.page_video_thumb').map(thumb => (thumb.style['background-image'] || '').slice(4, -1))[0],
                url: get.a().map(a => a.getAttribute('href'))[0],
                name: get.img().map(a => a.getAttribute('aria-label'))[0],
                duration: get.any('.video_thumb_label_item').map(a => a.textContent)[0],
            }];
        } else if (type === 'profile_audios') {
            return [{
                imgUrl: get.any('.audio_row__cover').map(thumb => (thumb.style['background-image'] || '').slice(4, -1))[0],
                name: get.any('.audio_row__title_inner').map(a => a.innerText.trim())[0],
                url: '',
                performers: get.a('.audio_row__performers a').map(a => ({
                    name: a.textContent.trim(),
                    url: a.getAttribute('href'),
                })),
            }];
        } else {
            return [];
        }
    };

    let parseModule = (module: HTMLElement) => {
        let type = module.id;
        return {
            type: type,
            label: Dom.get(module).any('.header_label').map(dom => dom.textContent.trim())[0],
            count: Dom.get(module).any('.header_count').map(dom => dom.textContent.trim())[0],
            lastItems: Dom.get(module).any('.module_body > *')
                .flatMap(rowDom => parseModuleItems(rowDom, type))
                .filter(item => !!item.name),
        };
    };

    return {
        login: <string>null,
        fetchedDt: <string>null,
        dob: <string>null,
        lastOnlineDt: <string>null,

        fullName: S.opt(Dom.get(dom).any('.page_name')[0])
            .map(h => h.textContent.trim()).def(null),
        lastOnline: Dom.get(dom).any('.profile_online > *')
            .map(h => h.textContent.trim()).slice(-1)[0],
        fromPhone: Dom.get(dom).any('.profile_mob_onl:not(.unshown)').length > 0,
        imgUrl: S.opt(Dom.get(dom).img('.page_avatar_img')[0])
            .map(h => h.src).def(null),
        moodText: S.opt(Dom.get(dom).any('.page_current_info .current_text')[0])
            .map(h => h.textContent.trim()).def(null),
        counters: S.opt(Dom.get(dom).any('.counts_module')[0])
            .map(parsePageCounters).def(null),
        profileInfoShort: S.opt(Dom.get(dom).any('.profile_info_short')[0])
            .map(parseProfileInfoBlock).def(null),
        profileInfoLong: S.opt(Dom.get(dom).any('.profile_info_full')[0])
            .map(parseProfileInfoLong).def(null),
        lastImgUrls: S.list(Dom.get(dom).any('.page_photos_module > *'))
            .fop(extractBgImgUrl).s,
        modules: Dom.get(dom).any('.page_block aside > .module')
            .map(parseModule),
        ownPostCount: S.opt(Dom.get(dom).input('#page_wall_count_own')[0])
            .map(i => i.value).def(null),
        allPostCount: S.opt(Dom.get(dom).input('#page_wall_count_all')[0])
            .map(i => i.value).def(null),
        posts: Dom.get(dom).any('.wall_posts .post')
            .map(parsePost),
    };
};

let data_sample = 1?null: ParseProfile(null);
export type parsed_profile_t = typeof data_sample;
