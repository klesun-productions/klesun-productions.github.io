
var Util = Util || {};

// i'm not sure i'm doing a good thing doing it this way but i see
// no more way, how to tell the ide what structure external data have

Util.Types = {
    IString: 'defaultString',
    IInteger: -100,
    // string value of Fraction from Java's Apache Math library
    Fraction: '3 / 4',
};

Util.Structures = {
    // we get list of ISongInfo objects from
    // external call to /htbin/get_standard_midi_file.py
    ISongInfo: {
        rawFileName: Util.Types.IString
    },
    IShmidusic: {
        staffList: [{
            staffConfig: {
                /*
                * when tempo is 60: 1/4 note length = 1 second;
                * when tempo is 240: 1/4 note length = 1/4 second
                */
                tempo: Util.Types.IInteger,
                /*
                * a number in range [-7, 7]. when -1: Ti is flat;
                * when -2: Ti and Mi are flat; when +2: Fa and Re are sharp and so on...
                */
                keySignature: Util.Types.IInteger,
                /*
                * tact size in legacy format (i used to store numbers in bytes ages ago...)
                * if you divide it with, uh well, 8, you get the tact size
                */
                numerator: Util.Types.IInteger,
                channelList: [{
                    // midi program number in range [0..128)
                    instrument: Util.Types.IInteger,
                    // midi channel number in range [0..16)
                    channelNumber: Util.Types.IInteger,
                    // midi channel starting volume in percents [0..100]
                    volume: Util.Types.IInteger
                },]
            },
            /*
            * a tact is chord sequence container. all child chord length sum in a
            * tact should (but not must) be equal to tact size defined in config
            *
            * if chords do not fit to a tact, the last chord will be
            * included to the tact and next tact will have decreased size
            */
            tactList: [{
                // length of a chord is length of the it's shortest child note
                chordList: [{
                    noteList: [{
                        length: Util.Types.Fraction,
                        // midi channel number in range [0..16)
                        channel: Util.Types.IInteger,
                        // midi noteOn event second byte - range [0..128)
                        tune: Util.Types.IInteger,
                    },]
                },]
            },]
        }]
    },
};

// we include js with the "Globals" declaration
// in /htbin/cgi_script.py::pass_server_data_to_js()
// but now it contains only a single value "shmidusicList",
// that should be fetched separately eventually
var Globals = Globals || {
    shmidusicList: [{
        fileName: Util.Types.IString,
        sheetMusic: Util.Structures.IShmidusic
    },]
};
