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
    flatMap<B>(func: (el: T) => B[]): B[],
}
declare var Date: {
    UTC: (str: string) => number,
};


interface FetchOptions {
    method?: "GET" | "POST" | "DELETE" | "PATCH" | "PUT" | "HEAD" | "OPTIONS" | "CONNECT";
    headers?: any;
    body?: any;
    mode?: "cors" | "no-cors" | "same-origin";
    credentials?: "omit" | "same-origin" | "include";
    cache?: "default" | "no-store" | "reload" | "no-cache" | "force-cache" | "only-if-cached";
    redirect?: "follow" | "error" | "manual";
    referrer?: string;
    referrerPolicy?: "referrer" | "no-referrer-when-downgrade" | "origin" | "origin-when-cross-origin" | "unsafe-url";
    integrity?: any;
}

declare enum ResponseType {
	Basic,
	Cors,
	Default,
	Error,
	Opaque
}

interface Headers {
	append(name: string, value: string):void;
	delete(name: string):void;
	get(name: string): string;
	getAll(name: string): Array<string>;
	has(name: string): boolean;
	set(name: string, value: string): void;
}

interface Body {
	bodyUsed: boolean;
	arrayBuffer(): Promise<ArrayBuffer>;
	blob(): Promise<Blob>;
	formData(): Promise<FormData>;
	json(): Promise<JSON>;
	text(): Promise<string>;
}

interface Response extends Body {
	error(): Response;
	redirect(url: string, status?: number): Response;
	type: ResponseType;
	url: string;
	status: number;
	ok: boolean;
	statusText: string;
	headers: Headers;
	clone(): Response;
}

declare var fetch: (url: string, options: FetchOptions) => Promise<Response>;
declare var fetch: (url: string) => Promise<Response>;

declare module '*.js';
