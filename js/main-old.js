// Logic for music game

var MIN_TEMPO = 110;
var MAX_TEMPO = 130;

var MAX_LEVEL = 10;

var NUM_L_TRIALS = 15;

var instruments = [];
var bucketSize = 300; // size of bucket when evaluating hits, in millis

function loadInstruments() {
  createjs.Sound.registerSound('files/count.wav', 'count');
  createjs.Sound.registerSound('files/1.wav', 'inst1');
  instruments.push('inst1');
  createjs.Sound.registerSound('files/2.wav', 'inst2');
  instruments.push('inst2');
}

// Rhythm class functions

function Rhythm(mode, skillLevel) {
  this.mode = mode;
  this.beats = [];
  this.evaluating = false;
  this.hits = 0;
  this.misses = 0;
  this.length = 8; // one 4/4 measure in eigth notes
  if (skillLevel > 6) {
    this.length = 12; // 2 4/4 measures in eight notes
  }
  for(var i = 0; i < this.length; i++) {
    this.beats[i] = 0;
  }
  this.tempo = Math.floor(Math.random() * (MAX_TEMPO - MIN_TEMPO + 1)) + MIN_TEMPO;
  this.interval = 60000 / this.tempo / 2; // conversion from bpm to millis per eight note
  this.duration = this.length * this.interval;
  
  this.instrument = Math.floor(Math.random() * instruments.length); // randomly sets an instrument
  
  this.numNotes = Math.min(Math.max(Math.floor(skillLevel / 2) + 2, 3), this.length - 2) ; // skillLevel goes 1 to MAX_LEVEL
  for (var i = 0; i < this.numNotes; i++) {
    var beat = -1;
    while(beat < 0 || this.beats[beat] == 1) {
      beat = Math.floor(Math.random() * this.length);
      if(beat % 2 == 1 && Math.random() < (MAX_LEVEL - skillLevel)/MAX_LEVEL) // reduces number of offbeat notes according to skillLevel
        beat--;
    }
    this.beats[beat] = 1;
  }
}

Rhythm.prototype.play = function(mute) {
  this.startTime = new Date().getTime();
  var parent = this;
  for(var i = 0; i < this.length; i++) {
    if(this.beats[i] == 1 && mute != true) {
      playSound(instruments[parent.instrument], this.interval * i);
    }
  }
}

Rhythm.prototype.eval = function() {
  var inputTime = new Date().getTime() - this.startTime;
  for(var i = 0; i < this.length; i++) {
    if(inputTime > this.interval * i - bucketSize / 2 &&
       inputTime < this.interval * i + bucketSize / 2 &&
       this.beats[i] == 1) {
      this.hits++;
      if(this.mode == 'linear') {
        $('#linearGame').append('<div class="lHitIndicator" id="l-hit-'+ this.hits + '"></div>');
        var ind = '#l-hit-' + this.hits;
        var pos = $('#timeline').position().left + this.interval * i / this.duration * $('#timeline').width();
        $(ind).css({left:pos});
      }
      else if(this.mode == 'circular') {
        $('#circularGame').append('<div class="cHitIndicator" id="c-hit-'+ this.hits + '"></div>');
        var ind = '#c-hit-' + this.hits;
        var angle = 2 * Math.PI * i / this.length;
        var radius = 103;
        xPos = 320 + Math.sin(angle)*radius;
        yPos = 250 - Math.cos(angle)*radius;
        $(ind).css({left: xPos, top: yPos});
      }
      return;
    }
  }
  this.misses++;
  if(this.mode == 'linear') {
    $('#linearGame').append('<div class="lMissIndicator" id="miss'+ this.misses + '"></div>');
    var ind = '#miss' + this.misses;
    var pos = $('#timeline').position().left + inputTime / this.duration * $('#timeline').width();
    $(ind).css({left:pos});
  }
  else if(this.mode == 'circular') {
    $('#circularGame').append('<div class="cMissIndicator" id="c-miss-'+ this.misses + '"></div>');
    var ind = '#c-miss-' + this.misses;
    var angle = 2 * Math.PI * inputTime / this.duration;
    var radius = 103;
    xPos = 320 + Math.sin(angle)*radius;
    yPos = 250 - Math.cos(angle)*radius;
    $(ind).css({left: xPos, top: yPos});
  }
}

// Playback functions

function countoff(r) {
  $('#countoff').show();
  for(var i=0; i < 4; i++) {
    playSound('count', r.interval * i * 2);
    setTimeout( 
      (function(num) {
        return function() {
          $('#countoff').html(num);
        }
    })(i+1), r.interval * i * 2);
  }
  setTimeout( function() {
    $('#countoff').hide();
  }, r.interval * i * 2);
  
}

function countoffNumbers(i) {
  $('#countoff').html(i);
}

function playSound(instrument, delay) {
  createjs.Sound.play(instrument, createjs.Sound.INTERRUPT_ANY, delay);
}

// Game functions

