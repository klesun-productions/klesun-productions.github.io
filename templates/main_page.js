
// requires Util.TableGenerator.js !
// requires Util.PianoLayoutPanel.js !
// requires Util.Player.js !

/** @param mainCont - div dom with children
 * structure defined in main_page.html */
var MainPage = function(mainCont)
{
    var $pianoCanvas = $(mainCont).find('.pianoLayoutCanvas'),
        $playbackControlCont = $(mainCont).find('.playbackControlCont'),
        sheetMusicCont = $(mainCont).find('.sheetMusicCont')[0],
        violinKeyImage = $(mainCont).find('.violinKeyImage')[0],
        bassKeyImage = $(mainCont).find('.bassKeyImage')[0],
        playAllNotesButton = $(mainCont).find('#playAllNotesOnAllInstruments')[0],
        instrumentInfoBlock = $(mainCont).find('#instrumentInfoBlock')[0],
        O_O = 'O_O'
        ;

    var googleLogInIdToken = null;

    var addToken = p => googleLogInIdToken === null ? p : $.extend({}, p, {googleLogInIdToken: googleLogInIdToken});
    var performExternal = (methodName, params, callback) => $.ajax({
        url: '/htbin/json_service.py' + '?f=' + methodName, // GET params just for cosmetics
        type: "post",
        data: JSON.stringify(addToken({methodName: methodName, params: params})),
        dataType: "json",
        contentType: 'application/json;UTF-8',
        success: callback
    });

    var instrumentNames = ["Acoustic Grand Piano","Bright Acoustic Piano","Electric Grand Piano",
        "Honky-tonk Piano","Electric Piano","6 Electric Piano 2","Harpsichord","Clavinet","Celesta",
        "Glockenspiel","Music Box","Vibraphone","Marimba","Xylophone","Tubular Bells","Dulcimer",
        "Drawbar Organ","Percussive Organ","Rock Organ","Church Organ","Reed Organ","Accordion",
        "Harmonica","Tango Accordion","Acoustic Guitar (nylon)","Acoustic Guitar (steel)",
        "Electric Guitar (jazz)","Electric Guitar (clean)","Electric Guitar (muted)","Overdriven Guitar",
        "Distortion Guitar","Guitar Harmonics","Acoustic Bass","Electric Bass (finger)","Electric Bass (pick)",
        "Fretless Bass","Slap Bass 1","38 Slap Bass 2","Synth Bass 1","40 Synth Bass 2","Violin","Viola",
        "Cello","Contrabass","Tremolo","Pizzicato","Orchestral Harp","Timpani","String Ensemble 1",
        "50 String Ensemble 2","Synth","52 Synth Strings 2","Choir","Voice","55 Synth Choir","Orchestra Hit",
        "Trumpet","Trombone","Tuba","Muted Trumpet","French Horn","Brass Section","63 Synth Brass 1",
        "64 Synth Brass 2","Soprano Sax","Alto Sax","Tenor Sax","Baritone Sax","Oboe","English Horn",
        "Bassoon","Clarinet","Piccolo","Flute","Recorder","Pan Flute","Blown bottle","Shakuhachi","Whistle",
        "Ocarina","Lead 1","sawtooth","calliope","84 Lead 4 chiff","charang","86 Lead 6 (voice)","fifths",
        "88 Lead 8 (bass + lead)","89 Pad 1 (new age)","90 Pad 2 (warm)","polysynth","92 Pad 4 (choir)",
        "93 Pad 5 (bowed)","94 Pad 6 (metallic)","95 Pad 7 (halo)","96 Pad 8 (sweep)","FX",
        "98 FX 2 (soundtrack)","99 FX 3 (crystal)","100 FX 4 (atmosphere)","101 FX 5 (brightness)","goblins",
        "echoes","104 FX 8 (sci-fi)","Sitar","Banjo","Shamisen","Koto","Kalimba","Bagpipe","Fiddle","Shanai",
        "113 Tinkle Bell","Agogo","Steel Drums","Woodblock","Taiko Drum","Melodic Tom","119 Synth Drum",
        "Cymbal","Fret","122 Breath Noise","Seashore","Bird Tweet","Telephone Ring","Helicopter","Applause","Gunshot"];

    const repaintInstrumentInfo = function(instrByChannel)
    {
        $(instrumentInfoBlock).empty();

        var colorize = (channel) => $('<div></div>')
            .append(channel)
            .css('font-weight', 'bold')
            .css('color', 'rgba(' + Ns.channelColors[channel].join(',') + ',1)');

        var colModel = [
            {name: 'channelCode', caption: 'Chan', formatter: colorize},
            {name: 'presetCode', caption: 'Preset'},
            {name: 'description', caption: 'Description'},
        ];

        var rows = Ns.range(0, 16).map(function(i)
        {
            if (i in instrByChannel) {
                const instrCode = instrByChannel[i];
                return {
                    channelCode: i,
                    presetCode: instrCode,
                    description: instrumentNames[instrCode],
                    /** @TODO: color */
                };
            } else {
                return {
                    channelCode: i,
                    presetCode: -1,
                    description: $('<div></div>')
                        .append('Channel Not Used')
                        .addClass('notUsed'),
                };
            }
        });

        var $table = Util.TableGenerator().generateTable(colModel, rows);

        $(instrumentInfoBlock).append($table);
    };

    var SynthAdapter = function(dropdownEl, controlEl)
    {
        var synths = {
            oscillator: Util.Synths.Oscillator(),
            midiDevice: Util.Synths.MidiDevice(),
            FluidSynth3: Ns.Synths.WavCacher(),
            // pitchShifter: Ns.Synths.PitchShifter(),
        };

        var changeSynth = function() {
            synths[$(dropdownEl).val()].init($(controlEl));
        };

        $(dropdownEl).empty();
        var addOption = s => $(dropdownEl).append($('<option></option>').val(s).html(s));
        Object.keys(synths).forEach(addOption);
        $(dropdownEl).val('FluidSynth3').change(_ => changeSynth()).trigger('change');

        return {
            handleNoteOn: n => synths[$(dropdownEl).val()].playNote(n.tune, n.channel),
            consumeConfig: function(config, callback)
            {
                repaintInstrumentInfo(config);
                synths[$(dropdownEl).val()].consumeConfig(config, callback)
            }
        };
    };
    var synth = SynthAdapter(
        $(mainCont).find('#synthDropdown')[0],
        $(mainCont).find('#synthControl')[0]);

    var sheetMusicPainter = Ns.SheetMusicPainter('mainSongContainer');

    var player = Util.Player($playbackControlCont);
    player.addNoteHandler(Util.PianoLayoutPanel($pianoCanvas));
    player.addNoteHandler(synth);
    player.addNoteHandler(sheetMusicPainter);
    player.addConfigConsumer(synth);
    
    /** @debug */
    var showInstrumentName = n => {};
    player.addNoteHandler({handleNoteOn: n => { showInstrumentName(n); return () => {}; } });

    var playRandom = _ => alert("Please, wait till midi names load from ajax!");

    var playStandardMidiFile = function(fileName, finishedFileName)
    {
        finishedFileName = finishedFileName || '';

        var params = {file_name: fileName, finished_file_name: finishedFileName};
        var method_name = 'get_standard_midi_file';

        console.log('Fetching...');

        performExternal(method_name, params, function(song)
        {
            console.log('Playing: ' + fileName, song);

            var whenFinished = (_) => playRandom({fileName: fileName});

            player.playStandardMidiFile(song, {fileName: fileName}, whenFinished);
            sheetMusicPainter.draw(Shmidusicator.fromMidi(song), true);
        })
    };

    var initIchigosMidiList = function ()
    {
        var playButtonFormatter = function(cell, row)
        {
            return $('<input type="button" value="Play!"/>')
                .click((_) => playStandardMidiFile(row.rawFileName));
        };

        /** @debug */
        console.log('gonna fetrch info');

        var callback = function(rowList)
        {
            /** @debug */
            console.log('fetched info');

            var colModel = [
                {'name': 'fileName', 'caption': 'File Name'},
                //{'name': 'length', 'caption': 'Length'},
                {'name': 'score', 'caption': '*'},
                {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
            ];

            var caption = 'From <a href="http://ichigos.com">ichigos.com</a>';

            var table = Util.TableGenerator().generateTable(colModel, rowList, caption, 10, 25);
            $('.random-midi-list-cont').append(table); // defined in main_page.html

            playRandom = function(finishedFileInfo)
            {
                finishedFileInfo = finishedFileInfo || {fileName: ''};

                var index = Math.floor(Math.random() * rowList.length);
                playStandardMidiFile(rowList[index].rawFileName, finishedFileInfo.fileName);
            };
        };

        performExternal('get_ichigos_midi_names', {}, callback)
    };

    var playShmidusicFile = function(file)
    {
        var song = file['sheetMusic'],
            name = file['fileName'];

        console.log('Playing shmidusic: ' + name);

        player.playShmidusic(song, name);
        sheetMusicPainter.draw(song);
    };

    var playDemo = function () {
        var mineList = Globals.shmidusicList;
        var index = Math.floor(Math.random() * mineList.length);
        playShmidusicFile(mineList[index]);
    };

    var initMyMusicList = function ()
    {
        var playButtonFormatter = function (cell, row) {
            return $('<input type="button" value="Play!"/>')
                    .click((_) => playShmidusicFile(row));
        };

        /** @TODO: fetch it with a separate request */
        var rowList = Globals.shmidusicList;
        rowList.sort((a,b) => a.fileName.localeCompare(b.fileName)); // sorting lexicographically

        var colModel = [
            {'name': 'fileName', 'caption': 'File Name', formatter: s => s.split('_').join(' ')},
            {'name': 'playButton', 'caption': 'Play', formatter: playButtonFormatter}
        ];

        var caption = 'My music';

        var table = Util.TableGenerator().generateTable(colModel, rowList, caption);
        $(mainCont).find('.myMusicCont').append(table); // defined in main_page.html
    };

    var handleGoogleSignIn = function(googleUser, $infoCont)
    {
        $infoCont.find('.g-signin2').css('display', 'none');

        var profile = googleUser.getBasicProfile();

        $infoCont.find('.logInStatusHolder').html('Logged-In as ' + profile.getEmail().split('@')[0]);
        $infoCont.find('.userImage').attr('src', profile.getImageUrl());

        googleLogInIdToken = googleUser.getAuthResponse().id_token;
        
        /** @TODO: token expires in about two hours - need to rerequest it */
    };

    playAllNotesButton.onclick = function() {
        var instrument = - 8;
        
        showInstrumentName = function(note)
        {
            if (+note.tune === 24) {
                var exact = instrument + note.channel;
                $('.fileName.holder').html(exact + ' - ' + instrumentNames[exact]);
            }
        };

        var makeChord = (semitone, channel) => 1 && { noteList: [{
            tune: semitone,
            channel: channel,
            length: semitone !== 0 ? '5 / 8' : '1 / 8' // 0 - pause
        }]};

        var makeChannel = instr => 1 && {
            channelNumber: instr % 8,
            volume: 100,
            instrument: instr
        };
        
        var addPauses = (chordList) => Util.range(0, chordList.length * 2)
            .map(i => (i % 2 === 0 ? chordList[i / 2] : makeChord(0,0)))
        
        var songs = Util.range(0, 16).map(i => 1 && { staffList: [{
            chordList: addPauses(Util.range(0, 8 * 85)
                .map(n => makeChord(24 + n % 85, n / 85|0))),
            staffConfig: {
                numerator: 8, tempo: 60, keySignature: 0,
                channelList: Util.range(i * 8, i * 8 + 8).map(makeChannel)
            }
        }]});

        var whenFinished = _ => { if ((instrument += 8) < 128) {            
            var song = songs[instrument / 8];

            player.playShmidusic(song, 'in the name of zhopa', whenFinished);
        }};

        whenFinished();
    };

    return {
        initIchigosMidiList: initIchigosMidiList,
        initMyMusicList: initMyMusicList,
        playDemo: playDemo,
        playRandom: (_) => playRandom(),
        handleGoogleSignIn: handleGoogleSignIn,
    };
};
