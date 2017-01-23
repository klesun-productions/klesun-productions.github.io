/// <reference path="../references.ts" />

import {S} from "./S";
import {Opt, Tls} from "./Tls";

interface IWrappedDom<T extends HTMLElement> {
    s: T,
    trigger: (eventType: string) => IWrappedDom<T>,
    with: (cb: (arg: T) => void) => IWrappedDom<T>,
}

interface IDomParams {
    className?: string,
    children?: IWrappedDom<HTMLElement>[],
    innerHTML?: string,
    onclick?: (e: Event) => void,
    style?: {[prop: string]: string},
}

interface IFormParams extends IDomParams {
    onsubmit?: (e: Event) => void,
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

interface IButtonParams extends IDomParams {
    type?: 'submit' | 'button',
}

/** contains shortcut method to operate with DOM */
export let Dom = (function()
{
    let $$ = (s: string): HTMLElement[] => (<HTMLElement[]>[...document.querySelectorAll(s)]);

    let wrap = function<T extends HTMLElement>(dom: T, params: IDomParams)
    {
        Opt(params.className).get = v => dom.className = v;
        Opt(params.innerHTML).get = v => dom.innerHTML = v;
        Opt(params.onclick).get = v => dom.onclick = v;
        Opt(params.style).get = v => S.list(Object.keys(v)).forEach = k => dom.style[k] = v[k];

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
        br: (params?: IDomParams) => wrap(<HTMLBRElement>document.createElement('br'), params || {}),
        button: (params?: IButtonParams) =>
            wrap(<HTMLButtonElement>document.createElement('button'), params || {})
                .with(dom => Opt(params.type).get = v => dom.type = v),
        tr: (params?: IDomParams) => wrap(<HTMLTableRowElement>document.createElement('tr'), params || {}),
        td: (params?: IDomParams) => wrap(<HTMLTableCellElement>document.createElement('td'), params || {}),
        label: (params?: IDomParams) => wrap(<HTMLLabelElement>document.createElement('label'), params || {}),
        form: (params?: IFormParams) =>
            wrap(<HTMLFormElement>document.createElement('form'), params || {})
                .with(dom => dom.onsubmit = e => {
                    e.preventDefault();
                    Opt(params.onsubmit).get = v => v(e);
                }),
        input: (params: IInputParams = {}) =>
            wrap(<HTMLInputElement>document.createElement('input'), params)
                .with(dom => {
                    Opt(params.type).get = v => dom.setAttribute('type', v);
                    Opt(params.value).get = v => dom.value = v;
                    Opt(params.onchange).get = v => dom.onchange = v;
                }),

        flag: (params: IFlagParams = {}) => {
            params.type = 'checkbox';
            let wrapped = mk.input(params);
            return wrapped.with(dom => Opt(params.checked).get = v => dom.checked = v)
        },
        select: (params: ISelectParams = {}) =>
            wrap(<HTMLSelectElement>document.createElement('select'), params)
                .with(dom => {
                    Opt(params.multiple).get = v => dom.setAttribute('multiple', v + '');
                    Opt(params.onchange).get = v => dom.onchange = v;
                }),

        option: (params?: IOptionParams) =>
            wrap(<HTMLOptionElement>document.createElement('option'), params || {})
                .with(dom => {
                    Opt(params.value).get = v => dom.value = v;
                    Opt(params.disabled).get = v => dom.disabled = v;
                    Opt(params.selected).get = v => dom.selected = v;
                }),
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
                .filter(dom => dom.tagName.toLowerCase() === tagName.toLowerCase());
        };
        return {
            a: (selector?: string) => <HTMLAnchorElement[]>match('a', selector),
            input: (selector?: string) => <HTMLInputElement[]>match('input', selector),
            img: (selector?: string) => <HTMLImageElement[]>match('img', selector),
        };
    };

    return {
        showMessageDialog: showMessageDialog,
        showMultiInputDialog: showMultiInputDialog,
        showInputDialog: showInputDialog,
        showPasswordDialog: showPasswordDialog,
        promptSelect: promptSelect,
        mk: mk,
        get: get,
    };
})();
