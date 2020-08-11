"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

/** yu */
var addSalt = function(a, salt) {
    for (var c = 0; c < salt.length - 2; c += 3) {
        var d = salt.charAt(c + 2);
        d = "a" <= d ? d.charCodeAt(0) - 87 : Number(d);
        d = "+" == salt.charAt(c + 1) ? a >>> d : a << d;
        a = "+" == salt.charAt(c) ? a + d & 4294967295 : a ^ d
    }
    return a
};

/**
 * extracted from google translate api source code - translate_m.js
 * 2020-08-11
 *
 * this function generates the &tk=12345.67890 parameter in query string of /translate_a/single
 * API which is a hash from the text being translated + the hourly window.TKK salt
 */
var makeToken = function(srcText, TKK) {
    const d = TKK.split(".");
    TKK = Number(d[0]) || 0;
    for (var bytes = [], f = 0, g = 0; g < srcText.length; g++) {
        var h = srcText.charCodeAt(g);
        128 > h
            ? bytes[f++] = h
            : (2048 > h
                ? bytes[f++] = h >> 6 | 192
                : (55296 == (h & 64512) && g + 1 < srcText.length && 56320 == (srcText.charCodeAt(g + 1) & 64512)
                    ? (h = 65536 + ((h & 1023) << 10) + (srcText.charCodeAt(++g) & 1023),
                        bytes[f++] = h >> 18 | 240,
                        bytes[f++] = h >> 12 & 63 | 128)
                    : bytes[f++] = h >> 12 | 224,
                        bytes[f++] = h >> 6 & 63 | 128),
                        bytes[f++] = h & 63 | 128)
    }
    let hashMajor = TKK;
    for (let i = 0; i < bytes.length; i++) {
        hashMajor += bytes[i];
        hashMajor = addSalt(hashMajor, "+-a^+6");
    }
    hashMajor = addSalt(hashMajor, "+-3^+b+-f");
    hashMajor ^= Number(d[1]) || 0;
    0 > hashMajor && (hashMajor = (hashMajor & 2147483647) + 2147483648);
    hashMajor %= 1E6;
    return hashMajor + "." + (hashMajor ^ TKK);
};

exports.default = makeToken;