/**
 * @param {string} tagName
 * @param {Record<string, string | number | Function>} attributes
 * @param {string | number | HTMLElement[]} children
 */
const Dom = (tagName, attributes = {}, children = []) => {
    const dom = document.createElement(tagName);
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

export default Dom;
