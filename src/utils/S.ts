
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

            groupBy: (f: (el: Tel) => number): {[k: number]: Tel[]} => {
                let result: {[k: number]: Tel[]} = {};
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

        list: list,
    };
})();