
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
            let label = S.opt(Dom.get(row).any('.label')[0]).map(l => l.innerText.trim()).def(null);
            let labeled = S.opt(Dom.get(row).any('.labeled')[0]).map(l => l.innerText.trim()).def(null);
            result[label] = labeled;
        }
        return result;
    };

    let parseProfileInfoLong = function(dom: HTMLElement) {
        let result: {[k: string]: {[k: string]: string}} = {};
        for (let row of Dom.get(dom).any('.profile_info_block')) {
            let header = S.opt(Dom.get(row).any('.profile_info_header')[0]).map(l => l.innerText.trim()).def(null);
            let block = Dom.get(row).any('.profile_info')[0];
            if (!block) continue;
            result[header] = parseProfileInfoBlock(block);
        }
        return result;
    };

    let parsePageCounters = function(dom: HTMLElement) {
        let result: {[k: string]: string} = {};
        for (let row of Dom.get(dom).any('.page_counter')) {
            let label = S.opt(Dom.get(row).any('.label')[0]).map(l => l.innerText.trim()).def(null);
            let labeled = S.opt(Dom.get(row).any('.count')[0]).map(l => l.innerText.trim()).def(null);
            result[label] = labeled;
        }
        return result;
    };

    let extractBgImgUrl = (dom: HTMLElement) =>
        S.opt(dom.style.backgroundImage.match(/url\([\"\'](.*?)[\"\']\)/)).map(m => m[1]);

    let parseReply = (dom: HTMLElement) => 1 && {
        login: S.opt(Dom.get(dom).a('.reply_author a')[0]).map(a => a.getAttribute('href')).def(null),
        dt: S.opt(Dom.get(dom).any('.reply_date')[0]).map(h => h.innerText.trim()).def(null),
        text: S.opt(Dom.get(dom).any('.wall_reply_text')[0]).map(h => h.innerText.trim()).def(null),
    };

    let parsePost = (dom: HTMLElement) => 1 && {
        login: S.opt(Dom.get(dom).a('.post_author a')[0]).map(a => a.getAttribute('href')).def(null),
        dt: S.opt(Dom.get(dom).any('.post_date')[0]).map(h => h.innerText.trim()).def(null),
        text: S.opt(Dom.get(dom).any('.published_comment .wall_post_text')[0]).map(h => h.innerText.trim()).def(null)
            || S.opt(Dom.get(dom).any('.post_content > .post_info > .wall_text .wall_post_text')[0]).map(h => h.innerText.trim()).def(null),
        originalLogin: S.opt(Dom.get(dom).a('.copy_post_author a')[0]).map(a => a.getAttribute('href')).def(null),
        originalDt: S.opt(Dom.get(dom).any('.copy_post_date')[0]).map(h => h.innerText.trim()).def(null),
        originalText: S.opt(Dom.get(dom).any('.copy_quote .wall_post_text')[0]).map(h => h.innerText.trim()).def(null),
        postImgUrl: S.opt(Dom.get(dom).any('.wall_text .image_cover')[0]).fap(extractBgImgUrl).def(null),
        peopleLiked: S.opt(Dom.get(dom).any('.post_full_like .post_like_count')[0]).map(h => h.innerText.trim()).def(null),
        peopleSaw: S.opt(Dom.get(dom).any('.post_views .post_views_count')[0]).map(h => h.innerText.trim()).def(null),
        replies: Dom.get(dom).any('.replies .reply').map(parseReply),
    };

    return {
        fullName: S.opt(Dom.get(dom).any('.page_name')[0]).map(h => h.innerText.trim()).def(null),
        lastOnline: S.opt(Dom.get(dom).any('.profile_online > :not([style="display: none;"])')[0]).map(h => h.innerText.trim()).def(null),
        imgUrl: S.opt(Dom.get(dom).img('.page_avatar_img')[0]).map(h => h.src).def(null),
        moodText: S.opt(Dom.get(dom).any('.page_current_info .current_text')[0]).map(h => h.innerText.trim()).def(null),
        counters: S.opt(Dom.get(dom).any('.counts_module')[0]).map(parsePageCounters).def(null),
        profileInfoShort: S.opt(Dom.get(dom).any('.profile_info_short')[0]).map(parseProfileInfoBlock).def(null),
        profileInfoLong: S.opt(Dom.get(dom).any('.profile_info_full')[0]).map(parseProfileInfoLong).def(null),
        lastImgUrls: S.list(Dom.get(dom).any('.page_photos_module > *')).fop(extractBgImgUrl).s,
        ownPostCount: S.opt(Dom.get(dom).input('#page_wall_count_own')[0]).map(i => i.value).def(null),
        allPostCount: S.opt(Dom.get(dom).input('#page_wall_count_all')[0]).map(i => i.value).def(null),
        posts: Dom.get(dom).any('.wall_posts .post').map(parsePost),
    };
};