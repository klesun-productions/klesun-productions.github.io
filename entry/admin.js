
// require.js ordered me to put the inline javascript code here

var wanted = ['/src/entry/Admin.js', '/libs/SMFreader.js'];

requirejs(wanted, (Admin) => Admin.Admin(document.getElementById('mainControl')));

