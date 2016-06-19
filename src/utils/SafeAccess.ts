
/**
 * allows to define rules to describe some type and assert that
 * @param subj matches them
 * @return {Tout}|null
 */
export var SafeAccess = function<Tout>(subj: any, rule: (acc: ISafeAccess) => Tout): [Tout, Error]
{
    const isList = function<Tel>(elementRule: (acc: ISafeAccess) => Tel): Tel[]
    {
        if (!Array.isArray(subj)) {
            console.log(subj);
            throw new Error('Must be an array, but got something else');
        } else {
            return (<Array<any>>subj).map((el,i) => {
                var [valid, error] = SafeAccess(el, elementRule);
                if (!error) {
                    return valid;
                } else {
                    error.message = '[' + i + ']' + error.message;
                    throw error;
                }
            });
        }
    };

    const isNumber = function(): number
    {
        if (typeof subj !== 'number') {
            throw new Error('Must be a number, but got: ' + (typeof subj));
        } else {
            return subj;
        }
    };

    const sub = function<Tkey>(key: string, rule: (acc: ISafeAccess) => Tkey): Tkey
    {
        if (typeof subj !== 'object' || subj === null) {
            throw new Error('Must be a non-null dict, but got: ' + (typeof subj));
        } else if (!(key in subj)) {
            throw new Error('Must contain mandatory key [' + key + ']');
        } else {
            var [valid, error] = SafeAccess(subj[key], rule);
            if (!error) {
                return valid;
            } else {
                /** @debug */
                console.log(subj, key);
                error.message = '[' + key + ']' + error.message;
                throw error;
            }
        }
    };

    try {
        var result = rule({
            isList: isList,
            isNumber: isNumber,
            sub: sub,
        });
        return [result,null];
    } catch (err) {
        return [null,err];
    } 
};

// don't be confused, it is not return value, it
// is type of helper used during rule definition
interface ISafeAccess
{
    /** @throws Error in case of type mismatch */
    isList: <Tel>(elementRule: (acc: ISafeAccess) => Tel) => Tel[],
    /** @throws Error in case of type mismatch */
    isNumber: () => number,
    /** @throws Error in case key is not present */
    sub: <Tkey>(key: string, rule: (acc: ISafeAccess) => Tkey) => Tkey,
}