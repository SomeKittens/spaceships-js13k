'use strict';

var name = ('kittens' + Math.random()).replace('.','');
var socket = io(document.location.href);

var canvas = document.getElementById('canvas'),
  height = canvas.height = 700,
  width = canvas.width = 1280,
  context = canvas.getContext('2d'),
  dtime = Date.now(),
  timing = 1000,
  centerHeight = height / 2 | 0,
  centerWidth = width / 2 | 0;

var stars = new CanvasCollection(Star);
var players = new CanvasCollection(FBPlayer);
var particles = new CanvasCollection(Particle, 1000);
var playerBullets = new CanvasCollection(Particle);
var thisPlayer = new Player();

playerBullets.colliding = function (x, y) {
  for (var i = 0; i < playerBullets.items.length; i++) {
    if (within(playerBullets.items[i].x, x, 24) && within(playerBullets.items[i].y, y, 24)) {
      return true;
    }
  }
  return false;
};

var keys = {};
document.body.addEventListener('keydown', function(e) {
  keys[e.keyCode] = true;
});

document.body.addEventListener('keyup', function(e) {
  keys[e.keyCode] = false;
});

socket.emit('init', {
  x: thisPlayer.x,
  y: thisPlayer.y,
  dx: thisPlayer.dx,
  dy: thisPlayer.dy,
  angle: thisPlayer.angle,
  firing: !!keys[32],
  name: name
});

function run() {
  var now = Date.now();
  if (now - dtime > timing) {
    dtime = now;
    timing = Math.random() * 1000;
    for (var i = 0; i < 5; i++) {
      stars.create();
    }
  }
  stars.update();
  thisPlayer.update();
  particles.update();
  playerBullets.update();
  players.update();

  stars.gc();
  particles.gc();
  playerBullets.gc();
  players.gc();

  context.clearRect(0, 0, width, height);
  stars.render();
  players.render();
  thisPlayer.render();
  particles.render();
  playerBullets.render();
  context.globalAlpha = 1;
  requestAnimationFrame(run);
}

setInterval(function () {
  socket.emit('heartbeat', {
    x: thisPlayer.x,
    y: thisPlayer.y,
    dx: thisPlayer.dx,
    dy: thisPlayer.dy,
    angle: thisPlayer.angle,
    firing: !!keys[32],
    name: name
  });
}, 1000 / 30);

run();

// Share prototype things
var fbPlayers = {};
socket.on('join', function (data) {
  if (data.name === name) {
    return;
  }
  // Create the player if we haven't seen them before
  if (!fbPlayers[data.name]) {
    fbPlayers[data.name] = players.create(data);
  }
});
socket.on('exploded', function (data) {
  if (data.name === name) {
    thisPlayer.explode();
    return;
  }
  var plr = fbPlayers[data.name];
  if (plr) {
    // Handle them exploding
    boom(plr.x, plr.y, plr.dx, plr.dy);
    plr.exploded = true;
  }
});
socket.on('reset', function (data) {
  fbPlayers[data.name].reset(data);
});
socket.on('heartbeat', function (data) {
  if (!fbPlayers[data.name]) {
    fbPlayers[data.name] = players.create(data);
    return;
  }
  var plr = fbPlayers[data.name];
  // Typical update
  plr.x = data.x;
  plr.y = data.y;
  plr.dx = data.dx;
  plr.dy = data.dy;
  plr.angle = data.angle;
  plr.firing = data.firing;
});
socket.on('child_removed', function (data) {
  fbPlayers[data.name] = null;
});

window.addEventListener('beforeunload', function () {
  socket.emit('leave', {name:name});
}, false);