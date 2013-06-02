/******************************************
Title: Musical rhythm game for Lumosity.com
Author: Scott Takahashi
Date: April 27, 2013
******************************************/

// Parameters

var testRhythms = [];
var testingTempo;
var testingLength;

var negativeFeedbackVolume = 0.3;

var STARTING_LEVEL = 1;

var MIN_TEMPO = 100;
var MAX_TEMPO = 125;

var MAX_LEVEL = 10;
var LOOPS_PER_TRIAL = 8;
var NUM_TRIALS = 15;

var COMBO_LOOPS = 2;
var LISTEN_LOOPS = 2;

var BASE_SCORE = 50;
var MISS_SCORE = 40;

var NEXT_LEVEL_ACCURACY = 80;
var BACK_LEVEL_ACCURACY = 30;

var INPUT_DELAY = 30;

/* 
 * 0) rhythm difficulty
 * 1) # of measures
 * 2) minimum # of cues per measure
 * 3) maximum # of cues per measure
 * 4) intervals per beat
 * 5) cues+marker (0 = on, 1 = fading, 2 = off)
 * 6) message for next level
 */
var levelMatrix = {
  1: [1, 1, 2, 3, 1, 0, ""],
  2: [1, 1, 4, 4, 1, 0, ""],
  3: [1, 1, 4, 4, 2, 0, "To make things more difficult, we're adding eight notes!"],
  4: [2, 1, 4, 5, 2, 0, "Congrats making it to level 4! The rhythms begin to get trickier."],
  5: [1, 1, 3, 4, 1, 1, "The visual cues are going to fade away. Listen carefully!"],
  6: [1, 1, 4, 5, 2, 1, ""],
  7: [2, 1, 4, 5, 2, 1, ""],
  8: [2, 1, 4, 6, 3, 1, "Try your hand at triplets."],
  9: [3, 1, 4, 6, 3, 1, ""],
 10: [3, 1, 5, 6, 3, 1, ""],
 11: [2, 1, 4, 5, 2, 2, "No more visual cues! You'll have to rely on your ears now."],
 12: [3, 1, 5, 6, 3, 2, ""],
 13: [3, 1, 5, 6, 4, 2, "Get ready for 16th notes!!"],
 14: [3, 1, 5, 6, 4, 2, ""],
 15: [3, 2, 4, 5, 4, 2, "Now there are 2 measures to keep track of. Good luck!"],
 16: [4, 2, 5, 6, 4, 2, ""],
 17: [3, 3, 5, 6, 4, 2, "Ahh!!! 3 measures!"],
 18: [3, 3, 5, 6, 4, 2, ""],
 19: [3, 4, 5, 6, 4, 2, "4 measures?!?! This is ludicrous!"],
 20: [3, 5, 5, 6, 4, 2, "Congratulations, no one has ever made it this far."],
 
}

var trial = 0;
var level = 0;
var score = 0;

var instruments = [];
var BUCKET_SIZE = 200; // size of bucket when evaluating hits, in millis

var circleXPos = 320;
var circleYPos = 240;
var circleR = 124;
var circleBorderThickness = 8;

function loadInstruments() {
  var numInstruments = 8;
  createjs.Sound.registerSound('files/count.mp3', 'count');
  createjs.Sound.registerSound('files/miss.mp3', 'miss');
  createjs.Sound.registerSound('files/combo.mp3', 'combo');
  createjs.Sound.registerSound('files/comboOff.mp3', 'comboOff');
  
  for (var i = 1; i <= numInstruments; i++) {
    var url = 'files/' + i + '.mp3';
    var name = 'inst' + i;
    createjs.Sound.registerSound(url, name);
    instruments.push(name);
  }
}

