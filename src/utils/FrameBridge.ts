
import {S, IOpts, IPromise} from "./S";
import {SafeAccess} from "./SafeAccess";

class event_page_loaded_t {
    eventType: 'pageLoaded';
    eventData = new class {
        pageHtml: string;
    };
}

class event_backward_post_response_t {
    eventType: 'backwardPostResponse';
    reference: string;
    response: string;
}

export let FrameBridge = (function()
{
    /** if handler returns true, than means it's done and must be removed */
    let handlers = S.list(<Array<{
        frame: Window,
        then: (data: valid_json_t) => boolean,
    }>>[]);

    let castPageLoaded = function(data: valid_json_t): IOpts<event_page_loaded_t> {
        // TODO: this likely can be automated using reflection since we no more work with an interface
        let [typed, error] = SafeAccess(data, a => 1 && {
            eventType: a.sub('eventType', a => a.custom(v => S.opt<'pageLoaded'>(v === 'pageLoaded' ? v : null))),
            eventData: a.sub('eventData', a => 1 && {
                pageHtml: a.sub('pageHtml', a => a.isString()),
            }),
        });
        if (!error) {
            return S.opt(typed);
        } else {
            return S.opt(null);
        }
    };

    let castBackwardPostResponse = function(data: valid_json_t): IOpts<event_backward_post_response_t> {
        // TODO: this likely can be automated using reflection since we no more work with an interface
        let [typed, error] = SafeAccess(data, a => 1 && {
            eventType: a.sub('eventType', a => a.custom(v => S.opt<'backwardPostResponse'>(v === 'backwardPostResponse' ? v : null))),
            reference: a.sub('reference', a => a.isString()),
            response: a.sub('response', a => a.isString()),
        });
        if (!error) {
            return S.opt(typed);
        } else {
            return S.opt(null);
        }
    };

    window.onmessage = function (messageEvent: MessageEvent) {
        let done = false;
        handlers.forEach = (handler, i) => {
            if (handler.frame === messageEvent.source) {
                done = handler.then(messageEvent.data);
                if (done) {
                    handlers.s.splice(i, 1);
                }
            }
        };
        if (!done) {
            console.log('Unrecognized window message', messageEvent);
        }
    };


    let lastId = 0;
    let makeId = () => ++lastId + '';

    return {
        /**
         * retrieve web page using frame
         * allows CORS unlike XMLHttpRequest
         */
        getPage: (url: string) => S.promise<HTMLElement>(delayedReturn => {
            // TODO: use frame instead of window.open to preserve focus
            let frame = window.open(url, null, 'width=50, height=50, top=50, left=50');
            handlers.more = {
                frame: frame,
                then: (data) => castPageLoaded(data).uni(
                    typed => {
                        frame.close();
                        let text = typed.eventData.pageHtml;
                        let pageDom = new DOMParser()
                            .parseFromString(text, 'text/html')
                            .documentElement;
                        delayedReturn(pageDom);
                        return true;
                    },
                    () => false
                ),
            };
        }),
        // TODO: test, blind refactoring
        sendPostThroughFrame: (frame: Window, url: string, params: valid_json_t) =>
            S.promise(delayedReturn => {
                let reference = makeId();
                frame.postMessage({
                    eventType: 'forwardPostRequest',
                    url: url,
                    reference: reference,
                    params: params,
                }, '*');
                handlers.more = {
                    frame: frame,
                    then: (data) => castBackwardPostResponse(data).uni(
                        typed => {
                            if (typed.reference == reference) {
                                delayedReturn(typed.response);
                                return true;
                            } else {
                                return false;
                            }
                        },
                        () => false
                    ),
                };
            }),
    };
})();