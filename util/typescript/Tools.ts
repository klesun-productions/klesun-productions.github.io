
var Ns:any = Ns || {};
// TODO: Util is too long
var Util:any = Util || {};

// some usefull shorthand methods

class Optional<T>
{
    constructor(private isPresent: boolean, private value?: T) {}

    static of<T>(value: T): Optional<T>
    {
        return new Optional(true, value);
    }

    static no<T>(): Optional<T>
    {
        return new Optional(false, null);
    }

    get = () => this.value;
    has = () => this.isPresent;
}

/** @param chunkSize - count of elements that will be foreached in one iteration
 * @param breakMillis - break duration between iterations */
Ns.forChunk = function<Tx>(list: Tx[], breakMillis: number, chunkSize: number, callback: { ($el: Tx): void })
{
    var interrupted = false;

    var doNext = function(index: number)
    {
        if (index < list.length && !interrupted) {
            for (var i = index; i < Math.min(list.length, index + chunkSize); ++i) {
                callback(list[i]);
            }
            setTimeout(() => doNext(index + chunkSize), breakMillis);
        }
    };

    doNext(0);

    var interrupt = () => (interrupted = true);

    return interrupt;
};
Util.forEachBreak = Ns.forChunk;


Ns.range = (l: number, r: number): Array<number> => Array.apply(null, Array(r - l))
    .map((nop: void, i: number) => l + i);

Util.range = Ns.range;