// 操作：← → 走路　Shift+← → 跑步　↑ 跳起來　空白鍵 發功（Sonic Boom）
// 每個動作：圖檔路徑、整張長條圖寬、高、張數（單格寬 = 總寬 ÷ 張數，皆為整數）
const SPR = {
  g_stop: { path: 'assets/g_stop.png', w: 1048, h: 164, n: 8 },
  g_walk: { path: 'assets/g_walk.png', w: 1197, h: 196, n: 9 },
  g_run:  { path: 'assets/g_run.png',   w: 895,  h: 146, n: 5 },
  g_jump: { path: 'assets/g_jump.png', w: 516,  h: 186, n: 4 },
  g_push: { path: 'assets/g_push.png', w: 948,  h: 154, n: 4 },
  g_to:   { path: 'assets/g_to.png',     w: 402,  h: 246, n: 3 },
  l_stop: { path: 'assets/l_stop.png', w: 354,  h: 91,  n: 6 },
  l_smile:{ path: 'assets/l_smile.png', w: 228, h: 105, n: 4 },
  l_fall: { path: 'assets/l_fall.png', w: 625,  h: 77,  n: 5 },
};
const SCALE = 1.6;        // 放大倍數
const SPEED_STEP = 6;     // 數字越大動畫越慢

let imgs = {};
let g = { x: 0, y: 0, vy: 0, dir: 1, state: 'stop', f: 0, t: 0 };
let lee = { x: 0, state: 'stop', f: 0, t: 0, downTimer: 0 };
let booms = [];
let groundY;

function preload() {
  for (const k in SPR) imgs[k] = loadImage(SPR[k].path);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  groundY = height - 90;
  g.x = width * 0.3; g.y = groundY;
  lee.x = width * 0.8;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  groundY = height - 90;
  if (g.state !== 'jump') g.y = groundY;
}

// 畫第 f 張；腳底中心對齊 (x, y)；dir = -1 時水平翻轉
function drawFrame(key, f, x, y, dir) {
  const s = SPR[key], cw = s.w / s.n;
  push();
  translate(x, y);
  scale(dir * SCALE, SCALE);
  image(imgs[key], -cw / 2, -s.h, cw, s.h, f * cw, 0, cw, s.h);
  pop();
}

function advance(o, key, loop) {
  o.t++;
  if (o.t >= SPEED_STEP) {
    o.t = 0; o.f++;
    if (o.f >= SPR[key].n) { if (loop) o.f = 0; else { o.f = SPR[key].n - 1; return true; } }
  }
  return false;
}

function setState(o, s) { if (o.state !== s) { o.state = s; o.f = 0; o.t = 0; } }

function draw() {
  background('#9ad1d4');
  noStroke(); fill('#5a7d5a'); rect(0, groundY, width, height - groundY);

  updateGuile();
  updateBooms();
  updateLee();

  fill(255); textSize(16);
  text('← → 走路　Shift 跑步　↑ 跳　空白鍵 發功', 16, 28);
}

function updateGuile() {
  const onGround = g.y >= groundY;
  const left = keyIsDown(LEFT_ARROW), right = keyIsDown(RIGHT_ARROW);
  const running = keyIsDown(SHIFT);

  if (g.state === 'push') {
    if (g.f === 2 && g.t === 0 && !g.fired) {             // 第 3 張出手時發射
      booms.push({ x: g.x + g.dir * 90, y: g.y - 60, dir: g.dir, f: 0, t: 0 });
      g.fired = true;
    }
    if (advance(g, 'g_push', false) && g.t === 0) { setState(g, 'stop'); g.fired = false; }
  } else if (!onGround) {
    setState(g, 'jump');
    g.vy += 1.1; g.y += g.vy;
    g.f = constrain(floor(map(g.vy, -20, 20, 0, 3.99)), 0, 3);
    if (g.y >= groundY) { g.y = groundY; g.vy = 0; setState(g, 'stop'); }
    if (left) g.x -= 6; if (right) g.x += 6;
  } else {
    if (left || right) {
      g.dir = right ? 1 : -1;
      const sp = running ? 9 : 4;
      g.x += g.dir * sp;
      setState(g, running ? 'run' : 'walk');
    } else setState(g, 'stop');
    advance(g, 'g_' + g.state, true);
  }
  g.x = constrain(g.x, 40, width - 40);
  drawFrame('g_' + g.state, g.f, g.x, g.y, g.dir);
}

function keyPressed() {
  if (keyCode === UP_ARROW && g.y >= groundY && g.state !== 'push') {
    g.vy = -20; g.y -= 1; setState(g, 'jump');
  }
  if (key === ' ' && g.y >= groundY && g.state !== 'push') {
    setState(g, 'push'); g.fired = false;
  }
  return false;
}

function updateBooms() {
  for (let i = booms.length - 1; i >= 0; i--) {
    const b = booms[i];
    b.x += b.dir * 12;
    advance(b, 'g_to', true);
    drawFrame('g_to', b.f, b.x, b.y + SPR.g_to.h * SCALE / 2, b.dir);
    // 打到 Lee
    if (lee.state !== 'fall' && abs(b.x - lee.x) < 60) {
      setState(lee, 'fall'); lee.downTimer = 0;
      booms.splice(i, 1); continue;
    }
    if (b.x < -100 || b.x > width + 100) booms.splice(i, 1);
  }
}

function updateLee() {
  const near = abs(g.x - lee.x) < 260;
  if (lee.state === 'fall') {
    if (advance(lee, 'l_fall', false) && lee.t === 0) {
      lee.downTimer++;
    }
    if (lee.f === SPR.l_fall.n - 1) {
      lee.downTimer++;
      if (lee.downTimer > 90) setState(lee, 'stop');   // 躺一下再爬起來
    }
  } else {
    setState(lee, near ? 'smile' : 'stop');
    advance(lee, 'l_' + lee.state, true);
  }
  const dir = g.x < lee.x ? -1 : 1;                     // 面向 Guile
  drawFrame('l_' + lee.state, lee.f, lee.x, groundY, dir);
}
                                                                                  