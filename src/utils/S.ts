
/** S stands for "Shortcuts" */
export let S = (function()
{
    let list = function<Tel>(iter: Iterable<Tel>)
    {
        let elmts = [...iter];
        return {
            clear: () => {
                var tmp = elmts;
                elmts = [];
                return tmp;
            },
            map: <Tel2>(f: (v: Tel, i: number) => Tel2) =>
                list(elmts.map(f)),

            slice: (from: number, to: number) =>
                list(elmts.slice(from, to)),

            sort: (f: (v: Tel) => string|number) =>
                list(elmts.sort((a,b) => f(a) > f(b) ? +1 : f(a) < f(b) ? -1 : 0)),

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
            set sequence(cb: (el: Tel, i: number) => {then: (r: any) => void}) {
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

    let opt = function<T>(value: T): IOpts<T>
    {
        let has = () => value !== null &&
        value !== undefined;
        // let exc = (err: Error): any => { throw err; };
        // exc(new Error('next time check has() before accessing the value'))

        let self: IOpts<T>;
        return self = {
            map: <T2>(f: (arg: T) => T2): IOpts<T2> => has()
                ? opt(f(value))
                : opt(null),

            def: (def: T): T => has()
                ? value
                : def,

            has: has,

            set get (cb: (value: T) => void) {
                if (has()) {
                    cb(value);
                }
            },

            uni: <T2>(some: (v: T) => T2, none: () => T2) => has()
                ? some(value)
                : none(),

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
        let self = {
            set then(receive: (result: T) => void) {
                if (done) {
                    receive(result);
                } else {
                    thens.push(receive);
                }
            },
            map: <T2>(f: (r: T) => T2) => promise(
                delayedReturn => self.then =
                (r: T) => delayedReturn(f(r))
            ),
        };
        return self;
    };

    return {
        /** stands for Tuple of 2 elements */
        T2: <T1, T2>(a: T1, b: T2): [T1, T2] => [a, b],
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
            Array.apply(null, Array(r - l)).map((nop: void, i: number) => l + i),

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

        list: list,
        opt: opt,
        promise: promise,
    };
})();

export interface IOpts<T> {
    map: <T2>(f: (arg: T) => T2) => IOpts<T2>,
    def: (def: T) => T,
    has: () => boolean,
    get: (value: T) => void,
    uni: <T2>(
        some: (v: T) => T2,
        none: () => T2
    ) => T2,
    err: (none: () => void) => {els: (value: T) => void},
}

export interface IPromise<T> {
    then: (result: T) => void,
    map: <T2>(f: (result: T) => T2) => IPromise<T2>,
}