let canvas = document.querySelector("canvas");
let cx = canvas.getContext("2d");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

let width = 200;
let height = 100;
cx.fillRect(100,100,width,height);
cx.fillRect(400,100,width,height);
cx.fillRect(200,400,width,height);

cx.beginPath();
cx.moveTo(100,100);
cx.lineTo(500,500);
cx.stroke();

cx.beginPath();
cx.arc(800,300, 50, 0, Math.PI);
cx.stroke();

for(let i=0; i < 0; i++){
  let x = window.innerWidth * Math.random();
  let y = window.innerHeight * Math.random();
  cx.beginPath();
  cx.arc(x,y, 50, 0, 2 * Math.PI);
  cx.stroke();
}

function trackKeys(keys){
  keysObj = Object.create(null);
  function keyTracker(evt){
    evt.preventDefault();
    if(keys.includes(evt.key))
      keysObj[evt.key] = evt.type == "keydown";
    console.log(keysObj);
  }
  window.addEventListener("keydown", keyTracker);
  window.addEventListener("keyup", keyTracker);
  return keysObj;
}
function drawShip(a,b,c){
  function moveShip(time, keys){
    let shiftx = keys["ArrowUp"] ? -time : 0;
    for (let point of [a,b,c])
      point.y += 100*shiftx;
      //point.y *= shifty
    cx.clearRect(0, 0, canvas.width, canvas.height);
    cx.beginPath();
    cx.moveTo(a.x,a.y);
    cx.lineTo(b.x,b.y)
    cx.lineTo(c.x,c.y);
    cx.lineTo(a.x,a.y);
    cx.stroke();
  }
  moveShip(0, []);
  return moveShip;
};
let ship = drawShip({x:600,y:500},{x:500,y:600},{x:700,y:600});
let keysDown = trackKeys(["ArrowUp", "ArrowLeft", "ArrowRight", "ArrowDown"]);

function animateShip(time, lastTime){
  if (lastTime != null){
    let timeStep = Math.min(10, time - lastTime) / 1000;
    //console.log("here");
    ship(timeStep,keysDown);
  }
  lastTime = time;
  requestAnimationFrame(time => animateShip(time, lastTime));
}

requestAnimationFrame(animateShip);
