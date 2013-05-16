/******************************************
Title: Musical rhythm game for Lumosity.com
Author: Scott Takahashi
Date: April 27, 2013
******************************************/

// Parameters

var TESTING = false;

var testRhythms = [
                    [1, 0, 1, 0, 1, 0, 1, 0],
                    [1, 0, 1, 0, 1, 0, 0, 0],
                    [1, 1, 0, 0, 1, 0, 0, 0],
                    [1, 0, 0, 1, 1, 0, 0, 0],
                    [1, 1, 0, 0, 0, 0, 0, 0],
                    [1, 0, 0, 1, 0, 0, 1, 0],
                    [0, 0, 1, 0, 1, 0, 0, 1]
                  ];

var STARTING_LEVEL = 1;

var MIN_TEMPO = 110;
var MAX_TEMPO = 130;

var MAX_LEVEL = 10;
var LOOPS_PER_TRIAL = 8;
var NUM_TRIALS = 8; 

var COMBO_LOOPS = 2;
var LISTEN_LOOPS = 2;

var BASE_SCORE = 50;
/* var COMBO_SCORE = 200; */
var MISS_SCORE = 30;

var NEXT_LEVEL_ACC = 80;
var BACK_LEVEL_ACC = 30;

var LEVEL_FADE_CUES = 3;
var LEVEL_NO_CUES = 6;

var trial = 0;
var level = 0;
var score = 0;

var instruments = [];
var bucketSize = 200; // size of bucket when evaluating hits, in millis

var circleXPos = 320;
var circleYPos = 240;
var circleR = 124;
var circleBorderThickness = 8;

function loadInstruments() {
    createjs.Sound.registerSound('files/count.wav', 'count');
    createjs.Sound.registerSound('files/1.mp3', 'inst1');
    instruments.push('inst1');
    createjs.Sound.registerSound('files/1_miss.mp3', 'inst1miss');
    instruments.push('inst1miss');
    createjs.Sound.registerSound('files/2.wav', 'inst2');
    instruments.push('inst2');
}

