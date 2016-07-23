var $$ = s => Array.from(document.querySelectorAll(s));

// TODO: remove interval when ads appeared and removed
// TODO: css instead of interval to make them not appear at all

setInterval(() => {
    $$('body > *').forEach(el => el.tagName === 'NOINDEX' ? el.innerHTML = '' : 0);
    $$('center').forEach(el => el.style.display = 'none');
}, 500);
