sudo su

# A lib to write sql queries with generators. I don't
# use it much, but it is left in few old pieces of code
pip3 install pony

# Lib for parsing russian text. Included for wikipedia dump
# processing used to generate dict for Starve game
pip3 install pymorphy2

# I tried to use it few years ago for google authentication.
# It is still imported in few places, should be removed probably
pip3 install oauth2client
