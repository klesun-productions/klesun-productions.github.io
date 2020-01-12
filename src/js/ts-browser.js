
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

const modulePromises = {};
const resolutionUrlToParents = {};

const CACHE_LOADED = 'ts-browser-loaded-modules';

/** @param {ts.SourceFile} sourceFile */
const loadDependencies = ({baseUrl, tsCode, sourceFile, parents}) => {
    const importLinePromises = [];
    let tsCodeAfterImports = '';
    for (const statement of sourceFile.statements) {
        const kindName = window.ts.SyntaxKind[statement.kind];
        if (kindName === 'ImportDeclaration') {
            const relPath = statement.moduleSpecifier.text;
            const newUrl = addPathToUrl(relPath, baseUrl);
            const isCircular = parents.has(newUrl) ||
                [...parents].some(p => (resolutionUrlToParents[newUrl] || new Set()).has(p));
            window[CACHE_LOADED] = window[CACHE_LOADED] || {};

            let whenModule;
            if (!modulePromises[newUrl]) {
                resolutionUrlToParents[newUrl] = parents;
                whenModule = loadModulePlain(newUrl, new Set([...parents, newUrl])).then(module => {
                    return window[CACHE_LOADED][newUrl] = module;
                });
                modulePromises[newUrl] = whenModule;
            } else if (!window[CACHE_LOADED][newUrl] || isCircular) {
                // from position of an app writer, it would be better to just not use circular
                // references, but since typescript supports them somewhat, so should I I guess
                let loadedModule = null;
                modulePromises[newUrl]
                    .then(module => loadedModule = module);
                const fakeModule = new Proxy({}, {
                    get: (target, name) => {
                        return new Proxy(() => {}, {
                            apply: (callTarget, thisArg, argumentsList) => {
                                if (loadedModule) {
                                    return loadedModule[name].apply(thisArg, argumentsList);
                                } else {
                                    throw new Error('Tried to call ' + name + '() on a circular reference ' + newUrl + ': ' + [...parents].join(', '));
                                }
                            },
                            get: (target, subName) => {
                                if (loadedModule) {
                                    return loadedModule[name][subName];
                                } else {
                                    throw new Error('Tried to get field ' + name + '.' + subName + ' on a circular reference ' + newUrl + ': ' + [...parents].join(', '));
                                }
                            },
                        });
                    },
                });
                window[CACHE_LOADED][newUrl] = fakeModule;
                whenModule = Promise.resolve();
            } else {
                whenModule = modulePromises[newUrl];
            }
            importLinePromises.push(whenModule.then(() => {
                const cacheName = CACHE_LOADED;
                //const cacheName = !isCircular ? 'ts-browser-loaded-modules' : 'ts-browser-circular-modules';
                const assignedValue = 'window[' + JSON.stringify(cacheName) + '][' + JSON.stringify(newUrl) + ']';
                const {importClause = null} = statement;
                if (importClause) {
                    // can be not set in case of side-effectish `import './some/url.css';`
                    return es6ToDestr(tsCode, importClause) + ' = ' + assignedValue + ';';
                } else {
                    return '';
                }
            }));
        } else {
            const {pos, end} = statement;
            tsCodeAfterImports += tsCode.slice(pos, end) + '\n';
        }
    }
    return Promise.all(importLinePromises).then(importLines => {
        const tsCodeResult = importLines.join('\n') + '\n' + tsCodeAfterImports;
        const jsCode = window.ts.transpile(tsCodeResult, {
            module: 5, target: 5 /* ES2018 */,
        });
        return jsCode;
    });
};

/** @return {Promise<Module>} - just  */
export const loadModulePlain = (absUrl, parents = new Set()) => {
    return fetch(absUrl)
        .then(rs => rs.text())
        .then(async tsCode => {
            const sourceFile = window.ts.createSourceFile('ololo.ts', tsCode);
            let jsCode = await loadDependencies({
                baseUrl: absUrl, tsCode, sourceFile, parents,
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