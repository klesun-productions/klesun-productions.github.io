This folder contains python scripts that may be called through http.

<b>json_service.py</b> - listens for http calls. supposed to be used to provide data from my filesystem, sqlite to client js through ajax

The easiest way to start server is:
```bash
sudo python3.5 -m http.server --cgi 80
```
But cgi lib requests often hang requiring to restart server manually. Apache does not have usch problem, but it is harder to setup. Here re the steps:
1. Install apache
```bash
sudo apt-get install apache2
```
2. To be continued...
