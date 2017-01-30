I need a plugin very similar to [Custom JS](https://chrome.google.com/webstore/detail/custom-javascript-for-web/poakhlngfciodnhlhhgnaaelnpjljija)
But my plugin will not be bound to single page. Same code will be runt on _every_ page you open.
Domain-specific logic will be handled in code by `if`-ing `window.location`.

Need this for rwo reasons:
1. Web sites providing proxy functionality have different domain for every server.
2. I need a way to specify the script to run _just once_ for all domains of all my machines.
~3. It would be nice if this plugin is smart enough to deal with CORS so i could load script from my server;
or otherwise if it can store script in itself and share it between my machines.