import './style.css';
//import {Fluid} from './fluid';
import { Fluid } from './fluid';


var canvas: HTMLCanvasElement;
var ctx: CanvasRenderingContext2D;
let width =  800;
let height = 800;


var fluid = null as any;

export const canvasDimensions = {
  width: width,
  height: height,
}

window.onload = () => {
  setupCanvas();
  loop();
}

var lastTimestamp = 0; 
function loop() {
  let now = performance.now();
  let deltaTime = (now - lastTimestamp) / 1000;
  lastTimestamp = now;
  requestAnimationFrame(loop);
  if(ctx) {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);
  
    fluid.runFrame(deltaTime);
  }
}

var mouseDown = false;
function setupCanvas() {

  let container = document.createElement('div');
  container.id = "container";
  
  canvas = document.createElement('canvas');
  canvas.id = "game";
  canvas.width = width;
  canvas.height = height;

  container.appendChild(canvas);
  document.body.appendChild(container);

  ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  fluid = new Fluid(500, ctx);

  setupControls(fluid);

  canvas.addEventListener('mousedown', function(e) {
    //get mouse position in canvas
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    mouseDown = true;

    fluid.setInteractionForce({force: -75, position: {x, y}});
  });

  canvas.addEventListener('mousemove', function(e) {
    if(mouseDown) {
      //get mouse position in canvas
      let rect = canvas.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
  
      fluid.setInteractionForce({force: -75, position: {x, y}});
    }
  });


  canvas.addEventListener('mouseup', function(e) {
    mouseDown = false;
    fluid.setInteractionForce({force: 0, position: {x: 0, y: 0}});
  });

}

function setupControls(fluidInstance: Fluid) {
  (window as any).setGravity = (gravity: number) => fluidInstance.gravityEncap(gravity);
  (window as any).setCollisionDamping = (damping: number) => fluidInstance.collisionDampingEncap(damping);
  (window as any).setSmoothingRadius = (radius: number) => fluidInstance.smoothingRadiusEncap(radius);
  (window as any).setViscosity = (viscosity: number) => fluidInstance.viscosityEncap(viscosity);
  (window as any).setTargetDensity = (density: number) => fluidInstance.targetDensityEncap(density);
  (window as any).setPressureMultiplier = (density: number) => fluidInstance.pressureMultiplierEncap(density);
  (window as any).setNearPressureMultiplier = (density: number) => fluidInstance.nearPressureMultiplierEncap(density);

  var event = new CustomEvent('fluidReady');
  document.dispatchEvent(event);
}