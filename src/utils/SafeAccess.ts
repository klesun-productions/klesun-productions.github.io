
import {IOpts} from "./S";
export type primitive_t = number | string | boolean;
export type valid_json_t = primitive_t | dict_t | num_dict_t;
export interface dict_t {[k: string]: valid_json_t};
export interface num_dict_t {[k: number]: valid_json_t};

/**
 * allows to define rules to describe some type and assert that
 * @param subj matches them
 * @return {Tout}|null
 */
export var SafeAccess = function<Tout>(subj: valid_json_t, rule: (acc: ISafeAccess) => Tout): [Tout, Error]
{
    const isList = function<Tel>(elementRule: (acc: ISafeAccess) => Tel): Tel[]
    {
        if (!Array.isArray(subj)) {
            // console.log(subj);
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

    const isString = function(): string
    {
        if (typeof subj !== 'string') {
            throw new Error('Must be a string, but got: ' + (typeof subj));
        } else {
            return subj;
        }
    };

    const isValidJson = function(): valid_json_t
    {
        return subj;
    };

    const custom = <T>(rule: (v: any) => IOpts<T>): T =>
        rule(subj).uni(v => v, () => { throw new Error('Must match custom rule - ' + rule); });

    const sub = function<Tkey>(key: string, rule: (acc: ISafeAccess) => Tkey): Tkey
    {
        if (typeof subj !== 'object' || subj === null) {
            throw new Error('Must be a non-null dict, but got: ' + (typeof subj));
        } else if (!(key in subj)) {
            throw new Error('Must contain mandatory key [' + key + ']');
        } else {
            let typed = <dict_t>subj;
            var [valid, error] = SafeAccess(typed[key], rule);
            if (!error) {
                return valid;
            } else {
                error.message = '[' + key + ']' + error.message;
                throw error;
            }
        }
    };

    try {
        var result = rule({
            isList: isList,
            isNumber: isNumber,
            isString: isString,
            isValidJson: isValidJson,
            custom: custom,
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
    /** @throws Error in case of type mismatch */
    isString: () => string,
    /** @throws Error in case of type mismatch */
    isValidJson: () => valid_json_t,
    /** @throws Error in case of type mismatch */
    custom: <T>(rule: (v: any) => IOpts<T>) => T,
    /** @throws Error in case key is not present */
    sub: <Tkey>(key: string, rule: (acc: ISafeAccess) => Tkey) => Tkey,
}