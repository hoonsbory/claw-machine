// 일회용 시제품: 집게 손맛(터치 조준 · 집힘 · 미끄러짐)만 확인한다. 본 제작에 재사용하지 않는다.
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ── 기계 치수 ──
const FLOOR_HALF = 3;
const WALL_HEIGHT = 7;
const CHUTE_X = -1.2; // 배출구는 x < CHUTE_X, z > CHUTE_Z 인 앞쪽 왼편 구석
const CHUTE_Z = 1.2;
const CHUTE_WALL_HEIGHT = 1.0;
const HOME = { x: -2.1, z: 2.1 };

// ── 집게 움직임 ──
const CLAW_LIMIT = 2.5;
const CLAW_SPEED = 3.2;
const HUB_REST_Y = 5.0;
const HUB_MIN_Y = 0.95;
const DROP_SPEED = 3.2;
const LIFT_SPEED = 2.2;
const CLOSE_TIME = 0.45;
const RELEASE_TIME = 1.1;
const OPEN_TIME = 0.3;
const SWAY_STIFFNESS = 120;
const SWAY_DAMPING = 12;

// ── 집기 판정 ──
const GRAB_RADIUS = 0.85;
const BLOCK_RADIUS = 0.75; // 이 안에 인형이 있으면 집게가 그 위에서 멈춘다
const HOLD_OFFSET = 0.75; // 집게 몸통에서 잡힌 인형 중심까지의 거리
const STOP_OFFSET = 0.8;
const HOLD_FOLLOW = 15;
const SLIP_MIN_TIME = 0.5;
const SLIP_MAX_TIME = 2.4;
const SAG_TIME = 0.4;
const SAG_DEPTH = 0.35;
const PITY_AFTER_FAILS = 3;
const PITY_MIN_QUALITY = 0.25;

// ── 인형 ──
const DOLL_COUNT = 8;
const DOLL_BODY_RADIUS = 0.5;
const DOLL_HEAD_RADIUS = 0.36;
const DOLL_HEAD_OFFSET = 0.62;
const DOLL_COLORS = [0xff8fb1, 0xffc46b, 0x8fd3ff, 0xb9a2ff, 0x9be3b0, 0xfff0a3, 0xff9d7a, 0xffffff];
const WIN_REMOVE_DELAY = 0.9;

const FIXED_STEP = 1 / 60;
const STICK_TRAVEL = 36;

// ── 화면 ──
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

