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
2. Add folowing lines inside `<VirtualHost *:80>` tag in your `/etc/apache2/sites-enabled/000-default.conf`:
```xml
	<Directory /home/klesun/big/p/shmidusic.lv/>
		AllowOverride All
		Options +ExecCGI
	</Directory>
	AddHandler cgi-script .py
	# disabling new feature in apache that forbids some 
	# characters in headers, because http.server kinda uses them
	HttpProtocolOptions Unsafe
	DocumentRoot /home/klesun/big/p/shmidusic.lv
```
Instead of `/home/klesun/big/p/shmidusic.lv` use your path to this project working copy.
3. Fix apache python `'ascii' codec can't encode character` issues: 
3.1. Uncomment . /etc/default/locale line in /etc/apache2/envvars
3.2. Make sure line similar to LANG="en_US.UTF-8" is present in /etc/default/locale
