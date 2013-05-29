/******************************************
Title: Musical rhythm game for Lumosity.com
Author: Scott Takahashi
Date: April 27, 2013
******************************************/

// Parameters

var testRhythms = [];
var testingTempo;
var testingLength;

var negativeFeedbackVolume = 0;

var STARTING_LEVEL = 1;

var MIN_TEMPO = 110;
var MAX_TEMPO = 130;

var MAX_LEVEL = 10;
var LOOPS_PER_TRIAL = 8;
var NUM_TRIALS = 15;

var COMBO_LOOPS = 2;
var LISTEN_LOOPS = 2;

var BASE_SCORE = 50;
var MISS_SCORE = 40;

var NEXT_LEVEL_ACC = 80;
var BACK_LEVEL_ACC = 30;

var LEVEL_EIGHTH_NOTES = 3;
var LEVEL_TRIPLET_NOTES = 6;
var LEVEL_SIXTEENTH_NOTES = 9;

var LEVEL_TWO_MEASURES = 10;
var LEVEL_THREE_MEASURES = 13;
var LEVEL_FOUR_MEASURES = 16;

var LEVEL_FADE_CUES = 4;
var LEVEL_NO_CUES = 7;

var LEVEL_FADE_MARKER = 4;
var LEVEL_NO_MARKER = 7;

