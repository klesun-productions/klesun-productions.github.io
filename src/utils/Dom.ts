/// <reference path="../references.ts" />

import {S} from "./S";

interface IWrappedDom<T extends HTMLElement> {
    s: T,
    trigger: (eventType: string) => IWrappedDom<T>,
    with: (cb: (arg: T) => void) => IWrappedDom<T>,
}

interface IDomParams {
    className?: string,
    children?: IWrappedDom<HTMLElement>[],
    innerHTML?: string,
    title?: string,
    onclick?: (e: Event) => void,
    style?: {[prop: string]: string},
}

interface ITdParams extends IDomParams {
    colSpan?: number,
}

interface IFormParams extends IDomParams {
    onsubmit?: (e: Event) => void,
}

interface IAnchorParams extends IDomParams {
    href: string,
}

interface IInputParams extends IDomParams {
    type?: 'string' | 'text' | 'button' | 'checkbox' | 'password' | 'file',
    value?: string,
    onchange?: (e: Event) => void,
}

interface IFlagParams extends IInputParams {
    checked?: boolean,
}

interface ISelectParams extends IDomParams {
    onchange?: (e: Event) => void,
    multiple?: boolean,
}

interface IOptionParams extends IDomParams {
    value?: string,
    disabled?: boolean,
    selected?: boolean,
}

interface IImgParams extends IDomParams {
    src?: string,
}

interface IBrParams extends IDomParams {
    clear?: 'all',
}

interface IButtonParams extends IDomParams {
    type?: 'submit' | 'button',
}

