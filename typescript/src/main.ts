import './style.css';
//import {Fluid} from './fluid';
import { Fluid } from './fluid';

var fluid = new Fluid(500);

var canvas: HTMLCanvasElement;
var ctx: CanvasRenderingContext2D;
let width =  1280;
let height = 720;

export const constants = {
  canvasWidth: width,
  canvasHeight: height,
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
  
    fluid.runFrame(ctx, deltaTime);
  }
}


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
}

