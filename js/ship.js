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
    if(keysDown["Space"] && laserBattery.isReady()){
      let ship = newActors.find(actor => actor.type == "ship");
      newActors = newActors.concat([new Laser(ship.bow, ship.angle)])
    }
    let newState = new State(this.status, newActors);
    let ship = newActors.find(actor => actor.type == "ship");
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
    if (!canvas){
      this.canvas = document.createElement("canvas");
      this.canvas.style.height = this.parent.style.height;
      this.canvas.style.width = "100%";
      this.canvas.style.border = "2px solid black";
    }
    this.parent.appendChild(this.canvas);
  }
  syncState(state){
    let cx = this.canvas.getContext("2d");
    cx.clearRect(0,0,this.canvas.width, this.canvas.height);
    // if leaves canvas 'teleport' to other side
    state.actors = state.actors.map(actor => {
      let newActor = actor;
      if (actor.center.x > canvas.width + actor.radius){
        newActor = actor.move(actor.center.plus(new Vec(-canvas.width - actor.radius,0)));
      }
      if (actor.center.x < 0 - actor.radius){
        newActor = actor.move(actor.center.plus(new Vec(canvas.width + actor.radius,0)));
      }
      if (actor.center.y > canvas.height + actor.radius){
        newActor = actor.move(actor.center.plus(new Vec(0, -canvas.height - actor.radius)));
      }
      if (actor.center.y < 0 - actor.radius){
        newActor = actor.move(actor.center.plus(new Vec(0, canvas.height + actor.radius)));
      }

      return newActor;
    });
    state.actors = state.actors.filter( x => x != null);
    state.actors.map(actor => this.draw(actor,cx));
  }
  draw({points}, cx){
    cx.beginPath();
    cx.moveTo(points[0].x, points[0].y);
    for(let i=0; i <= points.length; i++)
      cx.lineTo(points[i % points.length].x,points[i % points.length].y);
    cx.stroke();
  }
}
let canvas = document.querySelector("canvas");
let cx = canvas.getContext("2d");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

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
    let bow = this.translate(center, angle, radius);
    this.bow = bow;
    let port =  this.translate(center, angle + 3 * Math.PI / 4, radius);
    let starboard = this.translate(center, angle + -3 * Math.PI / 4, radius);
    return [bow,port,center, starboard];
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
    }
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
      return new State(state.status, newActors);
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

let laserDelay = 150;
let shipAcceleration = 4;
let turnSpeed = 5;
let asteroidSpeed = 150;
let laserBattery = createLaserBattery(laserDelay);
//let ship = new Ship(new Vec(0,0), new Vec(300,300), 0, 20);
//let asteroid = new Asteroid(new Vec(30,30), 40, asteroidSpeed);

let display = new Display(document.body, canvas);
let ship = new Ship(new Vec(0,0), new Vec(canvas.width / 2,canvas.height/2), 0, 20);
let randomAsteroid = () => new Asteroid(new Vec(canvas.width,canvas.height),Math.random()*100,asteroidSpeed + Math.random()*100);
let asteroids = [1,2,3,4,5].map(randomAsteroid);
let state = new State("playing",[ship].concat(asteroids));
let keysDown = trackKeys(["ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown", "Space"]);
display.syncState(state);


function animate(time, lastTime){
  if (lastTime != null){
    let timeStep = Math.min(10, time - lastTime) / 1000;
    state = state.update(timeStep, keysDown);
    display.syncState(state);
  }
  lastTime = time;
  requestAnimationFrame(time => animate(time, lastTime));
}

requestAnimationFrame(animate);