scene.add(new THREE.HemisphereLight(0xffffff, 0xffc4dc, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(2, 12, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -5;
sun.shadow.camera.right = 5;
sun.shadow.camera.top = 5;
sun.shadow.camera.bottom = -5;
scene.add(sun);

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspect = width / height;
  const isPortrait = aspect < 1;
  // 세로 화면에서는 기계 폭이 화면 폭에 맞도록 시야각을 넓힌다
  // 카메라를 멀리 두고 시야각을 좁혀야 화면 가장자리의 집게가 기울어 보이지 않는다
  const HALF_WIDTH_TAN = 0.175;
  const LANDSCAPE_FOV = 23;
  const fov = isPortrait ? THREE.MathUtils.radToDeg(2 * Math.atan(HALF_WIDTH_TAN / aspect)) : LANDSCAPE_FOV;
  camera.fov = fov;
  camera.aspect = aspect;
  camera.position.set(0, 14, 22);
  // 세로 화면은 아래쪽에 조작부가 깔리므로 시선을 낮춰 기계를 위로 올린다
  camera.lookAt(0, isPortrait ? -1.2 : 2.2, 0);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
window.addEventListener('resize', resize);
resize();

// ── 물리 ──
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
const dollMaterial = new CANNON.Material('doll');
const wallMaterial = new CANNON.Material('wall');
world.addContactMaterial(new CANNON.ContactMaterial(dollMaterial, dollMaterial, { friction: 0.5, restitution: 0.15 }));
world.addContactMaterial(new CANNON.ContactMaterial(dollMaterial, wallMaterial, { friction: 0.6, restitution: 0.1 }));

function addStaticBox(center, half, meshMaterial) {
  const body = new CANNON.Body({ mass: 0, material: wallMaterial });
  body.addShape(new CANNON.Box(new CANNON.Vec3(half.x, half.y, half.z)));
  body.position.set(center.x, center.y, center.z);
  world.addBody(body);
  if (!meshMaterial) return;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(half.x * 2, half.y * 2, half.z * 2), meshMaterial);
  mesh.position.set(center.x, center.y, center.z);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

const floorLook = new THREE.MeshStandardMaterial({ color: 0xfff3f8 });
const backLook = new THREE.MeshStandardMaterial({ color: 0xffb3d1 });
const glassLook = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 });
const acrylicLook = new THREE.MeshStandardMaterial({ color: 0xff7fb0, transparent: true, opacity: 0.45 });
const WALL_THICKNESS = 0.1;
const wallY = WALL_HEIGHT / 2;

addStaticBox({ x: 0, y: -0.5, z: 0 }, { x: FLOOR_HALF, y: 0.5, z: FLOOR_HALF }, floorLook);
addStaticBox({ x: 0, y: wallY, z: -FLOOR_HALF - WALL_THICKNESS }, { x: FLOOR_HALF, y: wallY, z: WALL_THICKNESS }, backLook);
addStaticBox({ x: 0, y: wallY, z: FLOOR_HALF + WALL_THICKNESS }, { x: FLOOR_HALF, y: wallY, z: WALL_THICKNESS }, null);
addStaticBox({ x: -FLOOR_HALF - WALL_THICKNESS, y: wallY, z: 0 }, { x: WALL_THICKNESS, y: wallY, z: FLOOR_HALF }, glassLook);
addStaticBox({ x: FLOOR_HALF + WALL_THICKNESS, y: wallY, z: 0 }, { x: WALL_THICKNESS, y: wallY, z: FLOOR_HALF }, glassLook);

// 배출구 칸막이 두 장과 어두운 바닥
const chuteDepth = (FLOOR_HALF - CHUTE_Z) / 2;
const chuteWidth = (FLOOR_HALF + CHUTE_X) / 2;
const chuteWallY = CHUTE_WALL_HEIGHT / 2;
addStaticBox({ x: CHUTE_X, y: chuteWallY, z: CHUTE_Z + chuteDepth }, { x: 0.06, y: chuteWallY, z: chuteDepth }, acrylicLook);
addStaticBox({ x: -FLOOR_HALF + chuteWidth, y: chuteWallY, z: CHUTE_Z }, { x: chuteWidth, y: chuteWallY, z: 0.06 }, acrylicLook);
const chuteFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(chuteWidth * 2, chuteDepth * 2),
  new THREE.MeshStandardMaterial({ color: 0x7a2f55 }),
);
chuteFloor.rotation.x = -Math.PI / 2;
chuteFloor.position.set(-FLOOR_HALF + chuteWidth, 0.01, CHUTE_Z + chuteDepth);
scene.add(chuteFloor);

// 기계 받침대
const cabinet = new THREE.Mesh(
  new THREE.BoxGeometry(FLOOR_HALF * 2 + 0.6, 6, FLOOR_HALF * 2 + 0.6),
  new THREE.MeshStandardMaterial({ color: 0xff6fa5 }),
);
cabinet.position.set(0, -4.02, 0);
scene.add(cabinet);

// ── 인형 ──
const dolls = [];

function createDollMesh(color) {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a2030 });
  const parts = [
    { radius: DOLL_BODY_RADIUS, position: [0, 0, 0], material: fur },
    { radius: DOLL_HEAD_RADIUS, position: [0, DOLL_HEAD_OFFSET, 0], material: fur },
    { radius: 0.13, position: [-0.26, 0.92, 0], material: fur },
    { radius: 0.13, position: [0.26, 0.92, 0], material: fur },
    { radius: 0.045, position: [-0.13, 0.68, 0.32], material: dark },
    { radius: 0.045, position: [0.13, 0.68, 0.32], material: dark },
    { radius: 0.05, position: [0, 0.58, 0.35], material: dark },
  ];
  for (const part of parts) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(part.radius, 20, 16), part.material);
    mesh.position.set(...part.position);
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}

