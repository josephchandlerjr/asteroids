/*
Tracks keys via an object which can be passed around
**/
function trackKeys(keys){
  let keysObj = Object.create(null);
  function keyTracker(evt){
    if(keys.includes(evt.code)){
      evt.preventDefault();
      keysObj[evt.code] = evt.type == "keydown";
    }
  }
  window.addEventListener("keydown", keyTracker);
  window.addEventListener("keyup", keyTracker);
  return keysObj;
}

class State{
  constructor(status, actors){
    this.status = status;
    this.actors = actors;
  }
  update(time, keysDown){
    let newActors = this.actors.map(actor => actor.update(time, keysDown));
    newActors = newActors.filter(a => a != null);
    let ship = newActors.find(actor => actor.type == "ship");
    if (keysDown["ArrowUp"]) newActors.push(new Exhaust(ship.exhaustPoint));
    if(keysDown["Space"] && laserBattery.isReady()){
      newActors = newActors.concat([new Laser(ship.bow, ship.angle)])
    }
    let newState = new State(this.status, newActors);
    let lasers = newActors.filter(actor => actor.type == "laser");
    // loop over newActors not newState.actors in case something is removed
    for (let actor of newActors){
      if(actor.type == "asteroid"){
        if(this.touches(ship,actor)) newState = ship.collide(newState, actor);
        for (let laser of lasers){
          if (this.touches(laser,actor)){
            newState = actor.collide(newState, laser);
            newState = laser.collide(newState, actor);
          }
        }
      }
    }


    return newState;
  }
  touches(actor1, actor2){
    for (let i=0; i<actor1.points.length; i++){
      let a = actor1.points[i];
      let b = actor1.points[ (i+1) % actor1.points.length];
      for (let j=0; j<actor2.points.length; j++){
        let c = actor2.points[j];
        let d = actor2.points[ (j+1) % actor2.points.length];

        let result = this.intersects(a.x,a.y,b.x,b.y,c.x,c.y,d.x,d.y);
        if(result) return true;
      }
    }
    return false;
  }
  intersects(a,b,c,d,p,q,r,s) {
    let det, gamma, lambda;
    det = (c - a) * (s - q) - (r - p) * (d - b);
    if (det === 0) {
      return false;
    } else {
      lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
      gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
      return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
  }
}

class Display{
  constructor(parent, canvas){
    this.parent = parent;
    this.canvas = canvas;
    this.cx = canvas.getContext("2d");
    this.parent.appendChild(this.canvas);
    this.setFont();
  }
  setFont(){
    this.cx.font = `bold ${this.canvas.width * 0.0351}px serif`;
    this.fontBeginX = this.canvas.width/3
    this.fontBeginY = this.canvas.height/3
    //console.log(fontBeginX, fontBeginX);
  }
  syncState(state){
    let cx = this.canvas.getContext("2d");
    cx.clearRect(0,0,this.canvas.width, this.canvas.height);
    // if leaves canvas 'teleport' to other side
    state.actors = state.actors.map(actor => {
      let newActor = actor;
      if (actor.center.x > this.canvas.width + actor.radius){
        newActor = actor.move(actor.center.plus(new Vec(-this.canvas.width - actor.radius,0)));
      }
      if (actor.center.x < 0 - actor.radius){
        newActor = actor.move(actor.center.plus(new Vec(this.canvas.width + actor.radius,0)));
      }
      if (actor.center.y > this.canvas.height + actor.radius){
        newActor = actor.move(actor.center.plus(new Vec(0, -this.canvas.height - actor.radius)));
      }
      if (actor.center.y < 0 - actor.radius){
        newActor = actor.move(actor.center.plus(new Vec(0, this.canvas.height + actor.radius)));
      }

      return newActor;
    });
    state.actors = state.actors.filter( x => x != null);
    state.actors.map(actor => this.draw(actor,cx));
  }
  lost(){
    let cx = this.canvas.getContext("2d");
    cx.fillStyle = "red";
    cx.fillText("Your ship has been destroyed!", this.fontBeginX, this.fontBeginY);
    cx.fillText("Press any key to start again.", this.fontBeginX, this.fontBeginY+50);
  }
  won(level){
    let cx = this.canvas.getContext("2d");
    cx.fillStyle = "black";
    cx.fillText("You win!!!", this.fontBeginX, this.fontBeginY);
    cx.fillText("Level completed", this.fontBeginX, this.fontBeginY+50);
    cx.fillText(`Press ESC to begin level ${level + 1}.`, this.fontBeginX, this.fontBeginY+100);
  }
  draw({points, type}){
    switch (type){
      case "ship"     : this.drawShip({points, type}); break;
      case "laser"    : this.drawLaser({points, type}); break;
      case "asteroid" : this.drawAsteroid({points, type}); break;
      case "explosion": this.drawExplosion({points, type}); break;
      case "exhaust"  : this.drawExhaust({points, type}); break;
      default: throw new Exception("unknown actor type");
    }
  }
  drawShip({points, type}){
    this.cx.beginPath();
    this.cx.strokeStyle = "black";
    this.cx.fillStyle = "aqua"
    this.connectPoints(points);
    this.cx.fill();
    this.cx.stroke();
  }
  drawLaser({points, type}){
    this.cx.strokeStyle = "red";
    this.cx.beginPath();
    this.connectPoints(points)
    this.cx.stroke();
  }
  drawAsteroid({points, type}){
    this.cx.strokeStyle = "black";
    this.cx. fillStyle = "#5b5439";
    this.cx.beginPath();
    this.connectPoints(points)
    this.cx.stroke();
    this.cx.fill();
  }
  drawExplosion({points, type}){
    this.cx.strokeStyle = "red";
    this.cx.beginPath();
    this.connectPoints(points)
    this.cx.stroke();
  }
  drawExhaust({points, type}){
    this.cx.strokeStyle = "orange";
    this.cx.beginPath();
    this.connectPoints(points)
    this.cx.stroke();
  }
  connectPoints(points){
    this.cx.moveTo(points[0].x, points[0].y);
    for(let i=0; i <= points.length; i++)
      this.cx.lineTo(points[i % points.length].x,points[i % points.length].y);

  }
}


class Vec {
  constructor(x, y) {
    this.x = x; this.y = y;
  }
  plus(other) {
    return new Vec(this.x + other.x, this.y + other.y);
  }
  times(factor) {
    return new Vec(this.x * factor, this.y * factor);
  }
}

class Ship{
  constructor(speed, center, angle, radius){
    this.center = center; // a vector
    this.angle = angle; // angle in radians;
    this.radius = radius; // from center to bow
    this.points = this.computePoints(center,angle,radius);
    this.speed = speed;
  }
  move(newCenter){
    return new Ship(this.speed, newCenter, this.angle, this.radius);
  }
  collide(state, actor){
    if(actor.type == "asteroid"){
      return new State("dead", state.actors)
    }
  }
  computePoints(center, angle, radius){
    this.bow = this.translate(center, angle, radius);
    this.port = this.translate(center, angle + 3 * Math.PI / 4, radius);
    this.starboard = this.translate(center, angle + -3 * Math.PI / 4, radius);
    this.exhaustPoint = this.port.plus(this.starboard).times(0.5);
    return [this.bow,this.port,this.center, this.starboard];
  }
  translate(point, angle, radius){
    return point.plus(new Vec(Math.cos(angle),Math.sin(angle)).times(radius));
  }
  update(time,keysDown){
    let newSpeed = this.speed;
    let pivot = 0;
    if (keysDown["ArrowUp"]) {
      let accel = new Vec(Math.cos(this.angle), Math.sin(this.angle));
      accel = accel.times(shipAcceleration);
      accel = accel.times(time);
      newSpeed = newSpeed.plus(accel);
    } else {
      newSpeed = newSpeed.times(.99);
    }
    //if (keysDown["ArrowDown"]) newSpeed = new Vec(0,0);
    if (keysDown["ArrowLeft"]) pivot = -time * turnSpeed;
    if (keysDown["ArrowRight"]) pivot = time * turnSpeed;
    let newCenter = this.center.plus(newSpeed);
    let newAngle = this.angle + pivot;
    return new Ship(newSpeed, newCenter, newAngle, this.radius);
  }
}

Ship.prototype.type = "ship";

class Laser{
  constructor(center, angle){
    this.center = center; // really this is where it startes
    this.angle = angle;
    this.radius = 10; // really length
    this.moveVector = new Vec(Math.cos(this.angle), Math.sin(this.angle)).times(this.radius);
    this.points = this.computePoints();
  }
  computePoints(){
    let points = [this.center];
    points.push(this.center.plus(this.moveVector));
    return points;
  }
  update(time){
    let newCenter = this.center.plus(this.moveVector);
    return new Laser(newCenter, this.angle);
  }
  collide(state, actor){
    if(actor.type == "asteroid"){
      let newActors = state.actors.filter(a => a != this);
      return new State(state.status, newActors.concat(new Explosion(actor.center)));
    }
  }
  move(newCenter){ // should never be moved
    return null;
  }
}

Laser.prototype.type = "laser";
Laser.ready = true;

class Asteroid{
  constructor(center, radius, speed, direction, pointsFactory){
    this.center = center;
    this.radius = radius;
    this.speed = speed;
    if(!direction){
      let angle = Math.random() * 2 * Math.PI;
      direction = new Vec(Math.cos(angle), Math.sin(angle));
      direction = direction.times(this.speed);
    }
    this.direction = direction;
    // factory function to create function to plot points of this asteroid
    if (!pointsFactory){
      pointsFactory = ( function(){
        let vectors = [];
        for(let angle=0; angle < 2*Math.PI; angle+= 0.4){
          let variation = Math.random() * -7;
          vectors.push(new Vec(Math.cos(angle),Math.sin(angle)).times(radius + variation));
        }
        return function(center){
          return vectors.map(vec => center.plus(vec));
        }
      } )();
    }
    this.pointsFactory = pointsFactory;
    this.points = this.pointsFactory(this.center);
  }
  move(newCenter){
    return new Asteroid(newCenter, this.radius, this.speed, this.direction, this.pointsFactory);
  }

