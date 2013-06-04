/******************************************
Title: Musical rhythm game for Lumosity.com
Author: Scott Takahashi
Created: April 21, 2013
Updated: June 3, 2013
******************************************/

// Constants

var COMBO_LOOPS = 2; // Loops per combo multiplier increment. Users must not hit any incorrect notes for their duration in order to sustain the combo.
var LISTEN_LOOPS = 2; // # of times rhythm is played during listen phase
var LOOPS_PER_TRIAL = 8; // # of times rhythm is played while player can score in a given trial
var NUM_TRIALS = 20; // # of trials per game

var BASE_SCORE = 50; // Points added to the score for each correct input
var MISS_SCORE = -40; // Points deducted from the score for each incorrect input

var NEXT_LEVEL_ACCURACY = 80; // scoring abot this % accuracy advances game to the next level
var BACK_LEVEL_ACCURACY = 30; // scoring below this % accuracy regresses the game back a level

var INPUT_DELAY = 20; // to correct for the delay between stimulus (audio output) and response (keyboard input)
var BUCKET_SIZE = 200; // duration of allowable timeframe when evaluating user inputs, in milliseconds

/* 
  Matrix of level difficulty attributes.
  The attributes are, according to their index:
  0) minimum tempo
  1) maximum tempo
  2) rhythm difficulty
  3) # beats per measure
  4) # of measures
  5) minimum # of cues per measure
  6) maximum # of cues per measure
  7) intervals per beat
  8) cues+marker (0 = on, 1 = fading, 2 = off)
  9) layering last rhythm (0 = off, 1 = on)
  10) message for next level
*/
var levelMatrix = {
  1: [120, 130, 1, 4, 1, 2, 3, 1, 0, 0, ""],
  2: [120, 130, 1, 4, 1, 4, 4, 1, 0, 0, ""],
  3: [120, 140, 1, 4, 1, 4, 4, 2, 0, 0, "To make things more difficult, we're adding eight notes!"],
  4: [120, 140, 2, 4, 1, 4, 5, 2, 0, 0, "Congrats making it to level 4! The rhythms begin to get trickier."],
  5: [120, 140, 1, 4, 1, 3, 4, 1, 1, 0, "The visual cues are going to fade away. Listen carefully!"],
  6: [120, 140, 1, 4, 1, 4, 5, 2, 1, 0, ""],
  7: [120, 140, 2, 4, 1, 4, 5, 2, 1, 1, "The previous rhythm is going to keep playing. Try not to get confused!"],
  8: [120, 140, 3, 4, 1, 4, 6, 2, 1, 1, ""],
  9: [100, 120, 3, 4, 1, 4, 6, 3, 1, 1, "Try your hand at triplets."],
 10: [100, 120, 3, 4, 1, 5, 6, 3, 1, 1, ""],
 11: [100, 120, 2, 4, 1, 4, 5, 3, 2, 1, "No more visual cues! You'll have to rely on your ears now."],
 12: [100, 120, 3, 4, 1, 5, 6, 3, 2, 1, ""],
 13: [ 90, 110, 3, 4, 1, 5, 6, 4, 2, 1, "Get ready for 16th notes!!"],
 14: [ 90, 110, 3, 4, 1, 5, 6, 4, 2, 1, ""],
 15: [ 90, 110, 3, 5, 1, 5, 6, 4, 2, 1, "There are now 5 beats per measure. Listen carefully!"],
 16: [ 90, 110, 4, 6, 1, 6, 7, 4, 2, 1, "6 beats per measure now!"],
 17: [ 90, 110, 3, 4, 2, 4, 6, 4, 2, 1, "Now there are 2 measures of 4 beats each."],
 18: [ 90, 110, 4, 4, 2, 5, 6, 4, 2, 1, ""],
 19: [ 90, 110, 3, 4, 4, 5, 6, 4, 2, 1, "4 measures?!?! This is ludicrous!"],
 20: [ 90, 110, 5, 4, 4, 5, 6, 4, 2, 1, "Congratulations, no one has ever made it this far."],
}

