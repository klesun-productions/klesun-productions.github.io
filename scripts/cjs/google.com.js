
/**
 * Shuffles array in place.
 * @param {Array} a items The array containing the items.
 */
var shuffle = function(a) {
    var j, x, i;
    for (i = a.length; i; i -= 1) {
        j = Math.floor(Math.random() * i);
        x = a[i - 1];
        a[i - 1] = a[j];
        a[j] = x;
    }
};

var blacklist = [
    // mp3 hosts with ads... hate them!
    'junglesvibes1.net',
    'daimp3.org',
    
    // misc
    'w3schools.com',
    
    // got books, but they are split into pages... hate them!
    'librebook.ru',
    'loveread.ec',
    'knijky.ru',
    'litmir.me', // "Конец ознакомительного фрагмента."
    
    // disgusting ads
    'inpearls.ru',
    
    // paying service, seriously?!
    'booklistonline.com',
];

shuffle(blacklist);

var redudantButtons = document.querySelectorAll('input[type="submit"]');
for (var i = 0; i < redudantButtons.length; ++i) {
    var btn = redudantButtons[i];
    btn.style.display = 'none';
}

document.querySelector('#lst-ib').onkeydown = function(e)
{
    if (e.keyCode === 13) {
        document.querySelector('#lst-ib').value += ' ' + blacklist.map(d => '-site:' + d).join(' ');
    }
};

setInterval(() => {
    document.getElementById('tads').style.display = 'none';
    document.getElementById('tvcap').style.display = 'none';
}, 500);

document.querySelector('#lga').style.display = 'none';
