/* removing ads placeholders, they take too much space, reviews don't fit into screen */

var $$ = s => document.querySelectorAll(s);

setInterval(() => {
    for (var el of Array.from($$('._unit'))) {
        el.style.display = 'none';
    }
}, 500);