function isInChute(x, z) {
  return x < CHUTE_X && z > CHUTE_Z;
}

function randomSpawnPoint() {
  const SPAWN_LIMIT = 2.3;
  const CHUTE_MARGIN = 0.4;
  for (;;) {
    const x = THREE.MathUtils.randFloatSpread(SPAWN_LIMIT * 2);
    const z = THREE.MathUtils.randFloatSpread(SPAWN_LIMIT * 2);
    if (!isInChute(x - CHUTE_MARGIN, z + CHUTE_MARGIN)) return { x, z };
  }
}

function spawnDoll(index) {
  const { x, z } = randomSpawnPoint();
  const body = new CANNON.Body({ mass: 1, material: dollMaterial, linearDamping: 0.05, angularDamping: 0.35 });
  body.addShape(new CANNON.Sphere(DOLL_BODY_RADIUS));
  body.addShape(new CANNON.Sphere(DOLL_HEAD_RADIUS), new CANNON.Vec3(0, DOLL_HEAD_OFFSET, 0));
  body.position.set(x, 1.5 + index * 0.9, z);
  body.quaternion.setFromEuler(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  world.addBody(body);
  const mesh = createDollMesh(DOLL_COLORS[index % DOLL_COLORS.length]);
  scene.add(mesh);
  dolls.push({ body, mesh, wonAt: null });
}

function removeDoll(doll) {
  world.removeBody(doll.body);
  scene.remove(doll.mesh);
  dolls.splice(dolls.indexOf(doll), 1);
}

function refill() {
  while (dolls.length > 0) removeDoll(dolls[0]);
  for (let i = 0; i < DOLL_COUNT; i += 1) spawnDoll(i);
}

// ── 집게 ──
const metal = new THREE.MeshStandardMaterial({ color: 0xd9dbe6, metalness: 0.7, roughness: 0.3 });
const PRONG_LENGTH = 0.85;
const PRONG_OPEN_ANGLE = 0.55;
const PRONG_CLOSED_ANGLE = 0.1;
const PRONG_HOLDING_ANGLE = 0.32;
const RAIL_Y = 6.6;

const clawGroup = new THREE.Group();
scene.add(clawGroup);
const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.25, 20), metal);
hub.castShadow = true;
clawGroup.add(hub);

const prongs = [];
for (let i = 0; i < 3; i += 1) {
  const mount = new THREE.Group();
  mount.rotation.y = (i * Math.PI * 2) / 3;
  const arm = new THREE.Group();
  arm.position.x = 0.18;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, PRONG_LENGTH, 0.07), metal);
  bar.position.y = -PRONG_LENGTH / 2;
  bar.castShadow = true;
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.07), metal);
  tip.position.set(-0.08, -PRONG_LENGTH, 0);
  arm.add(bar, tip);
  mount.add(arm);
  clawGroup.add(mount);
  prongs.push(arm);
}

const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), metal);
scene.add(cable);
const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), metal);
scene.add(carriage);
const rail = new THREE.Mesh(new THREE.BoxGeometry(FLOOR_HALF * 2, 0.12, 0.2), metal);
scene.add(rail);

const guideLook = new THREE.MeshBasicMaterial({ color: 0xff3d7f, transparent: true, opacity: 0.55 });
const guideRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 32), guideLook);
guideRing.rotation.x = -Math.PI / 2;
scene.add(guideRing);
const guideBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 6), guideLook);
scene.add(guideBeam);

const claw = {
  x: HOME.x,
  z: HOME.z,
  hubY: HUB_REST_Y,
  // 줄에 매달린 흔들림: 화면에 보이는 위치가 실제 위치를 스프링으로 따라간다
  shownX: HOME.x,
  shownZ: HOME.z,
  swayVx: 0,
  swayVz: 0,
  closeAmount: 0,
  state: 'idle',
  stateTime: 0,
  pendingGrab: null,
  held: null,
};

