interface Set<T> {
    add(value: T): Set<T>;
    clear(): void;
    delete(value: T): boolean;
    entries(): Array<[T, T]>;
    forEach(callbackfn: (value: T, index: T, set: Set<T>) => void, thisArg?: any): void;
    has(value: T): boolean;
    keys(): Array<T>;
}

interface SetConstructor {
    new <T>(): Set<T>;
    new <T>(iterable: Array<T>): Set<T>;
}
declare var Set: SetConstructor;

interface ObjectConstructor {
    entries: <T>(obj: {[k: string]: T}) => [string, T][],
    entries: <T>(obj: {[k: number]: T}) => [number, T][],
};

declare var Object: ObjectConstructor;

interface KeyboardEvent {
    code: string,
}
interface Array<T> {
    findIndex(predicate: (value: T, i: number) => boolean): number,
}
