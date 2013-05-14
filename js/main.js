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
var LEVEL_NO_CUES = 3;

var trial = 0;
var level = 0;
var score = 0;

var instruments = [];
var bucketSize = 200; // size of bucket when evaluating hits, in millis

var circleXPos = 320;
var circleYPos = 240;
var circleR = 124;
var circleBorderThickness = 8;

var arc_param1 = {
  center: [circleXPos, circleYPos],
  radius: circleR,
  start: 180,
  end: 0,
  dir: -1
}

var arc_param2 = {
  center: [circleXPos, circleYPos],
  radius: circleR,
  start: 0,
  end: 180,
  dir: -1
}

// Initialize two.js graphics

$(document).ready(function () {
  $('#game').hide();
  $('#spacebar').hide();

  loadInstruments();
/*   runGame(1, 2, 8); */

  var sideLength = 300;
  var center = sideLength / 2;
  var radius = 120;
  var markerRadius = 20;
  var elem = document.getElementById('graphics-container');
  var two = new Two({width: sideLength, height: sideLength}).appendTo(elem);
  var trackGroup = two.makeGroup();
  var cueGroup = two.makeGroup();
  var markerGroup = two.makeGroup();
  
  
  var trackOuterWidth = 6;
  var trackInnerWidth = 42;
  
  initGraphics();
  
  function initGraphics() {
    var outerCircle = two.makeCircle(0, 0, radius + trackInnerWidth / 2 + trackOuterWidth / 2);
    var middleCircle = two.makeCircle(0, 0, radius);
    var innerCircle = two.makeCircle(0, 0, radius - trackInnerWidth / 2 - trackOuterWidth / 2);
    
    var trackOuterColor = 'rgba(154, 104, 47, .6)';
    var trackInnerColor = 'rgba(154, 104, 47, .4)';
    
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
    
    var markerCont = two.makeRectangle(0, 0, sideLength, sideLength);
    markerCont.noFill();
    markerCont.noStroke();
    var marker = two.makeRectangle(-8, -55, 8, 55);//makeCircle(0, 0 - radius, markerRadius);
    marker.translation.set(0, -radius);
    marker.fill = 'red';
    marker.stroke = '#999';
    marker.lineWidth = 12;
/*     marker.noFill(); */
    
    markerGroup.add(marker, markerCont);
  /*     markerGroup.center(center, center); */
    markerGroup.translation.x = center;
    markerGroup.translation.y = center;
    console.log(cueGroup);
    two.update();
  }
  
  


  $('#start-game').click( function() {
    runGame(STARTING_LEVEL, LOOPS_PER_TRIAL, NUM_TRIALS);
    
  });
  
  function loadInstruments() {
    createjs.Sound.registerSound('files/count.wav', 'count');
    
    createjs.Sound.registerSound('files/1.mp3', 'inst1');
    instruments.push('inst1');
    createjs.Sound.registerSound('files/1_miss.mp3', 'inst1miss');
    instruments.push('inst1miss');
    createjs.Sound.registerSound('files/2.wav', 'inst2');
    instruments.push('inst2');
  }
  
  function runGame(startingLevel, numLoops, numTrials) {
    $('#menu, #countoff, #dialog, #multiplier').hide();
/*
    $('#countoff').hide();
    $('#dialog').hide();
    $('#multiplier').hide();
*/
    $('#game').show();
    
    $('#num-trials').html(numTrials);
    $('#level').html(startingLevel);
    level = startingLevel;
    $('#num-loops').html(numLoops);
  /*   console.log(rhy.beats); */
  
    setTimeout( function() {
      runTrial(numLoops, numTrials);
      
    }, 100);
  }
  
  function runTrial(numLoops, numTrials) {
    trial++;
    if(trial >= numTrials) {
      return;
    }
    
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
/*       var offset = .7; */
      markerGroup.rotation = (new Date().getTime() - rhy.startTime) % rhy.duration / rhy.duration * 2 * Math.PI;// 2 * Math.PI * 1000 / ((60 - offset) * rhy.duration);
    });
    
    if(level > 6) {
      $('.cue').hide();
    }
/*     countoff(rhy); */
    setTimeout( function() {
      rhy.listen();
      setTimeout( function() {
        two.play();
        rhy.play(numLoops);
        $('#spacebar').show();
        for(var i = 0; i < numLoops; i++) {
          setTimeout(
            (function(num) {
              return function() {
                loopMarker(rhy);
                $('#loop').html(num);
              }
            })(i + 1), i * rhy.duration);
        }
      }, rhy.duration * LISTEN_LOOPS);
    }, 0);// 8 * rhy.interval);
    
    $('body').keypress( function(event) {
      if(event.which == 32) { // if key pressed is space bar
        event.preventDefault();
        hit(rhy);
      }
    });
    
    setTimeout( function() {
      two.pause();
      resetMarker();
      $('#dialog').fadeIn();
      $('#dialog-count').html(rhy.hits + ' / ' + rhy.numNotes * numLoops + ' beats');
      var accuracy = Math.round(rhy.hits / (rhy.numNotes * numLoops) * 100);
      $('#dialog-accuracy').html(accuracy + '%');
      $('#dialog-points').html('+' + rhy.points + ' points');
  /*     $('#dialog-accuracy').html(rhy.hits / rhy.numNotes + '%'); */
      var nextGameStarted = false;
      $('#nextTrial').click( function() {
        if(nextGameStarted)
          return;
        nextGameStarted = true;
        rhy.running = false;
        $('#dialog').fadeOut();
        if(accuracy > NEXT_LEVEL_ACC) {
          level++;
        } else if(accuracy < BACK_LEVEL_ACC && level > 1) {
          level--;
        }
        runTrial(numLoops, numTrials);
      });
    }, /* rhy.interval * 8 + */ rhy.duration * (LISTEN_LOOPS + numLoops));
  }
  
  function resetMarker() {
    markerGroup.rotation = 0;
    two.update();
  }
  
  function drawCues(rhy) {
    for(var beat in rhy.cues) {
/*
      var xPos = rhy.cues[beat][0];
      var yPos = rhy.cues[beat][1];
*/ 
      var angle = rhy.cues[beat];
      
/*       var cueID = '#cue-' + beat; */
/*       $(cueID).css({left: xPos + 'px', top: yPos + 'px'}); */
      console.log(angle);
      var cue = two.makeCircle(- radius * Math.cos(angle),radius * Math.sin(angle), markerRadius);
      cue.fill = '#fff';
      cue.noStroke();
      cueGroup.add(cue);
    }
/*
    if(level >= LEVEL_FADE_CUES && level < LEVEL_NO_CUES) {
      $('.cue').fadeOut(4000);
    }
    else if(level >= LEVEL_NO_CUES) {
      $('.cue').remove();
    }
*/
    two.update();
  }
  
  function clearTrial() {
    $('.cue').remove();
    $('.cue-hit').remove();
    $('.cue-miss').remove();
    $('.progress-mark').remove();
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
              $('#circle-outer, #circle-middle, #circle-inner').addClass('combo');
              $('#multiplier').show('scale');
              addedScore = BASE_SCORE * multiplier;
              $('#multiplier p').html('SCORE X'+multiplier);
              $('#multiplier').fadeIn('scale');
            }
            
            var xPos = this.cues[j][0];
            var yPos = this.cues[j][1];
            $('#game').append('<div class="cue-hit" id="cue-hit-' + this.hits + '"></div>');
            var cueID = '#cue-hit-' + this.hits;
            $(cueID).css({left: xPos + 'px', top: yPos + 'px'}).fadeOut(1000);
  
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
    $('#circle-outer, #circle-middle, #circle-inner').removeClass('combo');
    $('#multiplier').fadeOut('scale');
  /*   playSound('inst1miss', 0); */
    this.points -= MISS_SCORE;
    score -= MISS_SCORE;
    $('#score').html(score);
    
    var angle = 2 * Math.PI * (inputTime % this.duration / this.duration);
    console.log('angle: ' + angle);
  /*   var radius = 103; */
    xPos = circleXPos + Math.sin(angle) * circleR;
    yPos = circleYPos - Math.cos(angle) * circleR;
    $('#game').append('<div class="cue-miss" id="cue-miss-' + this.misses + '"></div>');
    var cueID = '#cue-miss-' + this.misses;
    $(cueID).css({left: xPos, top: yPos}).fadeOut();
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
  
  function loopMarker(rhy) {
    $('#marker').animate({path : new $.path.arc(arc_param1)}, rhy.duration / 2, 'linear').animate({path : new $.path.arc(arc_param2)}, rhy.duration / 2, 'linear');
  }
  
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