  collide(state, actor){
    if(actor.type == "laser"){
      let newActors = state.actors.filter(a => a != this);
      let newStatus = state.status;
      if (this.radius > 40){
        let newAsteroid1 = new Asteroid(this.center, this.radius / 2, this.speed);
        let newAsteroid2 = new Asteroid(this.center, this.radius / 2, this.speed);
        newActors = state.actors.filter(a => a != this).concat([newAsteroid1, newAsteroid2]);
      } else {
        newStatus = newActors.some(actor => actor.type == "asteroid") ? "playing" : "completed";
      }
      return new State(newStatus, newActors);
    }
  }
  update(time){
    let newCenter = this.center.plus(this.direction.times(time));
    return this.move(newCenter);
  }
}

Asteroid.prototype.type = "asteroid";

class Explosion{
  constructor(center, radius, updated){
    this.center = center;
    if(radius) this.radius = radius;
    if (!updated) updated = 0;
    this.updated = updated;
    this.points = [];
    for(let a=0; a < 2 * Math.PI; a+= 0.2){
      this.points.push(this.center.plus(new Vec(Math.cos(a),Math.sin(a)).times(radius)));
    }
  }
  update(time){
    if (this.updated > this.expiresAfter) return null;
    return new Explosion(this.center, this.radius + (this.expansion + time), this.updated + 1);
  }
  move() {
    return null;
  }
}
Explosion.prototype.expiresAfter = 15;
Explosion.prototype.radius = 4;
Explosion.prototype.expansion = 3;
Explosion.prototype.type = "explosion";

class Exhaust extends Explosion{
  constructor(center, radius, updated){
    super(center, radius, updated);
  }
  update(time){
    if (this.updated > this.expiresAfter) return null;
    return new Exhaust(this.center, this.radius + (this.expansion + time), this.updated + 1);
  }
  move(){
    return null;
  }
}
Exhaust.prototype.expiresAfter = 2;
Exhaust.prototype.radius = 0.25;
Exhaust.prototype.expansion = 2;
Exhaust.prototype.type = "exhaust";

function createLaserBattery(delay){
  return {
    ready: true,
    setDelay: function(){
      this.ready = false;
      setTimeout( () => this.ready = true, delay);
    },
    isReady: function(){
      if(this.ready == false) return false;
      this.setDelay();
      return true;
    }
  }
};




let keysDown = trackKeys(["ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown", "Space"]);
let restartListener = evt => {play(); window.removeEventListener("keydown", restartListener);};

let randomAsteroid = (canvas) =>
    new Asteroid(new Vec(canvas.width,canvas.height),
                 Math.random()*canvas.width*asteroidRatio + 5,
                 asteroidSpeed + Math.random()*100 + 5);

async function play(canvas){
  function playLevel(display, state){
    return new Promise(resolve => {
      animate(timeStep =>  {
        if (!paused){
          state = state.update(timeStep, keysDown);
          display.syncState(state);
          if(state.status != "playing"){
            resolve(state.status);
            return false;
          }
        }
      });
    });
  }
  let paused = false;
  let pause = function(evt){
    if(evt.key == "Escape"){
      evt.preventDefault();
      paused = paused ? false : true;
    }
  }
  window.addEventListener("keydown", pause);

  for (let level=1; ; level++){
    let display = new Display(document.body, canvas);
    let ship = new Ship(new Vec(0,0), new Vec(canvas.width / 2,canvas.height/2), 0, canvas.width * shipRatio);
    let asteroids = [];
    for (let count=0; count < level; count++) asteroids.push(randomAsteroid(canvas));
    let state = new State("playing",[ship].concat(asteroids));
    let status = await playLevel(display, state, paused);
    if (status == "dead"){
      display.lost();
      window.addEventListener("keydown",restartListener);
      break;
    }
    if (status == "completed"){
      display.won(level);
      paused = true;
    }
  }
}

function animate(frameFunc){
  let lastTime = null;
  function frame(time){
    if(lastTime != null){
      let timeStep = Math.min(10, time - lastTime) / 1000;
      if (frameFunc(timeStep) === false) return;
    }
    lastTime = time;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}


const laserDelay = 150;
const shipAcceleration = 4;
const turnSpeed = 5;
const asteroidSpeed = 150;
const laserBattery = createLaserBattery(laserDelay);
const asteroidRatio = 0.05
const shipRatio = 0.014

let canvas = document.querySelector("canvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

play(canvas);
