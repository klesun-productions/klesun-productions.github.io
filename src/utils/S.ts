
/** S stands for "Shortcuts" */
export let S = {
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
};