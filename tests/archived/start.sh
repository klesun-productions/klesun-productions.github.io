#!/bin/bash

# starts hosting this application to your 80 port.
# when this script is running, you may open the web
# site by typing "localhost" or your ip in a browser

# i believe it is suitable only for my system setup, don't 
# expect it to run out of the box in your working copy

# this script is supposed to be runt from the project root directory

trap killgroup SIGINT

killgroup(){
  echo killing...
  kill 0
}

function rsync_ramdisk {
    while sleep 60; do
		rsync -a ./util/typescript/ ./util/typescript.bak --no-perms
		rsync -a ./util/typescript/ ./util/typescript.bak.bak --no-perms
    done
}

function shluha {
    sudo python3 -m http.server --cgi 80
}

sudo umount ./util/typescript
rm -R ./util/typescript/*
sudo umount ./libs
rm -R ./libs/*

sudo mount -o size=16M -t tmpfs none ./util/typescript &&
sudo mount -o size=16M -t tmpfs none ./libs &&

cp -R util/typescript.bak/* util/typescript &&
cp -R libs.bak/* libs/ &&

rm -R ./util/typescript.bak && (

shluha &
rsync_ramdisk &

wait

)