// rhythm difficulty, # of measures, # of cues per measure, intervals per beat, cues+marker (0 = on, 1 = fading, 2 = off)
var levelMatrix = {
  1: [1, 1, 4, 1, 0],
  2: [1, 1, 3, 1, 0],
  3: [1, 1, 4, 2, 0],
  4: [1, 1, 4, 2, 1],
  5: [1, 1, 4, 2, 1],
  6: [1, 1, 4, 3, 1],
  7: [1, 1, 4, 3, 2],
  8: [1, 1, 4, 3, 2],
  9: [1, 1, 4, 4, 2],
 10: [1, 2, 4, 4, 2],
 11: [1, 2, 4, 4, 2],
 12: [1, 2, 4, 4, 2],
 13: [1, 3, 4, 4, 2],
 14: [1, 3, 4, 4, 2],
 15: [1, 3, 4, 4, 2],
 16: [1, 4, 4, 4, 2]
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
  var numInstruments = 9;
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

  //// Initialize Graphics ////
  
  $('#game').hide();
  $('#spacebar').hide();

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
    
    two.update();
  }
  
  // Custom controls buttons
  
  $('#custom-controls').hide();
  $('#standard-game-btn').button('toggle').click( function() {
    $('#custom-controls').hide();
  });
  $('#custom-rules-btn').click( function() {
    $('#custom-controls').show();
  });

  $('#start-game').click( function(e) {
    e.preventDefault();
    if($('#negative-feedback').is(':checked')) {
      negativeFeedbackVolume = 0.3;
    }
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
    $('#menu, #countoff, #dialog-container, #multiplier, #play').hide();
    $('#game').show();
    
    $('#num-trials').html(numTrials);
    $('#level').html(startingLevel);
    level = startingLevel;
    $('#num-loops').html(numLoops);
  
    setTimeout( function() {
      runTrial(numLoops, numTrials, testing);
    }, 100);
  }
  
  function runTrial(numLoops, numTrials, testing) {
    trial++;
    if (trial > numTrials) {
      return;
    }
    
    initGraphics();
    $('#trial').html(trial);
    $('#level').html(level);
    $('#circle-outer, #circle-middle, #circle-inner').removeClass('combo');
    $('#multiplier').fadeOut('scale');
    $('#spacebar').hide();
    
    clearTrial();
    var rhy = new Rhythm(testing);
    drawCues(rhy);
    hideMarker(rhy);
    drawProgressMarkers(numLoops);
    countoff(rhy);
    
    $('#listen').html('LISTEN');
    $('#listen').fadeIn();
    
    setTimeout( function() {
      setMarker(rhy);
      rhy.listen();
      two.play();
      setTimeout( function() {
        $('#listen').html('READY?');
        setTimeout( function() {
          //$('#listen').html('2');
          setTimeout( function() {
            $('#listen').html('PLAY!');
            setTimeout( function() {
              //$('#listen').html('PLAY!');
            }, rhy.intervalsPerBeat * rhy.interval);
          }, rhy.intervalsPerBeat * rhy.interval);
        }, rhy.intervalsPerBeat * rhy.interval);
      }, rhy.duration * (LISTEN_LOOPS - 2) + rhy.duration / rhy.numMeasures);
      
      setTimeout( function() {
        
        rhy.play(numLoops);
        $('#listen').hide();
        $('#play').show().delay(1000).fadeOut();
        $('#spacebar').show();
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
        hit(rhy);
      }
    });
    var totalLoops = LISTEN_LOOPS + numLoops;
    setTimeout( function() {
      two.pause();
      hideMarker();
      var accuracy = Math.round((rhy.hits - rhy.misses) / (rhy.numNotes * numLoops) * 100);
      endTrialDialog(rhy, accuracy, numLoops);
      var nextGameStarted = false;
      setTimeout( function() {
        if (nextGameStarted)
          return;
        nextGameStarted = true;
        rhy.running = false;
        $('#dialog-container').fadeOut();
        
        if (accuracy > NEXT_LEVEL_ACC) {
          level++;
        }
        else if (accuracy < BACK_LEVEL_ACC && level > 1) {
          level--;
        }
        
        runTrial(numLoops, numTrials, testing);
      }, 4000);
    }, rhy.measureDuration + rhy.duration * (totalLoops));
  }
  
  function endTrialDialog(rhy, accuracy, numLoops) {
    $('#dialog-container').fadeIn();
    $('#dialog-hits').html(rhy.hits + ' / ' + rhy.numNotes * numLoops);
    $('#dialog-misses').html(rhy.misses);
    $('#dialog-accuracy').html(accuracy + '%');
    var pointSign = '';
    if (rhy.points > 0) {
      pointSign = '+';
    }
    $('#dialog-points').html(pointSign + rhy.points);
  }
  
  function hideMarker() {
    markerGroup.opacity = 0;
  }
  
  function setMarker(rhy) {
    markerGroup.opacity = 1;
    // Sets rotation of the markerGroup to the equivalent percentage of the rhythm the current timestamp is on.
    two.bind('update', function(frameCount) {
      markerGroup.rotation = (new Date().getTime() - rhy.listeningStartTime) % rhy.duration / rhy.duration * 2 * Math.PI;
      if(level >= LEVEL_FADE_MARKER && level < LEVEL_NO_MARKER) {
        markerGroup.opacity = Math.max(markerGroup.opacity - .002, 0);
      }
      if(level >= LEVEL_NO_MARKER && new Date().getTime() > rhy.listeningStartTime + rhy.measureDuration * LISTEN_LOOPS) {
        markerGroup.opacity = Math.max(markerGroup.opacity - .007, 0);
      }
    });
  }
  
  function drawCues(rhy) {
    if (level >= LEVEL_NO_CUES) {
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
      if (level >= LEVEL_FADE_CUES) {
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
    
/*
    var markerInner = two.makeLine(0, -markSmallLength / 2, 0, markSmallLength / 2);
    markerInner.translation.set(0, -radius);
    markerInner.stroke = '#49ACE1';
    markerInner.linewidth = markSmallThickness;
    markerGroup.add(markerInner);
*/
    
    two.bind('update', function() {
      cue.opacity -= .02;
/*       markerInner.opacity -= .1; */
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
  
  function clearTrial() {
    $('.cue').remove();
    $('.cue-hit').remove();
    $('.cue-miss').remove();
    $('.progress-mark').remove();
  }
  
  function toggleCombo(flag) {
    if (flag == true) {
      markerOuter.stroke = '#EB9023';
      markerInner.stroke = '#FDA92F';
      $('#multiplier').slideDown();
      playSound('combo', 0, .6);
    }
    else if (flag == false) {
      markerOuter.stroke = '#eee';
      markerInner.stroke = '#fff';
      $('#multiplier').slideUp();
      playSound('comboOff', 0, .6);
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
    this.intervalsPerBeat = 1;
    this.beatsPerMeasure = 4;
    this.numMeasures = 1;
    this.length;
    this.interval;
    this.duration;
    this.measureDuration;
    
    if (level >= LEVEL_EIGHTH_NOTES) {
      this.intervalsPerBeat = 2;
    }
    if (level >= LEVEL_TRIPLET_NOTES) {
      this.intervalsPerBeat = 3;
    }
    if (level >= LEVEL_SIXTEENTH_NOTES) {
      this.intervalsPerBeat = 4;
    }
    if (level >= LEVEL_TWO_MEASURES) {
      this.numMeasures = 2;
    }
    if (level >= LEVEL_THREE_MEASURES) {
      this.numMeasures = 3;
    }
    if (level >= LEVEL_FOUR_MEASURES) {
      this.numMeasures = 4;
    }
    
    if (testing) {
      this.length = testingLength;
    }
    else {
      this.length = this.numMeasures * this.intervalsPerBeat * this.beatsPerMeasure;
    }
    for (var i = 0; i < this.length; i++) {
      this.beats[i] = 0;
    }
    if (testing) {
      this.tempo = testingTempo;
    }
    else {
      this.tempo = Math.floor(Math.random() * (MAX_TEMPO - MIN_TEMPO + 1)) + MIN_TEMPO; // randomly selects a tempo between the min and max
    }
    this.interval = 60000 / this.tempo / this.intervalsPerBeat; // conversion from bpm to millis per interval
    this.duration = this.length * this.interval; // millis duration of rhythm
    this.measureDuration = this.duration / this.numMeasures;
    this.instrument = Math.floor(Math.random() * instruments.length); // randomly sets an instrument
    
    this.numNotes = Math.min(Math.max(Math.floor(level / 2) + 2, 3), this.length - 1); // level goes 1 to MAX_LEVEL
    if (level == 1) {
      this.numNotes = 4;
    }
    for (var i = 0; i < this.numNotes; i++) {
      var beat = -1;
      while(beat < 0 || this.beats[beat] == 1) {
        beat = Math.floor(Math.random() * this.length);
        if (beat % this.intervalsPerBeat > 0 && Math.random() < (10 - level)/10) // reduces number of offbeat notes according to level
          beat = beat % this.intervalsPerBeat;
      }
      this.beats[beat] = 1;
    }
    
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
    
    this.cues = {};
    for (var i = 0; i < this.length; i++) {
      if (this.beats[i] == 1) {
        var angle = 2 * Math.PI * i / this.length;
        this.cues[i] = angle;
      }
    }
    
  }
  
  Rhythm.prototype.generateRhythm = function() {
    
  }
  
  Rhythm.prototype.addBackgroundRhythm = function(backBeats, backInstrument) {
    this.beats2 = backBeats;
    this.instrument2 = backInstrument;
  }
  
  Rhythm.prototype.listen = function() {
    var parent = this;
    this.listeningStartTime = new Date().getTime();
    for (var i = 0; i < LISTEN_LOOPS; i++) {
      for (var j = 0; j < this.length; j++) {
        if (this.beats[j] == 1) {
          playSound(instruments[parent.instrument], i * this.duration + j * this.interval, 1);
        }
      }
      if (this.beats2 != null) {
        for (var j = 0; j < this.length; j++) {
          if (this.beats2[j] == 1) {
            playSound(instruments[parent.instrument], i * this.duration + j * this.interval, 1);
          }
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
          playSound(instruments[parent.instrument], i * this.duration + j * this.interval, 1);// + i * offset); // creates play instance of all loops
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
  
  
  Rhythm.prototype.score = function() {
    if (this.running == false || new Date().getTime() > this.startTime + this.duration * this.numLoops - this.interval) {
      return;
    }
    var inputTime = new Date().getTime() - this.startTime;
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
            
            var angle = this.cues[j];
            drawHitIndicator(angle);
            this.points += addedScore;
            score += addedScore;
            $('#score').html(score);
            return;
          }
        }
      }
    }
    // if the user did not hit on a beat
    playSound('miss', 0, negativeFeedbackVolume);
    this.misses++;
    this.combo = 0;
    if (this.comboOn == true) {
      toggleCombo(false);
      this.comboOn = false;
    }
    this.points -= MISS_SCORE;
    if (score - MISS_SCORE >= 0) {
      score -= MISS_SCORE;
    }
    else {
      score = 0;
    }
    $('#score').html(score);
    var angle = 2 * Math.PI * (inputTime % this.duration / this.duration);
    drawMissIndicator(angle);
  }
  
  function addScore(num) {
    score += num;
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
  
  // Game functions
  function drawProgressMarkers(numLoops) {
    for (var i = 0; i < LISTEN_LOOPS; i++) {
      $('#progress-play').before('<div class="progress-mark" id="progress-mark-listen-'+i+'"></div>');
    }
    for (var i = 0; i < numLoops; i++) {
      $('#progress').append('<div class="progress-mark" id="progress-mark-play-'+i+'"></div>');
    }
  }
  
  function hit(rhy) {
    rhy.score();
    $('#spacebar').addClass('pressed');
    $('#marker').addClass('pressed');
    setTimeout( function() {
      $('#spacebar').removeClass('pressed');
      $('#marker').removeClass('pressed');
    }, 50);
  }
  
});