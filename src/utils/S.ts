
/// <reference path="../references.ts" />

import {ParseProfile} from "../../entry/vk_chicks/utils/ParseProfile";

/** S stands for "Shortcuts" */
export let S = (function()
{
    let list = function<Tel>(iter: Iterable<Tel>)
    {
        let elmts: Tel[] = [...iter];
        return {
            clear: () => {
                var tmp = elmts;
                elmts = [];
                return tmp;
            },

            // transforms every element from T1 to T2
            map: <Tel2>(f: (v: Tel, i: number) => Tel2) =>
                list(elmts.map(f)),

            flt: (f: (v: Tel, i: number) => boolean) =>
                list(elmts.filter(f)),

            // run action on each element, return same list
            btw: (action: (el: Tel) => void) => {
                for (let el of elmts) {
                    action(el);
                }
                return list(elmts);
            },

            // map and filter. handy since there is helluva functions i return opt from
            fop: <Tel2>(f: (v: Tel, i: number) => IOpts<Tel2>) => {
                return list(elmts.map(f).filter(m => m.has()).map(m => m.unw()));
            },

            // map to opt and unwrap all
            unw: <Tel2>(f: (v: Tel, i: number) => IOpts<Tel2>) => {
                return list(elmts.map(f).map(m => m.unw()));
            },

            srt: (f: (el: Tel) => string | number) => {
                let weights = elmts.map(f);
                return list(S.range(0, elmts.length)
                    .sort((a,b) =>
                        weights[a] > weights[b] ? +1 :
                        weights[a] < weights[b] ? -1 : 0)
                    .map(idx => elmts[idx]));
            },
            rvr: () => list(elmts.reverse()),

            // unlike map(), it not only transforms elements,
            // but also changes the amount of elements
            flatMap: <Tel2>(f: (v: Tel, i: number) => Tel2[]) => {
                let result: Tel2[] = [];
                for (let i = 0; i < elmts.length; ++i) {
                    for (let changed of f(elmts[i], i)) {
                        result.push(changed);
                    }
                }
                return result;
            },

            slice: (from: number, to: number) =>
                list(elmts.slice(from, to)),

            chunk: (length: number) => {
                let chunks = [];
                let chunk = [];
                for (let i = 0; i < elmts.length; ++i) {
                    chunk.push(elmts[i]);
                    if ((i + 1) % length === 0) {
                        chunks.push(chunk.splice(0));
                    }
                }
                if (chunk.length > 0) {
                    chunks.push(chunk.splice(0));
                }
                return list(chunks);
            },

            sort: (f: (v: Tel) => string|number) =>
                list(elmts.sort((a:Tel,b:Tel) => f(a) > f(b) ? +1 : f(a) < f(b) ? -1 : 0)),

            groupBy: (f: (el: Tel) => number): {[k: number]: Tel[]} => {
                let result: {[k: number]: Tel[]} = {};
                for (let el of elmts) {
                    let k = f(el);
                    result[k] = result[k] || [];
                    result[k].push(el);
                }
                return result;
            },

            groupByS: (f: (el: Tel) => string): {[k: string]: Tel[]} => {
                let result: {[k: string]: Tel[]} = {};
                for (let el of elmts) {
                    let k = f(el);
                    result[k] = result[k] || [];
                    result[k].push(el);
                }
                return result;
            },

            set more(v: Tel) {
                elmts.push(v);
            },
            set forEach(cb: (el: Tel, i?: number) => void) {
                elmts.forEach(cb);
            },
            /** perform async operations on every element one by one */
            set sequence(cb: (el: Tel, i: number) => IPromise<any>) {
                let i = 0;
                let next = () => {
                    if (i < elmts.length) {
                        cb(elmts[i], i++).then = next;
                    }
                };
                next();
            },
            get s() {
                return elmts;
            },
        };
    };

    /**
     * @param forceIsPresent - use when value may be null (when it's not typed mostly)
     */
    let opt = function<T>(value: T, forceIsPresent = false): IOpts<T>
    {
        let has = () => forceIsPresent ||
            value !== null && value !== undefined;

        let self: IOpts<T>;
        return self = {
            // "map"
            map: <T2>(f: (arg: T) => T2): IOpts<T2> => has()
                ? opt(f(value))
                : opt(null),

            fap: <T2>(f: (arg: T) => IOpts<T2>): IOpts<T2> => has()
                ? f(value)
                : opt(null),

            arr: () => has() ? [value] : [],

            // "filter"
            flt: (f: (arg: T) => boolean): IOpts<T> => has() && f(value)
                ? opt(value)
                : opt(null),

            // "safe"
            saf: <T2>(f: (arg: T) => T2): IOpts<T2> => {
                if (has()) {
                    try {
                        return opt(f(value))
                    } catch (exc) {
                        console.error('Opt mapping threw an exception', exc);
                    }
                }
                return opt(null);
            },

            // "unwrap"
            unw: () => {
                if (has()) {
                    return value;
                } else {
                    throw new Error('Tried to unwrap absent value!');
                }
            },

            // "default"
            def: (def: T): T => has()
                ? value
                : def,

            has: has,

            set get (cb: (value: T) => void) {
                if (has()) {
                    cb(value);
                }
            },

            // "with"
            wth: (f) => {
                if (has()) f(value);
                return self;
            },

            // "unify"
            uni: <T2>(some: (v: T) => T2, none: () => T2) => has()
                ? some(value)
                : none(),

            // "error"
            err: (none) => {
                if (has()) {
                    return {
                        set els (some: (value: T) => void) {some(value);},
                    };
                } else {
                    none();
                    return {
                        set els (some: (value: T) => void) {},
                    };
                }
            },
        };
    };

    let promise = function<T>(giveMemento: (delayedReturn: (result: T) => void) => void): IPromise<T>
    {
        let done = false;
        let result: T;
        let thens: Array<(r: T) => void> = [];
        giveMemento(r => {
            done = true;
            result = r;
            thens.forEach((cb) => cb(result));
        });
        let self: IPromise<T> = {
            set then(receive: (result: T) => void) {
                if (done) {
                    receive(result);
                } else {
                    thens.push(receive);
                }
            },
            map: <T2>(f: (r: T) => T2) => promise<T2>(
                delayedReturn => self.then =
                (r: T) => delayedReturn(f(r))
            ),
            now: () => S.opt(result, done),
        };
        return self;
    };

    return {
        /** stands for Tuple of 2 elements */
        T2: <T1, T2>(a: T1, b: T2): [T1, T2] => [a, b],
        /** stands for Tuple of 3 elements */
        T3: <T1, T2, T3>(a: T1, b: T2, c: T3): [T1, T2, T3] => [a, b, c],
        /** D stands for "Dictionary" */
        D: function<Tk, Tv>(subject: Map<Tk, Tv>) {
            return {
                s: subject,
                mapv: <Tv2>(f: (arg: Tv) => Tv2) =>
                    S.D(new Map([...subject].map(t => S.T2(t[0], f(t[1]))))),
                obj: function(): {[k: string]: Tv}
                {
                    let result: {[k: string]: Tv} = {};
                    for (let [k,v] of subject) {
                        result[''+k] = v;
                    }
                    return result;
                },
            };
        },
        /** expressive if */
        If: function(condition: boolean) {
            return {
                set then (cb: () => void) {
                    if (condition) {
                        cb();
                    }
                },
            };
        },
        range: (l: number, r: number): Array<number> =>
            new Array(r - l).fill(0).map((_, i) => l + i),

        /** wraps object keyed by number to an iterable thing */
        digt: <Tv>(obj: {[key: number]: Tv}) => {
            return {
                toList: <T2>(f: (v: Tv, k: number) => T2) =>
                    S.list(Object.keys(obj).map((k) => f(obj[+k], +k))),
                set forEach (f: (v: Tv, k: number) => void) {
                    Object.keys(obj).forEach((k) => f(obj[+k], +k))
                },
                s: obj,
            };
        },

        onDemand: <T>(f: () => T) => {
            let value: T = null;
            let demanded = false;
            return () => {
                if (demanded === false) {
                    demanded = true;
                    value = f();
                }
                return value;
            };
        },

        tuple: <T1, T2>(v1: T1, v2: T2): [T1, T2] => [v1, v2],
        t4: <Ta,Tb,Tc,Td>(a: Ta, b: Tb, c: Tc, d: Td): [Ta,Tb,Tc,Td] => [a,b,c,d],

        list: list,
        opt: opt,
        promise: promise,
    };
})();

