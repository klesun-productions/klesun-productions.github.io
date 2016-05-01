This folder contains python scripts that may be called through http.

<b>cgi_script.py</b> - used to be a preprocessor script for the main page,
needed it to include all js scripts from /util/ folder. no more used since i moved to require.js

<b>json_service.py</b> - listens for http calls. supposed to be used to provide data from my filesystem, sqlite to client js through ajax