$(document).ready(function () {

  loadInstruments();

  //// Initialize Graphics ////
  
  $('#game').hide();
  $('#spacebar').hide();

  var sideLength = 300;
  var center = sideLength / 2;
  var radius = 120;
  var markLargeLength = 26;
  var markSmallLength = 24;
  var markLargeThickness = 24;
  var markSmallThickness = 10;
  var trackOuterWidth = 2;
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

  $('#start-game').click( function(e) {
    e.preventDefault();
    runGame(parseInt($('#starting-level').val()), parseInt($('#num-loops-input').val()), parseInt($('#num-trials-input').val()));
  });
  
  
  
  function runGame(startingLevel, numLoops, numTrials) {
    $('#menu, #countoff, #dialog-container, #multiplier, #play').hide();
    $('#game').show();
    
    $('#num-trials').html(numTrials);
    $('#level').html(startingLevel);
    level = startingLevel;
    $('#num-loops').html(numLoops);
  
    setTimeout( function() {
      runTrial(numLoops, numTrials);
    }, 100);
  }
  
  function runTrial(numLoops, numTrials) {
    trial++;
    if(trial >= numTrials) {
      return;
    }
    
    initGraphics();
    $('#trial').html(trial);
    $('#level').html(level);
    $('#circle-outer, #circle-middle, #circle-inner').removeClass('combo');
    $('#multiplier').fadeOut('scale');
    $('#spacebar').hide();
    
    clearTrial();
    var rhy = new Rhythm(TESTING);
    drawCues(rhy);
    drawProgressMarkers(numLoops);
    
    resetMarker();
    
    // Sets rotation of the markerGroup to the equivalent percentage of the rhythm the current timestamp is on.
    two.bind('update', function(frameCount) {
      var offset = .7;
      markerGroup.rotation = (new Date().getTime() - rhy.startTime) % rhy.duration / rhy.duration * 2 * Math.PI;
      //markerGroup.rotation += 2 * Math.PI * 1000 / ((60 - offset) * rhy.duration);
    });
    
    if(level > 6) {
      $('.cue').hide();
    }
    countoff(rhy);
    $('#listen').fadeIn();
    setTimeout( function() {
      rhy.listen();
      setTimeout( function() {
        two.play();
        rhy.play(numLoops);
        $('#listen').hide();
        $('#play').show().delay(1000).fadeOut();
        $('#spacebar').show();
        for(var i = 0; i < numLoops; i++) {
          setTimeout(
            (function(num) {
              return function() {
                $('#loop').html(num);
              }
            })(i + 1), i * rhy.duration);
        }
      }, rhy.duration * LISTEN_LOOPS);
    }, 8 * rhy.interval);
    
    $('body').keypress( function(event) {
      if(event.which == 32) { // if key pressed is space bar
        event.preventDefault();
        hit(rhy);
      }
    });
    var totalLoops = LISTEN_LOOPS + numLoops;
    setTimeout( function() {
      two.pause();
      resetMarker();
      $('#dialog-container').fadeIn();
      $('#dialog-count').html(rhy.hits + ' / ' + rhy.numNotes * numLoops + ' beats');
      var accuracy = Math.round(rhy.hits / (rhy.numNotes * numLoops) * 100);
      $('#dialog-accuracy').html(accuracy + '% accuracy');
      var pointSign = '';
      if(rhy.points > 0) {
        pointSign = '+';
      }
      $('#dialog-points').html(pointSign + rhy.points + ' points');
      var nextGameStarted = false;
      setTimeout( function() {
        if(nextGameStarted)
          return;
        nextGameStarted = true;
        rhy.running = false;
        $('#dialog-container').fadeOut();
        if(accuracy > NEXT_LEVEL_ACC) {
          level++;
        } else if(accuracy < BACK_LEVEL_ACC && level > 1) {
          level--;
        }
        runTrial(numLoops, numTrials);
      }, 3000);
    }, rhy.interval * 8 + rhy.duration * (totalLoops));
  }
  
  function resetMarker() {
    markerGroup.rotation = 0;
    two.update();
  }
  
  function drawCues(rhy) {
    if(level >= LEVEL_NO_CUES) {
      return;
    }
    for(var beat in rhy.cues) {
      var angle = rhy.cues[beat];
      var cue = two.makeLine(0, -markLargeLength / 2, 0, markLargeLength / 2);
      cue.rotation = angle;
      cue.translation.set(Math.sin(angle) * radius, - Math.cos(angle) * radius);
      cue.stroke = 'rgba(0, 0, 0, .5)';
      cue.linewidth = markLargeThickness;
      cueGroup.add(cue);
      fadeCue(cue);
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
      console.log('fading!');
      cue.opacity -= .005;
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
    if(flag == true) {
/*       markerOuter.stroke = '#EB9023'; */
      markerInner.stroke = '#FDA92F';
    }
    else if(flag == false) {
/*       markerOuter.stroke = '#eee'; */
      markerInner.stroke = '#fff';
    }
  }
  
  // Rhythm class functions
  
  function Rhythm(testing) {
    this.running = false;
    this.testing = testing;
    this.beats = [];
    this.hits = 0;
    this.misses = 0;
    this.combo = 0;
    this.points = 0;
    this.length = 8; // one 4/4 measure in eigth notes
    
    if (level > 6) {
      this.length = 12; // 2 4/4 measures in eight notes
    }
    if (level > 10) {
      this.length = 16;
    }
    
    for(var i = 0; i < this.length; i++) {
      this.beats[i] = 0;
    }
    this.tempo = Math.floor(Math.random() * (MAX_TEMPO - MIN_TEMPO + 1)) + MIN_TEMPO; // randomly selects a tempo between the min and max
    this.interval = 60000 / this.tempo / 2; // conversion from bpm to millis per eight note
    this.duration = this.length * this.interval; // millis duration of rhythm
    
    this.instrument = 0//Math.floor(Math.random() * instruments.length); // randomly sets an instrument
    
    this.numNotes = Math.min(Math.max(Math.floor(level / 2) + 2, 3), this.length - 2); // level goes 1 to MAX_LEVEL
    if(level == 1) {
      this.numNotes = 4;
    }
    for (var i = 0; i < this.numNotes; i++) {
      var beat = -1;
      while(beat < 0 || this.beats[beat] == 1) {
        beat = Math.floor(Math.random() * this.length);
        if(beat % 2 == 1 && Math.random() < (MAX_LEVEL - level + 1)/MAX_LEVEL) // reduces number of offbeat notes according to level
          beat--;
      }
      this.beats[beat] = 1;
    }
    
    if(this.testing == true) {
      if(trial < testRhythms.length) {
        this.beats = testRhythms[trial - 1];
      }
    }
    
    this.cues = {};
    for(var i = 0; i < this.length; i++) {
      if(this.beats[i] == 1) {
        var angle = 2 * Math.PI * i / this.length;
/*
        var xPos = circleXPos + circleR * Math.sin(angle);
        var yPos = circleYPos - circleR * Math.cos(angle);
        var coords = [xPos, yPos];
*/
        this.cues[i] = angle;
      }
    }
    
  }
  
  Rhythm.prototype.listen = function() {
    var parent = this;
    for(var i = 0; i < LISTEN_LOOPS; i++) {
      for(var j = 0; j < this.length; j++) {
        if(this.beats[j] == 1) {
          playSound(instruments[parent.instrument], i * this.duration + j * this.interval);// + i * offset); // creates play instance of all loops
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
    for(var i = 0; i < numLoops; i++) {
      for(var j = 0; j < this.length; j++) {
        if(this.beats[j] == 1) {
          playSound(instruments[parent.instrument], i * this.duration + j * this.interval);// + i * offset); // creates play instance of all loops
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
    if(this.running == false || new Date().getTime() > this.startTime + this.duration * this.numLoops) {
      return;
    }
    var inputTime = new Date().getTime() - this.startTime;
    for(var i = 0; i < this.numLoops; i++) {
      if(inputTime >= this.duration * i - bucketSize / 2 && inputTime <= this.duration * (i + 1) - bucketSize / 2) {
        for(var j = 0; j < this.length; j++) {
          
          if(inputTime >= this.duration * i + this.interval * j - bucketSize / 2 &&
             inputTime <= this.duration * i + this.interval * j + bucketSize / 2 &&
             this.beats[j] == 1) {
            this.hits++;
            this.combo++;
            var addedScore = BASE_SCORE;
            if(this.combo > 0 && this.combo % (this.numNotes * COMBO_LOOPS) == 0) {
              var multiplier = Math.floor(this.combo / this.numNotes / COMBO_LOOPS) + 1;
              addedScore = BASE_SCORE * multiplier;
              $('#multiplier p').html('x'+multiplier);
              $('#multiplier').slideDown();
              toggleCombo(true);
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
    
    this.misses++;
    this.combo = 0;
    toggleCombo(false);
    $('#multiplier').slideUp();
    this.points -= MISS_SCORE;
    if(score - MISS_SCORE >= 0) {
      score -= MISS_SCORE;
      
    } else {
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
  /*   $('#countoff').show(); */
    for(var i=0; i < 4; i++) {
      playSound('count', r.interval * i * 2);
  /*
      setTimeout( 
        (function(num) {
          return function() {
            $('#countoff').html(num);
          }
      })(i+1), r.interval * i * 2);
  */
    }
  /*
    setTimeout( function() {
      $('#countoff').hide();
    }, r.interval * i * 2);
  */
    
  }
  
  function playSound(instrument, delay) {
    createjs.Sound.play(instrument, createjs.Sound.INTERRUPT_ANY, delay);
  }
  
  // Game functions
  function drawProgressMarkers(numLoops) {
    for(var i = 0; i < LISTEN_LOOPS; i++) {
      $('#progress-play').before('<div class="progress-mark" id="progress-mark-listen-'+i+'"></div>');
    }
    for(var i = 0; i < numLoops; i++) {
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