// ── 화면 요소 · 입력 ──
const triesLabel = document.getElementById('tries');
const winsLabel = document.getElementById('wins');
const toast = document.getElementById('toast');
const dropButton = document.getElementById('drop');
const gripInput = document.getElementById('grip');
const gripValueLabel = document.getElementById('gripValue');
const pityInput = document.getElementById('pity');
const guideInput = document.getElementById('guide');
const stick = document.getElementById('stick');
const knob = document.getElementById('knob');

const stats = { tries: 0, wins: 0, failStreak: 0, wonThisTry: false };
const stickInput = { x: 0, y: 0 };
const pressedKeys = new Set();
let toastTimer = 0;

function showToast(text) {
  const TOAST_DURATION = 1100;
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), TOAST_DURATION);
}

let audioContext = null;
function beep(frequency, duration, endFrequency = frequency) {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.linearRampToValueAtTime(endFrequency, now + duration);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function buzz(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

window.addEventListener('pointerdown', () => {
  if (audioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (AudioContextClass) audioContext = new AudioContextClass();
}, { once: true });

function updateStick(event) {
  const rect = stick.getBoundingClientRect();
  const radius = rect.width / 2;
  let dx = (event.clientX - (rect.left + radius)) / radius;
  let dy = (event.clientY - (rect.top + radius)) / radius;
  const length = Math.hypot(dx, dy);
  if (length > 1) {
    dx /= length;
    dy /= length;
  }
  stickInput.x = dx;
  stickInput.y = dy;
  knob.style.transform = `translate(${dx * STICK_TRAVEL}px, ${dy * STICK_TRAVEL}px)`;
}

function releaseStick() {
  stickInput.x = 0;
  stickInput.y = 0;
  knob.style.transform = '';
}

stick.addEventListener('pointerdown', (event) => {
  stick.setPointerCapture(event.pointerId);
  updateStick(event);
});
stick.addEventListener('pointermove', (event) => {
  if (stick.hasPointerCapture(event.pointerId)) updateStick(event);
});
stick.addEventListener('pointerup', releaseStick);
stick.addEventListener('pointercancel', releaseStick);

function requestDrop() {
  if (claw.state !== 'idle') return;
  setState('drop');
  stats.tries += 1;
  stats.wonThisTry = false;
  triesLabel.textContent = String(stats.tries);
  beep(520, 0.5, 260);
}

dropButton.addEventListener('pointerdown', requestDrop);
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    requestDrop();
    return;
  }
  pressedKeys.add(event.code);
});
window.addEventListener('keyup', (event) => pressedKeys.delete(event.code));

gripInput.addEventListener('input', () => {
  gripValueLabel.textContent = Number(gripInput.value).toFixed(2);
});
document.getElementById('refill').addEventListener('click', refill);

function readMoveInput() {
  let x = stickInput.x;
  let z = stickInput.y;
  if (pressedKeys.has('ArrowLeft')) x -= 1;
  if (pressedKeys.has('ArrowRight')) x += 1;
  if (pressedKeys.has('ArrowUp')) z -= 1;
  if (pressedKeys.has('ArrowDown')) z += 1;
  return { x: THREE.MathUtils.clamp(x, -1, 1), z: THREE.MathUtils.clamp(z, -1, 1) };
}

// ── 집기 판정 ──
function horizontalDistance(doll) {
  return Math.hypot(doll.body.position.x - claw.x, doll.body.position.z - claw.z);
}

function findStopHeight() {
  let stopY = HUB_MIN_Y;
  for (const doll of dolls) {
    if (doll.wonAt !== null) continue;
    if (horizontalDistance(doll) > BLOCK_RADIUS) continue;
    stopY = Math.max(stopY, doll.body.position.y + STOP_OFFSET);
  }
  return stopY;
}