$(document).ready(function () {

  loadInstruments();

  //// Initialize Graphics ///

  // Graphics variables
  var sideLength = 320;
  var center = sideLength / 2;
  var radius = 120;
  var markLargeLength = 26;
  var markSmallLength = 24;
  var markLargeThickness = 24;
  var markSmallThickness = 10;
  var trackOuterWidth = 6;
  var trackInnerWidth = 50;
  
  var elem = document.getElementById('graphics-container');
  var two = new Two({width: sideLength, height: sideLength}).appendTo(elem);
  var trackGroup;
  var cueGroup;
  var markerGroup;
  var markerOuter;
  var markerInner;
  
  var markerIsFading = false;
  
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
  
  // Custom controls buttons
  
  $('#game').hide();
  $('#instructions-container').hide();
  $('#custom-controls').hide();
  $('#standard-game-btn').button('toggle').click( function() {
    $('#custom-controls').hide();
  });
  $('#custom-rules-btn').click( function() {
    $('#custom-controls').show();
  });
  
  $('#instructions-btn').click( function(e) {
    e.preventDefault();
    $('#instructions-container').fadeIn();
    
  });
  
  $('#instructions-close-btn').click( function(e) {
    e.preventDefault();
    $('#instructions-container').fadeOut();
  });

  $('#start-game').click( function(e) {
    e.preventDefault();
    if ($('#custom-rules-btn').hasClass('active')) {
      if ($('input[name=custom-rhythms]:checked', '#game-form').val() == 'yes') { 
        var lines = $('#rhythms-input').val().split('\n');
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          var rhythm = [];
          for (var j = 0; j < line.length; j++) {
            rhythm.push(line.charAt(j));
          }
          testRhythms.push(rhythm);
        }
        console.log(testRhythms);
      }
      testingLength = $('#rhythm-length').val();
      testingTempo = $('#tempo').val();
      testing = true;
      runGame(parseInt($('#starting-level').val()), parseInt($('#num-loops-input').val()), parseInt($('#num-trials-input').val()), true);
    }
    else {
      runGame($('#starting-level').val(), LOOPS_PER_TRIAL, NUM_TRIALS, false);
    }
  });
  
  function runGame(startingLevel, numLoops, numTrials, testing) {
    $('#menu, #countoff, #dialog-container, #message-container, #multiplier, #play').hide();
    $('#game').show();
    $('#num-trials').html(numTrials);
    $('#level').html(startingLevel);
    $('#num-loops').html(numLoops);
    level = startingLevel;
    
    runTrial(numLoops, numTrials, testing);
  }
  
  function runTrial(numLoops, numTrials, testing) {
    trial++;
    if (trial > numTrials) {
      return;
    }
    
    initGraphics();
    $('#trial').html(trial);
    $('#level').html(level);
    $('#multiplier').slideUp();
    $('.progress-mark').remove();
    
    var rhy = new Rhythm(testing);
    drawCues(rhy);
    drawProgressMarkers(numLoops);
    
    countoff(rhy);
    
    $('#countdown').html('LISTEN...');
    $('#countdown').fadeIn();
    
    setTimeout( function() {
      setMarker(rhy);
      rhy.listen();
      two.play();
      setTimeout( function() {
        $('#countdown').html('READY?');
        setTimeout( function() {
          //$('#countdown').html('2');
          setTimeout( function() {
            $('#countdown').html('PLAY!');
            setTimeout( function() {
            }, rhy.intervalsPerBeat * rhy.interval);
          }, rhy.intervalsPerBeat * rhy.interval);
        }, rhy.intervalsPerBeat * rhy.interval);
      }, rhy.duration * (LISTEN_LOOPS - 2) + rhy.duration / rhy.numMeasures);
      
      setTimeout( function() {
        rhy.play(numLoops);
        $('#countdown').hide();
        $('#play').show().delay(1000).fadeOut();
        for (var i = 0; i < numLoops; i++) {
          setTimeout(
            (function(num) {
              return function() {
                $('#loop').html(num);
              }
            })(i + 1), i * rhy.duration);
        }
      }, rhy.duration * LISTEN_LOOPS);
    }, rhy.measureDuration);
    
    $('body').keydown( function(event) {
      if (event.which == 32 || event.which == 40) { // if key pressed is space bar (32)
        event.preventDefault();
        rhy.scoreHit();
      }
    });
    var totalLoops = LISTEN_LOOPS + numLoops;
    setTimeout( function() {
      markerGroup.opacity = 0;
      two.pause();
      var accuracy = Math.round((rhy.hits - rhy.misses) / (rhy.numNotes * numLoops) * 100);
      endTrialDialog(rhy, accuracy, numLoops);
      var nextGameStarted = false;
      setTimeout( function() {
        if (nextGameStarted)
          return;
        nextGameStarted = true;
        rhy.running = false;
        $('#dialog-container').fadeOut();
        if (accuracy > NEXT_LEVEL_ACCURACY) {
          level++;
          nextLevelMessage();
          setTimeout( function() {
            $('#message-container').fadeOut();
            runTrial(numLoops, numTrials, testing);
          }, 4000);
          return;
        }
        if (accuracy < BACK_LEVEL_ACCURACY && level > 1) {
          level--;
          runTrial(numLoops, numTrials, testing);
          return;
        }
        runTrial(numLoops, numTrials, testing);
      }, 4000);
    }, rhy.measureDuration + rhy.duration * (totalLoops));
  }
  
  function drawProgressMarkers(numLoops) {
    for (var i = 0; i < LISTEN_LOOPS; i++) {
      $('#progress-play').before('<div class="progress-mark" id="progress-mark-listen-'+i+'"></div>');
    }
    for (var i = 0; i < numLoops; i++) {
      $('#progress').append('<div class="progress-mark" id="progress-mark-play-'+i+'"></div>');
    }
  }
  
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
  
  function nextLevelMessage() {
    $('#message-container #next-level').html(level);
    $('#message-container p').html(levelMatrix[level][6]);
    $('#message-container').fadeIn();
  }
  
  function setMarker(rhy) {
    markerGroup.opacity = 1;
    // Sets rotation of the markerGroup to the equivalent percentage of the rhythm the current timestamp is on.
    two.bind('update', function(frameCount) {
      markerGroup.rotation = (new Date().getTime() - rhy.listeningStartTime) % rhy.duration / rhy.duration * 2 * Math.PI;
    });
    if(levelMatrix[level][5] == 1 && markerIsFading != true) {
      two.bind('update', function(frameCount) {
        markerGroup.opacity = Math.max(markerGroup.opacity - .002, 0);
      });
      markerIsFading = true;
    }
/*
      if(levelMatrix[level][5] == 2 && new Date().getTime() > rhy.listeningStartTime + rhy.measureDuration * LISTEN_LOOPS) {
        markerGroup.opacity = Math.max(markerGroup.opacity - .007, 0);
      }
*/
  }
  
  function drawCues(rhy) {
    if (levelMatrix[level][5] == 2) {
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
      if (levelMatrix[level][5] == 1) {
        fadeCue(cue);
      }
    }
    two.update();
  }
  
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
  
  function fadeCue(cue) {
    two.bind('update', function() {
      cue.opacity -= .002;
    });
  }
  
  function setDifficulty() {
    
  }
  
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
  
  // Rhythm class functions
  
  function Rhythm(testing) {
    this.running = false;
    this.testing = testing;
    this.beats = [];
    this.beats2 = null;
    this.hits = 0;
    this.misses = 0;
    this.combo = 0;
    this.comboOn = false;
    this.points = 0;
    this.beatsPerMeasure = 4;
    this.length;
    this.measureDuration;
    
    this.intervalsPerBeat = levelMatrix[level][4];
    this.numMeasures = levelMatrix[level][1];
    this.tempo = Math.floor(Math.random() * (MAX_TEMPO - MIN_TEMPO + 1)) + MIN_TEMPO; // randomly selects a tempo between the min and max
    this.interval = 60000 / this.tempo / this.intervalsPerBeat; // conversion from bpm to millis per interval
    this.length = this.numMeasures * this.intervalsPerBeat * this.beatsPerMeasure;
    
    this.duration = this.length * this.interval; // millis duration of rhythm
    this.measureDuration = this.duration / this.numMeasures;
    this.instrument = Math.floor(Math.random() * instruments.length); // randomly sets an instrument
    for (var i = 0; i < this.length; i++) {
      this.beats[i] = 0;
    }
    
    this.numNotes = this.numMeasures * Math.round(Math.random()*(levelMatrix[level][3] - levelMatrix[level][2]) + levelMatrix[level][2]);
    
    // custom rhythm assignment
    if (this.testing == true) {
      if (trial <= testRhythms.length) {
        this.beats = testRhythms[trial - 1];
        var noteCounter = 0;
        for (var i = 0; i < this.beats.length; i++) {
          if (this.beats[i] == 1) {
            noteCounter++;
          }
        }
        this.numNotes = noteCounter;
      }
    }
    else {
      this.generateRhythm(levelMatrix[level][0]);
    }
    
    // Generates the angles for the rhythm's cues
    this.cues = {};
    for (var i = 0; i < this.length; i++) {
      if (this.beats[i] == 1) {
        var angle = 2 * Math.PI * i / this.length;
        this.cues[i] = angle;
      }
    }
    
  }
  
  Rhythm.prototype.generateRhythm = function(difficulty) {
    var numOffBeat = 0;
    for (var i = 0; i < this.numNotes; i++) {
      var beat = -1;
      while(beat < 0 || this.beats[beat] == 1) {
        beat = Math.floor(Math.random() * this.length);
        if (beat % this.intervalsPerBeat > 0 && numOffBeat >= difficulty) { // reduces number of offbeat notes according to difficulty
          beat = beat % this.intervalsPerBeat;
          numOffBeat++;
        }
      }
      this.beats[beat] = 1;
    }
  }
  
  Rhythm.prototype.listen = function() {
    var parent = this;
    this.listeningStartTime = new Date().getTime();
    for (var i = 0; i < LISTEN_LOOPS; i++) {
      for (var j = 0; j < this.length; j++) {
        if (this.beats[j] == 1) {
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
  
  Rhythm.prototype.play = function(numLoops) {
    this.running = true;
    this.startTime = new Date().getTime();
    this.numLoops = numLoops;
    var parent = this;
    for (var i = 0; i < numLoops; i++) {
      for (var j = 0; j < this.length; j++) {
        if (this.beats[j] == 1) {
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
  
  Rhythm.prototype.scoreHit = function() {
    if (this.running == false || new Date().getTime() > this.startTime + this.duration * this.numLoops - BUCKET_SIZE / 2) {
      return;
    }
    var inputTime = new Date().getTime() - this.startTime - INPUT_DELAY;
    for (var i = 0; i < this.numLoops; i++) {
      if (inputTime >= this.duration * i - BUCKET_SIZE / 2 && inputTime <= this.duration * (i + 1) - BUCKET_SIZE / 2) {
        for (var j = 0; j < this.length; j++) {
          if (inputTime >= this.duration * i + this.interval * j - BUCKET_SIZE / 2 &&
              inputTime <= this.duration * i + this.interval * j + BUCKET_SIZE / 2 &&
              this.beats[j] == 1) {
            this.hits++;
            this.combo++;
            var addedScore = BASE_SCORE;
            var multiplier = Math.floor(this.combo / this.numNotes / COMBO_LOOPS) + 1;
            addedScore = BASE_SCORE * multiplier;
            
            if (this.combo > 0 && this.combo % (this.numNotes * COMBO_LOOPS) == 0) {
              $('#multiplier p').html('x'+multiplier);
              if (!this.comboOn) {
                toggleCombo(true);
                this.comboOn = true;
              }
            }
            // draw hit indicator
            var angle = this.cues[j];
            drawHitIndicator(angle);
            // add points to Rhythm and game
            this.points += addedScore;
            addScore(addedScore);
            return;
          }
        }
      }
    }
    // if the user did not hit on a beat
    playSound('miss', 0, .3); // negative feedback 'miss' sound is played at .3 volume
    this.misses++;
    this.combo = 0;
    // disable combo multiplier
    if (this.comboOn == true) {
      toggleCombo(false);
      this.comboOn = false;
    }
    // handles miss score
    this.points -= MISS_SCORE;
    addScore(MISS_SCORE);
    // draws miss indicator
    var angle = 2 * Math.PI * (inputTime % this.duration / this.duration);
    drawMissIndicator(angle);
  }
  
  function addScore(num) {
    score = Math.max(score + num, 0);
    $('#score').html(score);
  }
  
  // Playback functions
  
  function countoff(r) {
    for (var i=0; i < 4; i++) {
      playSound('count', r.interval * i * r.intervalsPerBeat);
    }
  }
  
  function playSound(instrument, delay, volume) {
    createjs.Sound.play(instrument, createjs.Sound.INTERRUPT_ANY, delay, 0, 0, volume, 0);
  }
  
});