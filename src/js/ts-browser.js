
/**
 * @module ts-browser - like ts-node, this tool allows you
 * to require typescript files and compiles then on the fly
 *
 * though in order to use it, you'll need a very specific import pattern in all files
 */

const addPathToUrl = (path, url) => {
    let result;
    if (path.startsWith('/')) {
        // full path from the site root
        result = path;
    } else if (!path.startsWith('./') && !path.startsWith('../')) {
        // apparently, typescript compiler marks paths from root this way
        // src/utils/Dom, weird, but ok
        result = '/' + path;
    } else {
        const urlParts = url.split('/');
        const pathParts = path.split('/');

        if (urlParts.slice(-1)[0] !== '') {
            // does not end with a slash - script, not directory
            urlParts.pop();
        }

        // getting rid of trailing slashes if any
        while (pathParts[0] === '') pathParts.shift();
        while (urlParts.slice(-1)[0] === '') urlParts.pop();

        while (pathParts.length > 0 && urlParts.length > 0) {
            if (pathParts[0] === '.') {
                pathParts.shift();
            } else if (pathParts[0] === '..') {
                pathParts.shift();
                urlParts.pop();
            } else {
                break;
            }
        }
        result = urlParts.join('/') + '/' + pathParts.join('/');
    }
    result = result.endsWith('.ts') || result.endsWith('.js') ? result : result + '.ts';

    return result;
};

const parseSyntaxTree = tsCode => {
    const sourceFile = window.ts.createSourceFile('ololo.ts', tsCode);
    const root = {};

    /** @param {ts.Node} node */
    const makeTree = (node) => {
        const children = [];
        window.ts.forEachChild(node, subNode => {
            children.push(makeTree(subNode));
        });
        const {pos, end} = node;
        return {
            kind: window.ts.SyntaxKind[node.kind],
            node, children,
            text: tsCode.slice(pos, end),
        };
    };

    return makeTree(sourceFile);
};

/**
 * @param {ts.ImportClause} importClause - `{Field1, Field2}`
 */
const es6ToDestr = (tsCode, importClause) => {
    const {pos, end} = importClause;
    const text = tsCode.slice(pos, end);
    const {namedBindings = null, name = null} = importClause;
    if (namedBindings) {
        const {elements = [], name = null} = namedBindings;
        if (elements.length > 0) {
            // `import {A, B, C} from './module';`
            return 'const ' + text;
        } else if (name && name.escapedText) {
            return 'const ' + name.escapedText;
        } else {
            const exc = new Error('Unsupported namedBindings');
            exc.data = {namedBindings, text};
            throw exc;
        }
    } else if (name && name.escapedText) {
        // `import DefaultClass from './module';`
        return 'const {default: ' + text + '}';
    } else {
        const exc = new Error('Unsupported importClause');
        exc.data = {importClause, text};
        throw exc;
    }
};

/** @param {ts.SourceFile} sourceFile */
const loadDependencies = async ({baseUrl, tsCode, sourceFile}) => {
    const importLinePromises = [];
    let tsCodeImports = '';
    let tsCodeAfterImports = '';
    for (const statement of sourceFile.statements) {
        const kindName = window.ts.SyntaxKind[statement.kind];
        if (kindName === 'ImportDeclaration') {
            const relPath = statement.moduleSpecifier.text;
            const newUrl = addPathToUrl(relPath, baseUrl);
            window['ts-browser-module-promises'] = window['ts-browser-module-promises'] || {};
            window['ts-browser-loaded-modules'] = window['ts-browser-loaded-modules'] || {};

            if (!window['ts-browser-module-promises'][newUrl]) {
                window['ts-browser-module-promises'][newUrl] = loadModulePlain(newUrl);
                const loadedModule = await window['ts-browser-module-promises'][newUrl];
                window['ts-browser-loaded-modules'][newUrl] = loadedModule;
            } else if (!window['ts-browser-loaded-modules'][newUrl]) {
                // from position of an app writer, it would be better to just not use circular
                // references, but since typescript supports them somewhat, so should I I guess
                let loadedModule = null;
                window['ts-browser-module-promises'][newUrl].then(module => loadedModule = module);
                window['ts-browser-loaded-modules'][newUrl] = new Proxy({}, {
                    get: (target, name) => {
                        return new Proxy(() => {}, {
                            apply: (target, thisArg, argumentsList) => {
                                if (loadedModule) {
                                    return loadedModule[name].apply(thisArg, argumentsList);
                                } else {
                                    throw new Error('Tried to call ' + name + ' on a circular reference ' + newUrl);
                                }
                            },
                            get: (target, subName) => {
                                if (loadedModule) {
                                    return loadedModule[name][subName];
                                } else {
                                    throw new Error('Tried to get field ' + name + '.' + subName + ' on a circular reference ' + newUrl);
                                }
                            },
                        });
                    },
                });
            }
            const assignedValue = 'window[\'ts-browser-loaded-modules\'][' + JSON.stringify(newUrl) + ']';
            const {importClause = null} = statement;
            if (importClause) {
                // can be not set in case of side-effectish `import './some/url.css';`
                tsCodeImports += es6ToDestr(tsCode, importClause) + ' = ' + assignedValue + ';\n';
            }
        } else {
            const {pos, end} = statement;
            tsCodeAfterImports += tsCode.slice(pos, end) + '\n';
        }
    }
    const tsCodeResult = tsCodeImports + tsCodeAfterImports;
    const jsCode = window.ts.transpile(tsCodeResult, {
        module: 5 /* ES2015 */, target: 99,
    });
    return jsCode;
};

/** @return {Promise<Module>} - just  */
export const loadModulePlain = (absUrl) => {
    return fetch(absUrl)
        .then(rs => rs.text())
        .then(async tsCode => {
            const sourceFile = window.ts.createSourceFile('ololo.ts', tsCode);
            let jsCode = await loadDependencies({
                baseUrl: absUrl, tsCode, sourceFile,
            });
            jsCode += '\n//# sourceURL=' + absUrl;
            const module = await import('data:text/javascript;base64,' + btoa(jsCode));
            return module;
        });
};

/** @return {Promise<any>} */
export const loadModule = (absUrl) => {
    return loadModulePlain(absUrl);
    // .then(es6Module => {
    //     return es6Module.initTsModule({
    //         importTs: (relPath) => {
    //             const newUrl = addPathToUrl(relPath, absUrl);
    //             return loadModule(newUrl);
    //         },
    //         importTsPlain: (relPath) => {
    //             const newUrl = addPathToUrl(relPath, absUrl);
    //             return loadModulePlain(newUrl);
    //         },
    //     });
    // });
};