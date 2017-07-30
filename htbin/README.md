This folder contains python scripts that may be called through http.

<b>json_service.py</b> - listens for http calls. supposed to be used to provide data from my filesystem, sqlite to client js through ajax

```bash
sudo apt-get install sqlite3
```

The easiest way to start server is:
```bash
sudo python3.5 -m http.server --cgi 80
```
But cgi lib requests often hang requiring to restart server manually. Apache does not have usch problem, but it is harder to setup. Here re the steps:
- Install apache
```bash
sudo apt-get install apache2

sudo a2enmod mpm_prefork cgi
```
-. Add folowing lines inside `<VirtualHost *:80>` tag in your `/etc/apache2/sites-enabled/000-default.conf`:
```xml
        # added manually following midiana.lv setup guide
        <Directory /home/klesun/big/p/shmidusic.lv/>
                AllowOverride All
                Options +ExecCGI
                # apparently, another change required for things to work after apache upgrade
                Require all granted
                AddHandler cgi-script .py
        </Directory>
        # disabling new feature in apache that forbids some 
        # characters in headers, because http.server kinda uses them
        HttpProtocolOptions Unsafe
```
And change line `DocumentRoot /var/www/html` to `DocumentRoot /home/klesun/big/p/shmidusic.lv`.

Instead of `/home/klesun/big/p/shmidusic.lv` use your path to this project working copy.

-. Fix apache python `'ascii' codec can't encode character` issues: 

Uncomment . /etc/default/locale line in /etc/apache2/envvars

Make sure line similar to LANG="en_US.UTF-8" is present in /etc/default/locale

- `sudo service apache2 restart`
