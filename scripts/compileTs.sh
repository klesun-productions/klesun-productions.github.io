#!/bin/sh

tsc /home/klesun/fat/p/shmidusic.lv/src/MainPage.ts --noEmit --noEmitOnError --noImplicitAny --noImplicitReturns --module amd &&
tsc /home/klesun/fat/p/shmidusic.lv/src/compose/Handler.ts --noEmit --noEmitOnError --noImplicitAny --noImplicitReturns --module amd
