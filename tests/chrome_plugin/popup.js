
setInterval(function() {
    let cont = document.getElementById('introduction-cont');
    let color = [
        192 + Math.random() * 48 | 0,
        192 + Math.random() * 48 | 0,
        224 + Math.random() * 32 | 0,
    ];
    cont.style['background-color'] = 'rgb(' + color.join(',') + ')';
}, 2000);