/** contains shortcut method to operate with DOM */
export let Dom = (function()
{
    let $$ = (s: string): HTMLElement[] => (<HTMLElement[]>[...document.querySelectorAll(s)]);

    let wrap = function<T extends HTMLElement>(dom: T, params: IDomParams = {})
    {
        S.opt(params.className).get = v => dom.className = v;
        S.opt(params.innerHTML).get = v => dom.innerHTML = v;
        S.opt(params.onclick).get = v => dom.onclick = v;
        S.opt(params.style).get = v => S.list(Object.keys(v)).forEach = k => dom.style[k] = v[k];

        S.list(params.children || []).forEach = c => dom.appendChild(c.s);

        let self: IWrappedDom<T> = null;
        return self = {
            s: dom,
            trigger: function(eventType: string) {
                dom.dispatchEvent(new CustomEvent(eventType));
                return self;
            },
            // perform actions with subject and return to wrapper context
            with: function(cb: (arg: T) => void) {
                cb(dom);
                return self;
            },
        };
    };

    let mk = {
        div: (params?: IDomParams) => wrap(<HTMLDivElement>document.createElement('div'), params || {}),
        span: (params?: IDomParams) => wrap(<HTMLSpanElement>document.createElement('span'), params || {}),
        a: (params?: IAnchorParams) =>
            wrap(<HTMLAnchorElement>document.createElement('a'), params || {})
                .with(dom => S.opt(params.href).get = v => dom.href = v),
        br: (params?: IBrParams) => wrap(<HTMLBRElement>document.createElement('br'), params || {})
            .with(dom => S.opt(params).map(p => p.clear).get = v => dom.clear = v),
        li: (params?: IDomParams) => wrap(<HTMLLIElement>document.createElement('li'), params || {}),
        button: (params?: IButtonParams) =>
            wrap(<HTMLButtonElement>document.createElement('button'), params || {})
                .with(dom => S.opt(params.type).get = v => dom.type = v),
        tr: (params?: IDomParams) => wrap(<HTMLTableRowElement>document.createElement('tr'), params || {}),
        td: (params?: ITdParams) =>
            wrap(<HTMLTableCellElement>document.createElement('td'), params || {})
                .with(dom => S.opt(params.colSpan).get = v => dom.colSpan = v),
        label: (params?: IDomParams) => wrap(<HTMLLabelElement>document.createElement('label'), params || {}),
        form: (params?: IFormParams) =>
            wrap(<HTMLFormElement>document.createElement('form'), params || {})
                .with(dom => dom.onsubmit = e => {
                    e.preventDefault();
                    S.opt(params.onsubmit).get = v => v(e);
                }),
        input: (params: IInputParams = {}) =>
            wrap(<HTMLInputElement>document.createElement('input'), params)
                .with(dom => {
                    S.opt(params.type).get = v => dom.setAttribute('type', v);
                    S.opt(params.value).get = v => dom.value = v;
                    S.opt(params.onchange).get = v => dom.onchange = v;
                }),

        flag: (params: IFlagParams = {}) => {
            params.type = 'checkbox';
            let wrapped = mk.input(params);
            return wrapped.with(dom => S.opt(params.checked).get = v => dom.checked = v)
        },
        select: (params: ISelectParams = {}) =>
            wrap(<HTMLSelectElement>document.createElement('select'), params)
                .with(dom => {
                    S.opt(params.multiple).get = v => dom.setAttribute('multiple', v + '');
                    S.opt(params.onchange).get = v => dom.onchange = v;
                }),

        option: (params?: IOptionParams) =>
            wrap(<HTMLOptionElement>document.createElement('option'), params || {})
                .with(dom => {
                    S.opt(params.value).get = v => dom.value = v;
                    S.opt(params.disabled).get = v => dom.disabled = v;
                    S.opt(params.selected).get = v => dom.selected = v;
                }),
        img: (params?: IImgParams) =>
            wrap(<HTMLImageElement>document.createElement('img'), params || {})
                .with(dom => S.opt(params.src).get = v => dom.src = v),
    };

    let showDialog = function(content: HTMLElement)
    {
        let dialog = mk.div({
            className: 'modal-dialog',
            children: [wrap(content, {})],
            style: {
                'position': 'absolute',
                'left': '50%',
                'top': '50%',
                'transform': 'translate(-50%, -50%)',
                'background-color': 'lightgrey',
                'z-index': '1002',
                'padding': '6px',
                'box-shadow': 'rgba(30, 121, 151, 20.701961) 0px 0px 180px 80px',
                'min-width': '20%',
            },
        });

        // TODO: escape - cancel
        $$('body')[0].appendChild(dialog.s);

        return () => { dialog.s.remove(); };
    };

    let showMultiInputDialog = function<T>(msg: string, initialData: T)
    {
        let result = {then: (changedData: T) => {}};
        let inputs = Object.keys(initialData).map(k => 1 && {
            key: k,
            val: mk.input({type: 'text', value: (<any>initialData)[k]}),
        });
        let okNutton = null;

        let ok = () => {
            S.list(inputs).forEach = pair =>
                (<any>initialData)[pair.key] = !pair.val.s.disabled
                    ? pair.val.s.value
                    : null;
            result.then(initialData);
        };

        let close = showDialog(mk.form({
            children: [
                mk.label({innerHTML: msg}),
                mk.div({style: {'text-align': 'right'}, children: inputs
                    .map(i => [
                        mk.label({innerHTML: i.key + ': '}),
                        i.val,
                        mk.label({innerHTML: 'null: '}),
                        mk.flag({
                            checked: i.val.s.value === '',
                            onchange: e => i.val.s.disabled = e.target.checked,
                        }).trigger('change'),
                        mk.br(),
                    ])
                    .reduce((a,b) => a.concat(b))
                }),
                okNutton = mk.button({innerHTML: 'Ok', style: {float: 'right'}}),
                mk.button({
                    innerHTML: 'Cancel',
                    type: 'button',
                    onclick: () => { close(); }, style: {float: 'right'},
                }),
            ],
            onsubmit: () => { ok(); close(); },
        }).s);
        okNutton.s.focus();

        return result;
    };

    let showInputDialog = function<T>(msg: string, value?: T | null)
    {
        value = value === undefined ? null : value;

        let result = {then: (field: T | null) => {}};
        Dom.showMultiInputDialog(msg, {value: value})
            .then = (fields) => result.then(fields.value);
        return result;
    };

    let showMessageDialog = function(msg: string)
    {
        let result = {then: () => {}};
        let button;
        let closeDialog = showDialog(mk.form({
            children: [
                mk.div({
                   children: [mk.label({innerHTML: msg, })],
                    style: {'background-color': 'white'}
                }),
                button = mk.button({innerHTML: 'Ok', style: {float: 'right'}}),
            ],
            onsubmit: () => { closeDialog(); result.then(); },
        }).with(dom => {
            dom.onblur = console.log;
        }).s);
        button.s.focus();
        return result;
    };

    let showPasswordDialog = function(cb: (txt: string) => void)
    {
        let inp = mk.input({type: 'password'});
        let closeDialog = showDialog(mk.form({
            children: [
                mk.label({innerHTML: 'Password: '}),
                inp,
                mk.button({innerHTML: 'Ok', style: {float: 'right'}}),
                mk.button({innerHTML: 'Cancel', type: 'button', style: {float: 'right'}, onclick: () => {
                    cb(null);
                    closeDialog();
                }}),
            ],
            onsubmit: () => { cb(inp.s.value); closeDialog(); },
        }).s);

        // TODO: enter from input - submit
        // TODO: initial focus
    };

    let promptSelect = (
        options: {[k: string]: () => void},
        message = 'It*s Time To Choose!'
    ) => {
        let closeDialog = showDialog(mk.div({children: [
            mk.label({innerHTML: message}),
            mk.br(),
            mk.select({
                multiple: true, // .attr('multiple', 'multiple');
                children: Object.keys(options).map(k =>
                    mk.option({value: k, innerHTML: k})),
                onchange: e => {
                    options[e.target.value]();
                    closeDialog();
                },
            }),
            mk.button({innerHTML: 'Cancel', onclick: () => { closeDialog(); }}),
        ]}).s);
    };

    let get = function(root?: HTMLElement) {
        let match = function(tagName: string, selector?: string) {
            selector = selector || tagName;
            return [...(root || document).querySelectorAll(selector)]
                .filter(dom => !tagName || dom.tagName.toLowerCase() === tagName.toLowerCase());
        };
        return {
            a: (selector?: string) => <HTMLAnchorElement[]>match('a', selector),
            input: (selector?: string) => <HTMLInputElement[]>match('input', selector),
            textarea: (selector?: string) => <HTMLTextAreaElement[]>match('textarea', selector),
            select: (selector?: string) => <HTMLSelectElement[]>match('select', selector),
            img: (selector?: string) => <HTMLImageElement[]>match('img', selector),
            ul: (selector?: string) => <HTMLUListElement[]>match('ul', selector),
            form: (selector?: string) => <HTMLFormElement[]>match('form', selector),
            canvas: (selector?: string) => <HTMLCanvasElement[]>match('canvas', selector),
            button: (selector?: string) => <HTMLButtonElement[]>match('button', selector),
            any: (selector?: string) => <HTMLElement[]>match(null, selector),
        };
    };

    return {
        showMessageDialog: showMessageDialog,
        showMultiInputDialog: showMultiInputDialog,
        showInputDialog: showInputDialog,
        showPasswordDialog: showPasswordDialog,
        promptSelect: promptSelect,
        mk: mk,
        wrap: wrap,
        get: get,
    };
})();
