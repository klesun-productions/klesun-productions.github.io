export const Dom = (tagName, attributes = {}, children = [], metaParams = {}) => {
    const dom = metaParams.namespace
        ? document.createElementNS(metaParams.namespace, tagName)
        : document.createElement(tagName);
    for (const [name, value] of Object.entries(attributes)) {
        if (['string', 'number'].includes(typeof value)) {
            dom.setAttribute(name, value);
        } else {
            dom[name] = value;
        }
    }
    if (['string', 'number'].includes(typeof children)) {
        dom.textContent = children;
    } else {
        for (const child of children) {
            dom.appendChild(child);
        }
    }
    return dom;
};

export const Svg = (tagName, attributes = {}, children = []) =>
    Dom(tagName, attributes, children, {
        namespace: 'http://www.w3.org/2000/svg',
    });