let listSample = 1?null: S.list(null);
export type list_t = typeof listSample;

export interface IOpts<T> {
    // transform value if present
    map: <T2>(f: (arg: T) => T2) => IOpts<T2>,
    // Flat Map - transforms to anther optional if present
    fap: <T2>(f: (arg: T) => IOpts<T2>) => IOpts<T2>,
    arr: () => T[],
    // filter by predicate
    flt: (f: (arg: T) => boolean) => IOpts<T>,
    /** same as map, by catches exception */
    saf: <T2>(f: (arg: T) => T2) => IOpts<T2>,
    /** @throws Error */
    unw: () => T,
    // get value or use passed default
    def: (def: T) => T,
    // is value present
    has: () => boolean,
    // call passed function taking value if value present
    get: (value: T) => void,
    // call passed function taking value if value present
    // unlike get(), returns the IOpts instance
    wth: (f: (value: T) => void) => IOpts<T>,
    // transform both cases to value of single type
    uni: <T2>(
        some: (v: T) => T2,
        none: () => T2
    ) => T2,
    // call passed function if value is absent
    err: (none: () => void) => {els: (value: T) => void},
}

export interface IPromise<T> {
    then: (result: T) => void,
    map: <T2>(f: (result: T) => T2) => IPromise<T2>,
    now: () => IOpts<T>,
}