function decideGrab() {
  let target = null;
  let targetDistance = GRAB_RADIUS;
  for (const doll of dolls) {
    if (doll.wonAt !== null) continue;
    const isReachable = doll.body.position.y < claw.hubY - HOLD_OFFSET + DOLL_BODY_RADIUS;
    const distance = horizontalDistance(doll);
    if (!isReachable || distance >= targetDistance) continue;
    target = doll;
    targetDistance = distance;
  }
  if (!target) return null;

  // 가운데를 정확히 잡을수록, 집게 힘이 셀수록 끝까지 들고 간다
  const quality = 1 - targetDistance / GRAB_RADIUS;
  const grip = Number(gripInput.value);
  const holdChance = THREE.MathUtils.clamp(grip * 1.3 * (0.3 + 0.7 * quality), 0, 1);
  const isPityGrab = pityInput.checked && stats.failStreak >= PITY_AFTER_FAILS && quality >= PITY_MIN_QUALITY;
  const willHold = isPityGrab || Math.random() < holdChance;
  const slipAt = willHold ? Infinity : THREE.MathUtils.randFloat(SLIP_MIN_TIME, SLIP_MAX_TIME);
  return { doll: target, slipAt, heldTime: 0 };
}

function dropHeld() {
  claw.held = null;
}

function setState(next) {
  claw.state = next;
  claw.stateTime = 0;
  dropButton.disabled = next !== 'idle';
}

function finishTry() {
  if (!stats.wonThisTry) stats.failStreak += 1;
  setState('idle');
}

function moveToward(target, dt) {
  const dx = target.x - claw.x;
  const dz = target.z - claw.z;
  const distance = Math.hypot(dx, dz);
  const step = CLAW_SPEED * dt;
  if (distance <= step) {
    claw.x = target.x;
    claw.z = target.z;
    return true;
  }
  claw.x += (dx / distance) * step;
  claw.z += (dz / distance) * step;
  return false;
}

function updateClaw(dt) {
  claw.stateTime += dt;

  if (claw.state === 'idle') {
    const move = readMoveInput();
    claw.x = THREE.MathUtils.clamp(claw.x + move.x * CLAW_SPEED * dt, -CLAW_LIMIT, CLAW_LIMIT);
    claw.z = THREE.MathUtils.clamp(claw.z + move.z * CLAW_SPEED * dt, -CLAW_LIMIT, CLAW_LIMIT);
  }

  if (claw.state === 'drop') {
    const stopY = findStopHeight();
    claw.hubY -= DROP_SPEED * dt;
    if (claw.hubY <= stopY) {
      claw.hubY = stopY;
      claw.pendingGrab = decideGrab();
      setState('close');
    }
  }

  if (claw.state === 'close') {
    claw.closeAmount = Math.min(claw.stateTime / CLOSE_TIME, 1);
    if (claw.stateTime >= CLOSE_TIME) {
      claw.held = claw.pendingGrab;
      claw.pendingGrab = null;
      if (claw.held) {
        showToast('잡았다!');
        beep(700, 0.12);
        buzz(30);
      } else {
        showToast('허공…');
        beep(200, 0.2);
      }
      setState('lift');
    }
  }

  if (claw.state === 'lift') {
    claw.hubY = Math.min(claw.hubY + LIFT_SPEED * dt, HUB_REST_Y);
    if (claw.hubY >= HUB_REST_Y) setState('carry');
  }

  if (claw.state === 'carry') {
    const hasArrived = moveToward(HOME, dt);
    if (hasArrived) {
      dropHeld();
      setState('release');
    }
  }

  if (claw.state === 'release') {
    claw.closeAmount = Math.max(1 - claw.stateTime / OPEN_TIME, 0);
    if (claw.stateTime >= RELEASE_TIME) finishTry();
  }

  // 줄 흔들림
  claw.swayVx += ((claw.x - claw.shownX) * SWAY_STIFFNESS - claw.swayVx * SWAY_DAMPING) * dt;
  claw.swayVz += ((claw.z - claw.shownZ) * SWAY_STIFFNESS - claw.swayVz * SWAY_DAMPING) * dt;
  claw.shownX += claw.swayVx * dt;
  claw.shownZ += claw.swayVz * dt;
}

