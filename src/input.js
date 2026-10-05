// Keyboard + mouse (pointer lock) input, plus on-screen touch controls for phones/tablets.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;
    this.axis = { x: 0, y: 0 }; // analog move from the touch stick (x right, y forward)
    this.touchKeys = new Set();
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.target?.tagName === 'INPUT') return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.touchKeys.clear(); this.axis.x = this.axis.y = 0; });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    if (this.isTouch) this.buildTouch();
  }

  lock() {
    if (this.isTouch) return;
    if (!this.locked && this.canvas.requestPointerLock) {
      try {
        const p = this.canvas.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch { /* ignored */ }
    }
  }
  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }
  down(code) { return this.keys.has(code) || this.touchKeys.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  // ───────────────────────── touch ─────────────────────────
  setTouchVisible(v) {
    if (this.touchRoot) this.touchRoot.classList.toggle('hidden', !v);
    if (!v) { this.axis.x = this.axis.y = 0; this.touchKeys.clear(); }
  }

  buildTouch() {
    const root = document.createElement('div');
    root.id = 'touch';
    root.className = 'hidden';
    root.innerHTML = `
      <div id="tz-left"></div><div id="tz-right"></div>
      <div id="joy"><div id="knob"></div></div>
      <button class="tbtn" id="tb-jump" data-key="Space">⤒<small>JUMP</small></button>
      <button class="tbtn" id="tb-slide" data-key="ShiftLeft">⇣<small>SLIDE</small></button>
      <button class="tbtn" id="tb-act" data-key="KeyE">✋<small>USE</small></button>
      <button class="tbtn sm" id="tb-pause" data-key="KeyP">❚❚</button>`;
    document.body.appendChild(root);
    this.touchRoot = root;
    const joy = root.querySelector('#joy'), knob = root.querySelector('#knob');
    const R = 60;
    let joyId = null, ox = 0, oy = 0;
    const left = root.querySelector('#tz-left');
    left.addEventListener('pointerdown', (e) => {
      if (joyId !== null) return;
      joyId = e.pointerId; ox = e.clientX; oy = e.clientY;
      left.setPointerCapture(e.pointerId);
      joy.style.left = `${ox - R}px`; joy.style.top = `${oy - R}px`;
      joy.classList.add('on');
      knob.style.transform = 'translate(0px,0px)';
    });
    left.addEventListener('pointermove', (e) => {
      if (e.pointerId !== joyId) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      const dead = d < R * 0.15;
      this.axis.x = dead ? 0 : dx / R;
      this.axis.y = dead ? 0 : -dy / R;
    });
    const endJoy = (e) => {
      if (e.pointerId !== joyId) return;
      joyId = null;
      this.axis.x = this.axis.y = 0;
      joy.classList.remove('on');
    };
    left.addEventListener('pointerup', endJoy);
    left.addEventListener('pointercancel', endJoy);

    const right = root.querySelector('#tz-right');
    let lookId = null, lx = 0, ly = 0;
    right.addEventListener('pointerdown', (e) => {
      if (lookId !== null) return;
      lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
      right.setPointerCapture(e.pointerId);
    });
    right.addEventListener('pointermove', (e) => {
      if (e.pointerId !== lookId) return;
      this.mouseDX += (e.clientX - lx) * 2.2;
      this.mouseDY += (e.clientY - ly) * 1.6;
      lx = e.clientX; ly = e.clientY;
    });
    const endLook = (e) => { if (e.pointerId === lookId) lookId = null; };
    right.addEventListener('pointerup', endLook);
    right.addEventListener('pointercancel', endLook);

    for (const b of root.querySelectorAll('.tbtn')) {
      const code = b.dataset.key;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.pressed.add(code);
        this.touchKeys.add(code);
        b.classList.add('down');
      });
      const up = () => { this.touchKeys.delete(code); b.classList.remove('down'); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('pointerleave', up);
    }
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
