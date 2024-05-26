
/**
 * prettify json, keep small objects inlined
 */
const JsExport = function($var, $margin, inlineLimit) {
    "use strict";
    const ind = "  ";
    $margin = $margin || "";
    inlineLimit = inlineLimit || 64;

    if ($var === undefined) {
        return "undefined";
    }

    return JSON.stringify($var).length < inlineLimit ? JSON.stringify($var)
        : Array.isArray($var)
            ? "[\n"
                + $var.map((el) => $margin + ind + JsExport(el, $margin + ind, inlineLimit)).join(",\n")
                + "\n" + $margin + "]"
            : (typeof $var === "object" && $var !== null)
                ? "{\n"
                + Object.keys($var).map(k => $margin + ind + JSON.stringify(k) + ": " + JsExport($var[k], $margin + ind, inlineLimit)).join(",\n")
                + "\n" + $margin + "}"
            // : (typeof $var === 'string' && $var.indexOf('\n') > -1)
            //     ? JsExport($var.split('\n'), $margin) + '.join("\\n")'
                : JSON.stringify($var);
};

module.exports = JsExport;
