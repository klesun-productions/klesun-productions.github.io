find ~/big/p/shmidusic.lv/Dropbox/web/midiCollection -name '*.mid' | while read line 
do
  destPathBase="/home/klesun/big/p/shmidusic.lv/out/convertedOgg/${line:59}"
  if [ ! -f "$destPathBase.ogg" ]; then
      mkdir -p $(dirname "$destPathBase")
	  fluidsynth -F "$destPathBase.wav" /usr/share/sounds/sf2/FluidR3_GM.sf2 "/home/klesun/big/p/shmidusic.lv/Dropbox/web/midiCollection/${line:59}"
	  oggenc -q 3 -o "$destPathBase.ogg" "$destPathBase.wav"
	  rm "$destPathBase.wav"
  fi
done
