// Keyboard and mouse state for Emberfall. The game reads this module, never
// the DOM directly, so shot scenes can drive the same code with scripted
// input instead of a real player.

// Logical canvas size the mouse coordinates are mapped into.
import { VIEW_W, VIEW_H } from './config.js';

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: VIEW_W / 2,
    mouseY: VIEW_H / 2 - 160,
    mouseDown: false,
    // Edge-triggered presses, consumed once by the game loop.
    pressedDash: false,
    pressedPause: false,
    pressedStart: false,
    pressedRestart: false,
    pressedMute: false,
  };

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW_W,
      y: ((clientY - rect.top) / rect.height) * VIEW_H,
    };
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    input.keys.add(key);
    if (key === ' ') input.pressedDash = true;
    if (key === 'p' || key === 'escape') input.pressedPause = true;
    if (key === 'enter') input.pressedStart = true;
    if (key === 'r') input.pressedRestart = true;
    if (key === 'm') input.pressedMute = true;
  }

  function onKeyUp(event) {
    input.keys.delete(event.key.toLowerCase());
  }

  function onMouseMove(event) {
    const p = canvasPoint(event.clientX, event.clientY);
    input.mouseX = p.x;
    input.mouseY = p.y;
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    const p = canvasPoint(event.clientX, event.clientY);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseDown = true;
  }

  function onMouseUp(event) {
    if (event.button !== 0) return;
    input.mouseDown = false;
  }

  function onBlur() {
    input.keys.clear();
    input.mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);

  return input;
}

// The four movement directions as a normalised vector from held keys.
export function moveVector(input) {
  let x = 0;
  let y = 0;
  if (input.keys.has('a') || input.keys.has('arrowleft')) x -= 1;
  if (input.keys.has('d') || input.keys.has('arrowright')) x += 1;
  if (input.keys.has('w') || input.keys.has('arrowup')) y -= 1;
  if (input.keys.has('s') || input.keys.has('arrowdown')) y += 1;
  if (x !== 0 && y !== 0) {
    const inv = 1 / Math.hypot(x, y);
    x *= inv;
    y *= inv;
  }
  return { x, y };
}

// Clear the edge-triggered presses after the game loop has read them.
export function consumePresses(input) {
  input.pressedDash = false;
  input.pressedPause = false;
  input.pressedStart = false;
  input.pressedRestart = false;
  input.pressedMute = false;
}

// A scripted input for deterministic shot scenes: the same shape as a live
// input object, driven by a small program instead of the keyboard.
export function createScriptedInput() {
  return {
    keys: new Set(),
    mouseX: VIEW_W / 2,
    mouseY: VIEW_H / 2 - 160,
    mouseDown: false,
    pressedDash: false,
    pressedPause: false,
    pressedStart: false,
    pressedRestart: false,
    pressedMute: false,
  };
}
