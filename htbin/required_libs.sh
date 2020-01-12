sudo su

apt-get install python3-pip

apt-get install python3-setuptools

# A lib to write sql queries with generators. I don't
# use it much, but it is left in few old pieces of code
pip3 install pony

# Lib for parsing russian text. Included for wikipedia dump
# processing used to generate dict for Starve game
pip3 install pymorphy2

# I tried to use it few years ago for google authentication.
# It is still imported in few places, should be removed probably
pip3 install oauth2client



# ________________________________
# if you get Permission Denied on json_service.py, that probably means that 
# drive is mounted with "noexec" option. here is my fstab for NTFS drive:
# /dev/disk/by-uuid/26D8995BD8992A57 /mnt/26D8995BD8992A57 auto defaults,exec,uid=1000,gid=1000,x-gvfs-show 0 0
# /dev/disk/by-uuid/38B6A927723EBF4A /mnt/38B6A927723EBF4A auto defaults,exec,uid=1000,gid=1000,x-gvfs-show 0 0