function runLGame(startingSkill) {
  $('#lLevel').html('Level: ' + startingSkill);
  $('#lMarker').css({left: '170px'});
  $('.lHitIndicator').remove();
  $('.lMissIndicator').remove();
  $('#spacebar').hide();
  $('#lInstructions').html('Listen to the beat!');
  $('lLevel').html('Level: '+startingSkill);
  var rhy = new Rhythm('linear', startingSkill);
  console.log(rhy.beats);
  countoff(rhy);
  setTimeout( function() {
    rhy.play();
    $('#lMarker').animate({left: '+=300px'}, rhy.duration, 'linear');
    setTimeout( function() {
      $('#lMarker').css({left: '170px'});
      $('#lInstructions').html('Play back the beat!');
      $('#spacebar').show();
      countoff(rhy);
      setTimeout( function() {
        rhy.evaluating = true;
        rhy.play(true);
        $('#lMarker').animate({left: '+=300px'}, rhy.duration, 'linear');
        setTimeout( function() {
          rhy.evaluating = false;
          setTimeout( function() {
            if(rhy.misses == 0 && rhy.hits == rhy.numNotes && startingSkill < MAX_LEVEL) {
              runLGame(startingSkill+1);
            }
            else if (startingSkill > 1) {
              runLGame(startingSkill-1);
            }
            else {
              runLGame(startingSkill);
            }
          }, 2000);
        }, rhy.duration);
      }, rhy.interval * 8);
    }, rhy.duration + 1000);
  }, rhy.interval * 8);
  
  $('body').keypress( function(event) {
    if(event.which == 32 && rhy.evaluating == true) { // if key pressed is space bar
      event.preventDefault();
      playSound(instruments[rhy.instrument], 0);
      rhy.eval();
      $('#spacebar').css({background: '#ccc'});
      setTimeout( function() {
        $('#spacebar').css({background: '#fff'});
      }, 50);
    }
  });
}

var loopCount = 0;
var MAX_LOOPS = 8;

function runCGame(rhy, startingSkill) {
  var arc_param1 = {
    center: [320,250],
    radius: 103,
    start: 180,
    end: 0,
    dir: -1
  }
  var arc_param2 = {
    center: [320,250],
    radius: 103,
    start: 0,
    end: 180,
    dir: -1
  }
  $('#cLevel').html('Level: ' + startingSkill);
/*   $('#cMarker').css({left: '50%', top: '150px'}); */
  $('.cHitIndicator').remove();
  $('.cMissIndicator').remove();
  $('cLevel').html('Level: '+startingSkill);
  console.log(rhy.beats);
  console.log(loopCount);
  $('#cMarker').animate({path : new $.path.arc(arc_param1)}, rhy.duration / 2, 'linear').animate({path : new $.path.arc(arc_param2)}, rhy.duration / 2, 'linear');
  rhy.play();
  rhy.evaluating = true;
  setTimeout( function() {
    console.log('hits: ' + rhy.hits + ' misses: ' + rhy.misses);
    if(rhy.misses == 0 && rhy.hits > rhy.numNotes) {
      if(startingSkill < MAX_LEVEL) {
        loopCount = 0;
        rhy.evaluating = false;
        delete rhy;
        runCGame(new Rhythm('circular', startingSkill+1), startingSkill+1);
      }
      else {
        loopCount = 0;
        rhy.evaluating = false;
        delete rhy;
        runCGame(new Rhythm('circular', startingSkill), startingSkill);
      }
    }
    else if(loopCount < MAX_LOOPS) {
      loopCount++;
      rhy.hits = 0;
      rhy.misses = 0;
      runCGame(rhy, startingSkill);
      delete rhy;
    }
    else if (startingSkill > 1) {
      loopCount = 0;
      rhy.evaluating = false;
      delete rhy;
      runCGame(new Rhythm('circular', startingSkill-1), startingSkill-1);
    }
    else {
      loopCount = 0;
      rhy.evaluating = false;
      delete rhy;
      runCGame(new Rhythm('circular', startingSkill), startingSkill);
    }
  }, rhy.duration);
  
  $('body').keypress( function(event) {
    if(event.which == 32 && rhy.evaluating == true) { // if key pressed is space bar
      event.preventDefault();
/*       playSound(instruments[rhy.instrument], 0); */
      rhy.eval();
      $('#spacebar').css({background: '#ccc'});
      setTimeout( function() {
        $('#spacebar').css({background: '#fff'});
      }, 50);
    }
  });
}

function beginGame(mode) {
  $('#menu').hide();
  $('#countoff').hide();
  if(mode == 'linear') {
    $('#linearGame').show();
    setTimeout( function() {
      runLGame(1);
    }, 1000);
  }
  else if(mode == 'circular') {
    $('#circularGame').show();
    $('#spacebar').show();
    setTimeout( function() {
      runCGame(new Rhythm('circular', 1), 1);
    }, 1000);
  }
}

$(document).ready(function () {
  $('.game').hide();
  $('#spacebar').hide();

  loadInstruments();
  
  $('#startLGame').click( function() {
    beginGame('linear');
  });
  $('#startCGame').click( function() {
    beginGame('circular');
  });
  //rhy.play(true);
  
  
});