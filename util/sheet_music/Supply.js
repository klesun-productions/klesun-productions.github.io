
// this package will contain an interface and two implementation:
// supplier of data from Java SheetMusic instance, and supplier from
// simple json-structure. the motivation is a guess, that generating
// json dump on each action in real-time may cause performcance leak,
// but you know what? screw this for now, since we do the dump anyway for ctrl-z