// Matrix index labels
var minTempoIndex = 0;
var maxTempoIndex = 1;
var difficultyIndex = 2;
var beatsPerMeasureIndex = 3;
var numMeasuresIndex = 4;
var minCuesIndex = 5;
var maxCuesIndex = 6;
var intervalsPerBeatIndex = 7;
var fadingIndex = 8;
var layeringIndex = 9;
var messageIndex = 10;

// Global game variables
var trial = 0;
var level = 0;
var score = 0;

var instruments = [];

/*
  Register instrument & game sounds from /files/ folder using createjs.Sound library.
*/
function loadInstruments() {
  var numInstruments = 8;
  createjs.Sound.registerSound('files/count.mp3', 'count');
  createjs.Sound.registerSound('files/miss.mp3', 'miss');
  createjs.Sound.registerSound('files/combo.mp3', 'combo');
  createjs.Sound.registerSound('files/comboOff.mp3', 'comboOff');
  
  // mp3 files are named as consecutive integers
  for (var i = 1; i <= numInstruments; i++) {
    var url = 'files/' + i + '.mp3';
    var name = 'inst' + i;
    createjs.Sound.registerSound(url, name);
    instruments.push(name);
  }
}

$(document).ready(function () {

  loadInstruments();

  // Two.js graphics variables
  var sideLength = 320;
  var center = sideLength / 2;
  var radius = 120;
  var markLargeLength = 26;
  var markSmallLength = 24;
  var markLargeThickness = 24;
  var markSmallThickness = 10;
  var trackOuterWidth = 6;
  var trackInnerWidth = 50;
  
  var gCont = document.getElementById('graphics-container');
  var two = new Two({width: sideLength, height: sideLength}).appendTo(gCont);
  var trackGroup;
  var cueGroup;
  var markerGroup;
  var markerOuter;
  var markerInner;
  var markerIsFading = false;
  
  // Intialize UI
  $('#game').hide();
  $('#instructions-container').hide();
  var fullscreenOn = false;
  // Turn on and off full screen
  $('#fullscreen-btn').click( function() {
    var element = document.body;
    if(fullscreenOn == false) {
        if(element.requestFullScreen) {
        element.requestFullScreen();
      } else if(element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
      } else if(element.webkitRequestFullScreen) {
        element.webkitRequestFullScreen();
      }
      fullscreenOn = true;
      return;
    }
    if(document.cancelFullScreen) {
      document.cancelFullScreen();
    } else if(document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if(document.webkitCancelFullScreen) {
      document.webkitCancelFullScreen();
    }
    fullscreenOn = false;
  });
  
  $('#instructions-btn').click( function(e) {
    e.preventDefault();
    $('#instructions-container').fadeIn();
  });
  $('#instructions-close-btn').click( function(e) {
    e.preventDefault();
    $('#instructions-container').fadeOut();
  });
  $("#starting-level").keypress(function(e){
    if(event.keyCode == 13){ // RETURN key
      e.preventDefault();
      $("#start-game").click();
    }
  });
  $('#start-game').click( function(e) {
    e.preventDefault();
    if ($('#starting-level').val() && /^\d+$/.test($('#starting-level').val())) { // Check that the starting level input is a positive integer
      runGame($('#starting-level').val(), LOOPS_PER_TRIAL, NUM_TRIALS);
      return;
    }
    runGame(1, LOOPS_PER_TRIAL, NUM_TRIALS);
  });
  
  /*
    Begin game. Will run the first trial according to the starting level, number of play loops per trial, and number of trials parameters.
  */
  function runGame(startingLevel, numLoops, numTrials) {
    $('#menu, #countoff, #dialog-container, #message-container, #multiplier, #play').hide();
    $('#game').show();
    $('#num-trials').html(numTrials);
    $('#level').html(startingLevel);
    $('#num-loops').html(numLoops);
    level = startingLevel;
    runTrial(numLoops, numTrials);
  }
  
  /*
    Run a trial. Begins with a countoff, then plays the rhythm to listen to, then plays the rhythm to play along with.
    Also accepts the previous rhythm to be used as a background rhythm.
  */
  function runTrial(numLoops, numTrials, lastRhythm) {
    trial++;
    if (trial > numTrials) {
      return;
    }
    
    initGraphics();
    $('#trial').html(trial);
    $('#level').html(level);
    $('#multiplier').slideUp();
    $('.progress-mark').remove();
    
    if(lastRhythm) {
      var rhy = new Rhythm(lastRhythm.instrument);
    }
    else {
      var rhy = new Rhythm();
    }
    
    drawCues(rhy); // draws the rhythm cues
    drawProgressMarkers(numLoops);
    
    // COUNTOFF //
    countoff(rhy); // Starts 1 measure countoff
    $('#countdown').html('LISTEN...');
    $('#countdown').fadeIn();
    
    setTimeout( function() {
      // LISTEN //
      setMarker(rhy);
      rhy.listen();
      if(lastRhythm && levelMatrix[level][layeringIndex] == 1) { // If the background rhythm is turned on for this level.
        lastRhythm.reset(rhy.tempo, rhy.beatsPerMeasure, rhy.numMeasures); // Changes lastRhythm to match the current rhythm's tempo, beats per meausre, and numMeasures.
        lastRhythm.listen();
      }
      two.play(); // Begins two.js animation
      setTimeout( function() {
        $('#countdown').html('READY?');
        setTimeout( function() {
          $('#countdown').html('PLAY!');
        }, rhy.intervalsPerBeat * rhy.interval * 2);
      }, rhy.duration * (LISTEN_LOOPS) - rhy.duration / rhy.numMeasures); // Delays the countdown until the last measure of the listen phase.
      setTimeout( function() {
        // PLAY //
        rhy.play(numLoops); // Plays rhythm!
        if(lastRhythm && levelMatrix[level][layeringIndex] == 1) { // If the background rhythm is turned on for this level.
          lastRhythm.play(numLoops);
          lastRhythm.turnOffScoring(); // Disables scoring for the previous rhythm.
        }
        $('#countdown').hide();
        for (var i = 0; i < numLoops; i++) {
          setTimeout(
            (function(num) {
              return function() {
                $('#loop').html(num);
              }
            })(i + 1), i * rhy.duration);
        }
      }, rhy.duration * LISTEN_LOOPS); // Delays the PLAY phase until after the LISTEN phase
    }, rhy.measureDuration); // Delays LISTEN phase until after the COUNTOFF
    
    // Keydown listener for the spacebar or arrow keys to register a player input.
    $('body').keydown( function(event) {
      if (event.which == 32 || (event.which >= 37 && event.which <= 40)) {
        event.preventDefault();
        rhy.scoreHit();
      }
    });
    
    // END TRIAL //
    setTimeout( function() {
      markerGroup.opacity = 0; // hide marker
      two.pause(); // stop two.js animation
      var accuracy = Math.round((rhy.hits - rhy.misses) / (rhy.numNotes * numLoops) * 100); // accuracy depends on # of hits and # of misses
      endTrialDialog(rhy, accuracy, numLoops); // display end trial dialog with trial stats
      var nextGameStarted = false;
      setTimeout( function() {
        if (nextGameStarted)
          return;
        nextGameStarted = true;
        rhy.running = false;
        $('#dialog-container').fadeOut();
        if (accuracy > NEXT_LEVEL_ACCURACY) { // Move onto next level is accuracy is high enough
          level++;
          nextLevelMessage(); // Display next level message
          setTimeout( function() {
            $('#message-container').fadeOut();
            runTrial(numLoops, numTrials, rhy);
          }, 4000);
          return;
        }
        if (accuracy < BACK_LEVEL_ACCURACY && level > 1) { // Go back one level if accuracy is low enough
          level--;
          runTrial(numLoops, numTrials, rhy);
          return;
        }
        runTrial(numLoops, numTrials, rhy); // Stay at the same level
      }, 4000);
    }, rhy.measureDuration + rhy.duration * (LISTEN_LOOPS + numLoops)); // Delay for COUNTOFF, LISTEN, and PLAY
  }
  
  /*
    Initialize graphics for circle UI elements using two.js
  */
  function initGraphics() {
    two.clear();
    
    trackGroup = two.makeGroup();
    cueGroup = two.makeGroup();
    markerGroup = two.makeGroup();
    
    var outerCircle = two.makeCircle(0, 0, radius + trackInnerWidth / 2 + trackOuterWidth / 2);
    var middleCircle = two.makeCircle(0, 0, radius);
    var innerCircle = two.makeCircle(0, 0, radius - trackInnerWidth / 2 - trackOuterWidth / 2);
    
    var trackOuterColor = 'rgba(0, 0, 0, .3)';
    var trackInnerColor = 'rgba(0, 0, 0, .2)';
    
    outerCircle.stroke = trackOuterColor;
    middleCircle.stroke = trackInnerColor;
    innerCircle.stroke = trackOuterColor;
    
    outerCircle.linewidth = trackOuterWidth;
    middleCircle.linewidth = trackInnerWidth;
    innerCircle.linewidth = trackOuterWidth;
    
    outerCircle.noFill();
    middleCircle.noFill();
    innerCircle.noFill();
    
    trackGroup.add(outerCircle, middleCircle, innerCircle);
    trackGroup.translation.x = center;
    trackGroup.translation.y = center;
    
    cueGroup.translation.x = center;
    cueGroup.translation.y = center;
    
    markerOuter = two.makeLine(0, -markLargeLength / 2, 0, markLargeLength / 2);
    markerOuter.translation.set(0, -radius);
    markerOuter.stroke = '#eee';
    markerOuter.linewidth = markLargeThickness;
    markerInner = two.makeLine(0, -markSmallLength / 2, 0, markSmallLength / 2);
    markerInner.translation.set(0, -radius);
    markerInner.stroke = '#fff';
    markerInner.linewidth = markSmallThickness;
    
    markerGroup.add(markerOuter, markerInner);
    markerGroup.translation.x = center;
    markerGroup.translation.y = center;
    markerGroup.opacity = 0;
    
    two.update();
  }
  
  /*
    Creates the circles that indicate the progress of the LISTEN and PLAY loops
  */
  function drawProgressMarkers(numLoops) {
    for (var i = 0; i < LISTEN_LOOPS; i++) {
      $('#progress-play').before('<div class="progress-mark" id="progress-mark-listen-'+i+'"></div>');
    }
    for (var i = 0; i < numLoops; i++) {
      $('#progress').append('<div class="progress-mark" id="progress-mark-play-'+i+'"></div>');
    }
  }
  
  /*
    Displays the dialog for the end of each trial, informing the player of their hits, misses, accuracy, and points.
  */
  function endTrialDialog(rhy, accuracy, numLoops) {
    $('#dialog-container').fadeIn();
    $('#dialog-hits').html(rhy.hits + ' / ' + rhy.numNotes * numLoops);
    $('#dialog-misses').html(rhy.misses);
    $('#dialog-accuracy').html(accuracy + '%');
    var pointSign = '';
    if (rhy.points >= 0) {
      pointSign = '+';
    }
    $('#dialog-points').html(pointSign + rhy.points);
  }
  
  /*
    Displays the next level message as defined in levelMatrix
  */
  function nextLevelMessage() {
    $('#message-container #next-level').html(level);
    $('#message-container p').html(levelMatrix[level][messageIndex]);
    $('#message-container').fadeIn();
  }
  
  /*
    Sets rotation and opacity of position marker.
  */
  function setMarker(rhy) {
    markerGroup.opacity = 1;
    // Sets rotation of the markerGroup to the equivalent percentage of the rhythm the current timestamp is on.
    two.bind('update', function(frameCount) {
      markerGroup.rotation = (new Date().getTime() - rhy.listeningStartTime) % rhy.duration / rhy.duration * 2 * Math.PI;
    });
    if(levelMatrix[level][fadingIndex] >= 1 && markerIsFading != true) { // Set marker to fade
      two.bind('update', function(frameCount) {
        markerGroup.opacity = Math.max(markerGroup.opacity - .002, 0);
      });
      markerIsFading = true;
    }
  }
  
  /*
    Draws rhythm cues for each beat of the rhythm.
  */
  function drawCues(rhy) {
    if (levelMatrix[level][fadingIndex] == 2) { // if cues should be hidden
      return;
    }
    for (var beat in rhy.cues) {
      var angle = rhy.cues[beat];
      var cue = two.makeLine(0, -markLargeLength / 2, 0, markLargeLength / 2);
      cue.rotation = angle;
      cue.translation.set(Math.sin(angle) * radius, - Math.cos(angle) * radius);
      cue.stroke = 'rgba(0, 0, 0, .5)';
      cue.linewidth = markLargeThickness;
      cueGroup.add(cue);
      if (levelMatrix[level][fadingIndex] == 1) {
        fadeCue(cue);
      }
    }
    two.update();
  }
  
  /*
    Draws a blue hit indicator given a rotation angle. O radians references up.
  */
  function drawHitIndicator(angle) {
    var xPos = Math.sin(angle) * radius;
    var xOffset = Math.sin(angle) * markSmallLength / 2;
    var yPos = - Math.cos(angle) * radius;
    var yOffset = Math.cos(angle) * markSmallLength / 2
    var cue = two.makeLine(xPos + xOffset, yPos - yOffset, xPos - xOffset, yPos + yOffset);
    cue.stroke = '#49ACE1';
    cue.linewidth = markSmallThickness;
    cueGroup.add(cue);
    two.bind('update', function() {
      cue.opacity -= .02;
    });
    
  }
  
  /*
    Draws a red miss indicator given a rotation angle. O radians references up.
  */
  function drawMissIndicator(angle) {
    var xPos = Math.sin(angle) * radius;
    var yPos = - Math.cos(angle) * radius;
    var cue = two.makeLine(0, -markSmallLength / 2, 0, markSmallLength / 2);
    cue.rotation = angle;
    cue.translation.set(xPos, yPos);
    cue.stroke = '#FE0021';
    cue.linewidth = markSmallThickness;
    cueGroup.add(cue);
    two.bind('update', function() {
      cue.opacity -= .02;
    });
  }
  
  /*
    Sets a given cue to fade.
  */
  function fadeCue(cue) {
    two.bind('update', function() {
      cue.opacity -= .002;
    });
  }
  
  /*
    Toggles the UI, sound elements for when the combo multiplier is active/inactive.
  */
  function toggleCombo(flag) {
    if (flag == true) {
      markerOuter.stroke = '#EB9023';
      markerInner.stroke = '#FDA92F';
      $('#multiplier').slideDown();
      playSound('combo', 0, .2);
    }
    else if (flag == false) {
      markerOuter.stroke = '#eee';
      markerInner.stroke = '#fff';
      $('#multiplier').slideUp();
      playSound('comboOff', 0, .2);
    }
  }
  
  /*
    Rhythm class.
    Defines the rhythm to be played and scored for each trial. Algorithmically generates rhythm according to attributes from levelMatrix.
  */
  function Rhythm(lastInstrument) {
    this.running = false;
    this.notes = []; // Array of notes in the rhythm for each interval. 1's correspond to a beat, 0's to silence.
    this.hits = 0;
    this.misses = 0;
    this.combo = 0;
    this.comboOn = false;
    this.points = 0;
    this.beatsPerMeasure = levelMatrix[level][beatsPerMeasureIndex];
    this.length;
    this.measureDuration;
    
    this.intervalsPerBeat = levelMatrix[level][intervalsPerBeatIndex];
    this.numMeasures = levelMatrix[level][numMeasuresIndex];
    var minTempo = levelMatrix[level][minTempoIndex];
    var maxTempo = levelMatrix[level][maxTempoIndex];
    this.tempo = Math.floor(Math.random() * (maxTempo - minTempo + 1)) + minTempo; // randomly selects a tempo between the min and max
    this.interval = 60000 / this.tempo / this.intervalsPerBeat; // conversion from bpm to millis per interval
    this.length = this.numMeasures * this.intervalsPerBeat * this.beatsPerMeasure;
    
    this.duration = this.length * this.interval; // millis duration of rhythm
    this.measureDuration = this.duration / this.numMeasures; // duration per measure
    this.instrument = Math.floor(Math.random() * instruments.length); // Randomly chooses an instrument from the preloaded instruments
    if(lastInstrument) {
      while (this.instrument == lastInstrument) { // makes sure instrument is different from the previous instrument
        this.instrument = Math.floor(Math.random() * instruments.length);
      }
    }
    for (var i = 0; i < this.length; i++) {
      this.notes[i] = 0; // Sets all notes to 0
    }
    
    this.numNotes = this.numMeasures * Math.round(Math.random()*(levelMatrix[level][maxCuesIndex] - levelMatrix[level][minCuesIndex]) + levelMatrix[level][minCuesIndex]); // Randomly assigns number of notes according to levelMatrix min and max.
    
    this.generateRhythm(levelMatrix[level][difficultyIndex]); // generates rhythm
    
    // Generates the angles for the rhythm's cues
    this.cues = {};
    for (var i = 0; i < this.length; i++) {
      if (this.notes[i] == 1) {
        var angle = 2 * Math.PI * i / this.length;
        this.cues[i] = angle;
      }
    }
  }
  
  /*
    Modifies the rhythm's notes array to contain 1's. Difficulty parameter limits the number of notes that are offbeat.
  */
  Rhythm.prototype.generateRhythm = function(difficulty) {
    var numOffBeat = 0;
    for (var i = 0; i < this.numNotes; i++) {
      var beat = -1;
      while(beat < 0 || this.notes[beat] == 1) {
        beat = Math.floor(Math.random() * this.length);
        if (this.notes[beat] == 0 && beat % this.intervalsPerBeat > 0) { // if the beat is valid and is an offbeat
          if(numOffBeat >= difficulty) {
            beat = beat % this.intervalsPerBeat;
          }
          else {
            numOffBeat++;
          }
        }
      }
      this.notes[beat] = 1;
    }
  }
  
  /*
    Resets the rhythm's tempo, beatsPerMeasure and numMeasures. Intended to use when playing multiple rhythms together.
  */
  Rhythm.prototype.reset = function(tempo, beatsPerMeasure, numMeasures) {
    this.tempo = tempo;
    this.beatsPerMeasure = beatsPerMeasure;
    this.numMeasures = numMeasures;
    this.interval = 60000 / this.tempo / this.intervalsPerBeat;
    this.length = this.numMeasures * this.intervalsPerBeat * this.beatsPerMeasure;
    this.duration = this.length * this.interval;
    this.measureDuration = this.duration / this.numMeasures;
  }
  
  /*
    Plays the LISTEN phase of the rhythm and modifies the corresponding UI elements. Offbeat notes are played at a lower volume.
  */
  Rhythm.prototype.listen = function(tempo) {  
    var parent = this;
    this.listeningStartTime = new Date().getTime();
    for (var i = 0; i < LISTEN_LOOPS; i++) {
      for (var j = 0; j < this.length; j++) {
        if (this.notes[j] == 1) {
          var volume = .5;
          if (j % (this.intervalsPerBeat * this.beatsPerMeasure) == 0) {
            volume = 1;
          }
          if (j % this.intervalsPerBeat == 0) {
            volume = .8;
          }
          playSound(instruments[this.instrument], i * this.duration + j * this.interval, volume);
        }
      }
      $('#progress *').removeClass('active');
      $('#progress-listen').addClass('active');
      var markID = '#progress-mark-listen-' + i;
      setTimeout((function(ID) {
        return function() {
          $(ID).addClass('active');
        }
      })(markID), i * this.duration);
    }
  }
  
  /*
    Plays the PLAY phase of the rhythm and modifies the corresponding UI elements. Offbeat notes are played at a lower volume.
  */
  Rhythm.prototype.play = function(numLoops) {
    this.running = true;
    this.startTime = new Date().getTime();
    this.numLoops = numLoops;
    var parent = this;
    for (var i = 0; i < numLoops; i++) {
      for (var j = 0; j < this.length; j++) {
        if (this.notes[j] == 1) {
          var volume = .5;
          if (j % (this.intervalsPerBeat * this.beatsPerMeasure) == 0) {
            volume = 1;
          }
          if (j % this.intervalsPerBeat == 0) {
            volume = .8;
          }
          playSound(instruments[this.instrument], i * this.duration + j * this.interval, volume);// creates play instance of all loops
        }
      }
      $('#progress *').removeClass('active');
      $('#progress-play').addClass('active');
      var markID = '#progress-mark-play-' + i;
      setTimeout((function(ID) {
        return function() {
          $(ID).addClass('active');
        }
      })(markID), i * this.duration);
    }
  }
  
  /*
    Disables scoring for the rhythm.
  */
  Rhythm.prototype.turnOffScoring = function(tempo) {
    this.running = false;
  }
  
  /*
    Scores a player input at the time of the function's execution. If the input is within the BUCKET_SIZE of an active beat, it is treated as a hit. If not, it is a miss.
  */
  Rhythm.prototype.scoreHit = function() {
    if (this.running == false || new Date().getTime() > this.startTime + this.duration * this.numLoops - BUCKET_SIZE / 2) {
      return;
    }
    var inputTime = new Date().getTime() - this.startTime - INPUT_DELAY;
    for (var i = 0; i < this.numLoops; i++) {
      if (inputTime >= this.duration * i - BUCKET_SIZE / 2 && inputTime <= this.duration * (i + 1) - BUCKET_SIZE / 2) {
        for (var j = 0; j < this.length; j++) {
          // If the input is within the bucket of an active beat.
          if (inputTime >= this.duration * i + this.interval * j - BUCKET_SIZE / 2 &&
              inputTime <= this.duration * i + this.interval * j + BUCKET_SIZE / 2 &&
              this.notes[j] == 1) {
            this.hits++;
            this.combo++;
            var multiplier = Math.floor(this.combo / this.numNotes / COMBO_LOOPS) + 1; // For each COMBO_LOOPS of consecutive hits, the multiplier is incremented
            var addedScore = BASE_SCORE * multiplier;
            if (this.combo > 0 && this.combo % (this.numNotes * COMBO_LOOPS) == 0) { // if the combo length is equal to a multiple of COMBO_LOOPS * numNotes
              $('#multiplier p').html('x'+multiplier);
              if (!this.comboOn) {
                toggleCombo(true);
                this.comboOn = true;
              }
            }
            var angle = this.cues[j]; // get cue angle from the rhythm object
            drawHitIndicator(angle);
            this.points += addedScore; // add points to the rhythm
            addScore(addedScore); // and to the game
            return;
          }
        }
      }
    }
    // Ff the user did not input on an active beat
    playSound('miss', 0, .3); // negative feedback 'miss' sound is played at .3 volume
    this.misses++;
    this.combo = 0;
    // disable combo multiplier
    if (this.comboOn == true) {
      toggleCombo(false);
      this.comboOn = false;
    }
    this.points += MISS_SCORE;
    addScore(MISS_SCORE);
    var angle = 2 * Math.PI * (inputTime % this.duration / this.duration); // finds angle of missed input
    drawMissIndicator(angle);
  }
  
  /*
    Modifies the score of the game and UI element.
  */
  function addScore(num) {
    score = Math.max(score + num, 0);
    $('#score').html(score);
  }
  
  // Audio playback functions
  
  /*
    Plays the metronome beat for one measure
  */
  function countoff(rhy) {
    for (var i=0; i < rhy.beatsPerMeasure; i++) {
      playSound('count', rhy.interval * i * rhy.intervalsPerBeat);
    }
  }
  
  /*
    Plays a preloaded sound at a specified delay time and volume using the createjs Sound library.
  */
  function playSound(instrument, delay, volume) {
    createjs.Sound.play(instrument, createjs.Sound.INTERRUPT_ANY, delay, 0, 0, volume, 0);
  }
  
});