function updateHeld(dt) {
  const held = claw.held;
  if (!held) return;
  held.heldTime += dt;
  if (held.heldTime >= held.slipAt) {
    dropHeld();
    showToast('미끄러졌어…');
    beep(300, 0.35, 120);
    buzz([20, 40, 20]);
    return;
  }
  // 미끄러지기 직전에는 인형이 조금씩 처진다
  const sagProgress = THREE.MathUtils.clamp((held.heldTime - (held.slipAt - SAG_TIME)) / SAG_TIME, 0, 1);
  const body = held.doll.body;
  const targetY = claw.hubY - HOLD_OFFSET - sagProgress * SAG_DEPTH;
  body.velocity.set(
    (claw.shownX - body.position.x) * HOLD_FOLLOW,
    (targetY - body.position.y) * HOLD_FOLLOW,
    (claw.shownZ - body.position.z) * HOLD_FOLLOW,
  );
  body.angularVelocity.scale(0.85, body.angularVelocity);
}

function updateWins(now) {
  const CHUTE_DETECT_Y = 0.9;
  for (const doll of [...dolls]) {
    if (doll.wonAt !== null) {
      if (now - doll.wonAt >= WIN_REMOVE_DELAY) removeDoll(doll);
      continue;
    }
    const isHeld = claw.held !== null && claw.held.doll === doll;
    const position = doll.body.position;
    if (isHeld || !isInChute(position.x, position.z) || position.y > CHUTE_DETECT_Y) continue;
    doll.wonAt = now;
    stats.wins += 1;
    stats.failStreak = 0;
    stats.wonThisTry = true;
    winsLabel.textContent = String(stats.wins);
    showToast('뽑았다! 🎉');
    beep(660, 0.15);
    setTimeout(() => beep(880, 0.15), 130);
    setTimeout(() => beep(1320, 0.3), 260);
    buzz([60, 40, 120]);
  }
}

function syncMeshes() {
  for (const doll of dolls) {
    doll.mesh.position.copy(doll.body.position);
    doll.mesh.quaternion.copy(doll.body.quaternion);
  }

  const SWAY_TILT = 0.9;
  clawGroup.position.set(claw.shownX, claw.hubY, claw.shownZ);
  clawGroup.rotation.z = (claw.x - claw.shownX) * SWAY_TILT;
  clawGroup.rotation.x = -(claw.z - claw.shownZ) * SWAY_TILT;

  const closedAngle = claw.held || claw.pendingGrab ? PRONG_HOLDING_ANGLE : PRONG_CLOSED_ANGLE;
  const prongAngle = THREE.MathUtils.lerp(PRONG_OPEN_ANGLE, closedAngle, claw.closeAmount);
  for (const prong of prongs) prong.rotation.z = prongAngle;

  const cableLength = RAIL_Y - claw.hubY;
  cable.scale.y = cableLength;
  cable.position.set((claw.x + claw.shownX) / 2, claw.hubY + cableLength / 2, (claw.z + claw.shownZ) / 2);
  carriage.position.set(claw.x, RAIL_Y, claw.z);
  rail.position.set(0, RAIL_Y + 0.2, claw.z);

  const isGuideVisible = guideInput.checked && claw.state === 'idle';
  guideRing.visible = isGuideVisible;
  guideBeam.visible = isGuideVisible;
  guideRing.position.set(claw.x, 0.03, claw.z);
  guideBeam.scale.y = claw.hubY;
  guideBeam.position.set(claw.x, claw.hubY / 2, claw.z);
}

// ── 루프 ──
const clock = new THREE.Clock();
const MAX_FRAME_TIME = 0.05;

function frame() {
  const dt = Math.min(clock.getDelta(), MAX_FRAME_TIME);
  updateClaw(dt);
  updateHeld(dt);
  world.step(FIXED_STEP, dt, 3);
  updateWins(clock.elapsedTime);
  syncMeshes();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

refill();
frame();

// 자동 점검용 손잡이 (시제품 한정)
window.__spike = { claw, dolls, stats, requestDrop };
