import * as createjs from 'createjs-module';

const canvas = document.getElementById('myCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

export const stage = new createjs.Stage(canvas);
export const viewport = new createjs.Container();

stage.addChild(viewport);


createjs.Touch.enable(stage);

let dragStartPoint;
let dragStartPosition;
let scale = 0.5;

window.addEventListener('resize', resizeStage);
// Drag and Drop
viewport.addEventListener('mousedown', startDrag);
viewport.addEventListener('pressup', stopDrag);

// Zoom on scroll
window.addEventListener('wheel', handleScroll);

function resizeStage(event) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  stage.setBounds(0, 0, window.innerWidth, window.innerHeight);

  stage.update();
}
function handleScroll(event) {
  const delta = Math.sign(event.deltaY);
  if (delta > 0) {
    zoomOut();
  } else if (delta < 0) {
    zoomIn();
  }
}

function zoomIn(event) {
    scale *= 1.1;
    applyScale();
}

function zoomOut(event) {
    scale /= 1.1;
    applyScale();
}

function startDrag(event) {
    dragStartPoint = new createjs.Point(event.stageX, event.stageY);
    dragStartPosition = { x: viewport.x, y: viewport.y };
    viewport.addEventListener("pressmove", doDrag);
}

function doDrag(event) {
    const dx = (event.stageX - dragStartPoint.x) / scale;
    const dy = (event.stageY - dragStartPoint.y) / scale;
    viewport.x = dragStartPosition.x + dx;
    viewport.y = dragStartPosition.y + dy;
    stage.update();
}

function stopDrag(event) {
    viewport.removeEventListener("pressmove", doDrag);
}

function applyScale() {
    stage.scaleX = stage.scaleY = scale;
    stage.update();
}