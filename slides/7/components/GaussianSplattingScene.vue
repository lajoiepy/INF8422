<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Splatting 3DGS RÉEL dans le navigateur :
// - chaque gaussienne 3D porte Σ = R S Sᵀ Rᵀ (calculée ici, en JS)
// - le vertex shader projette Σ' = J W Σ Wᵀ Jᵀ (EWA — la formule du cours,
//   vérifiée numériquement contre le jacobien de la projection)
// - tri par profondeur du centre à CHAQUE image + alpha compositing arrière→avant
const container = ref<HTMLDivElement | null>(null)
const rotating = ref(true)
const showOrder = ref(false)
const scaleMul = ref(1.0)
const nSplats = ref(0)

let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let raf = 0
let material: THREE.ShaderMaterial | null = null
let geometry: THREE.InstancedBufferGeometry | null = null
let resizeObs: ResizeObserver | null = null

// ---------- génération déterministe de la scène ----------
function lcg(seed: number) {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}
type Splat = { c: [number, number, number]; cov: number[]; color: [number, number, number]; o: number }

function covFromRS(euler: [number, number, number], s: [number, number, number]): number[] {
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...euler))
  const e = m.elements // column-major
  const R = [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]] // row-major 3×3
  const cov: number[] = []
  for (let i = 0; i < 3; i++)
    for (let j = i; j < 3; j++) {
      let v = 0
      for (let k = 0; k < 3; k++) v += R[i * 3 + k] * s[k] * s[k] * R[j * 3 + k]
      cov.push(v) // ordre: xx, xy, xz, yy, yz, zz
    }
  return cov
}
function buildScene(): Splat[] {
  const rnd = lcg(42)
  const splats: Splat[] = []
  const add = (c: [number, number, number], eu: [number, number, number], s: [number, number, number], col: [number, number, number], o: number) =>
    splats.push({ c, cov: covFromRS(eu, s), color: col, o })
  // sol (gaussiennes plates)
  for (let i = 0; i < 70; i++) {
    const x = (rnd() - 0.5) * 4.4, z = (rnd() - 0.5) * 4.4
    const g = 0.42 + rnd() * 0.2
    add([x, -0.02 + rnd() * 0.02, z], [0, rnd() * Math.PI, 0],
      [0.22 + rnd() * 0.16, 0.015, 0.22 + rnd() * 0.16],
      [g * 0.75, g, g * 0.68], 0.8)
  }
  // tronc (allongées verticales)
  for (let i = 0; i < 7; i++) {
    add([(rnd() - 0.5) * 0.06, 0.1 + i * 0.13, (rnd() - 0.5) * 0.06],
      [(rnd() - 0.5) * 0.3, rnd() * Math.PI, (rnd() - 0.5) * 0.3],
      [0.05, 0.14, 0.05], [0.45 + rnd() * 0.1, 0.3, 0.14], 0.95)
  }
  // feuillage (blobs anisotropes)
  for (let i = 0; i < 55; i++) {
    const th = rnd() * 2 * Math.PI, ph = Math.acos(2 * rnd() - 1), r = 0.72 * Math.cbrt(rnd())
    const x = r * Math.sin(ph) * Math.cos(th), y = 1.25 + r * 0.75 * Math.cos(ph), z = r * Math.sin(ph) * Math.sin(th)
    add([x, y, z], [rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI],
      [0.07 + rnd() * 0.13, 0.06 + rnd() * 0.1, 0.07 + rnd() * 0.13],
      [0.12 + rnd() * 0.12, 0.5 + rnd() * 0.3, 0.16 + rnd() * 0.1], 0.55 + rnd() * 0.35)
  }
  // rocher orange
  for (let i = 0; i < 12; i++) {
    add([1.15 + (rnd() - 0.5) * 0.4, 0.1 + rnd() * 0.22, 0.55 + (rnd() - 0.5) * 0.4],
      [rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI],
      [0.09 + rnd() * 0.09, 0.07 + rnd() * 0.07, 0.09 + rnd() * 0.09],
      [0.94, 0.35 + rnd() * 0.12, 0.13], 0.85)
  }
  // mare cyan (plate, semi-transparente)
  for (let i = 0; i < 10; i++) {
    add([-1.05 + (rnd() - 0.5) * 0.7, 0.015, -0.65 + (rnd() - 0.5) * 0.7],
      [0, rnd() * Math.PI, 0], [0.2 + rnd() * 0.12, 0.012, 0.2 + rnd() * 0.12],
      [0.0, 0.74, 0.95], 0.45)
  }
  return splats
}

const VERT = /* glsl */ `
attribute vec3 iCenter;
attribute vec3 iCovA;   // xx, xy, xz
attribute vec3 iCovB;   // yy, yz, zz
attribute vec3 iColor;
attribute float iOpacity;
attribute float iRank;
uniform vec2 uViewport;
uniform float uFocal;
uniform float uScale2;
varying vec2 vPos;
varying vec3 vColor;
varying float vOpacity;
varying float vRank;
void main() {
  vec4 cam = modelViewMatrix * vec4(iCenter, 1.0);
  if (cam.z > -0.2) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); vPos = vec2(9.0); vColor = vec3(0.0); vOpacity = 0.0; vRank = 0.0; return; }
  vec4 clip = projectionMatrix * cam;
  vec2 ndcCenter = clip.xy / clip.w;
  // Σ 3D (symétrique, remplie depuis les 6 coefficients) × échelle²
  mat3 Vrk = mat3(
    iCovA.x, iCovA.y, iCovA.z,
    iCovA.y, iCovB.x, iCovB.y,
    iCovA.z, iCovB.y, iCovB.z
  ) * uScale2;
  // J : jacobien de la projection perspective (transposé, en colonnes GLSL)
  float iz = 1.0 / cam.z;
  mat3 J = mat3(
    uFocal * iz, 0.0, -(uFocal * cam.x) * iz * iz,
    0.0, uFocal * iz, -(uFocal * cam.y) * iz * iz,
    0.0, 0.0, 0.0
  );
  mat3 T = transpose(mat3(modelViewMatrix)) * J;   // = (J·W)ᵀ
  mat3 cov2d = transpose(T) * Vrk * T;             // = J W Σ Wᵀ Jᵀ
  // décomposition propre 2×2 (+0.3 px : filtre anti-aliasing EWA)
  float a = cov2d[0][0] + 0.3, d = cov2d[1][1] + 0.3, b = cov2d[0][1];
  float mid = 0.5 * (a + d);
  float rad = length(vec2(0.5 * (a - d), b));
  float l1 = mid + rad, l2 = max(mid - rad, 0.05);
  vec2 dirRaw = vec2(b, l1 - a);
  vec2 dir = (dot(dirRaw, dirRaw) < 1e-10) ? vec2(1.0, 0.0) : normalize(dirRaw);
  vec2 major = min(sqrt(2.0 * l1), 512.0) * dir;
  vec2 minor = min(sqrt(2.0 * l2), 512.0) * vec2(dir.y, -dir.x);
  vPos = position.xy;
  vColor = iColor; vOpacity = iOpacity; vRank = iRank;
  gl_Position = vec4(ndcCenter + (position.x * major + position.y * minor) / uViewport * 2.0, 0.0, 1.0);
}
`
const FRAG = /* glsl */ `
precision highp float;
varying vec2 vPos;
varying vec3 vColor;
varying float vOpacity;
varying float vRank;
uniform float uOrder;
void main() {
  float A = -dot(vPos, vPos);
  if (A < -4.0) discard;
  float alpha = exp(A) * vOpacity;   // exacte gaussienne 2D projetée
  vec3 rankColor = mix(vec3(0.0, 0.74, 0.95), vec3(0.81, 0.11, 0.14), vRank);
  gl_FragColor = vec4(mix(vColor, rankColor, uOrder), alpha);
}
`

onMounted(() => {
  if (!container.value) return
  const el = container.value
  const splats = buildScene()
  const N = splats.length
  nSplats.value = N

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setClearColor(0xf8fafc, 1)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  el.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 100)
  camera.position.set(3.1, 1.7, 3.1)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0.65, 0)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 1.2
  controls.maxDistance = 10
  controls.minDistance = 1.2

  // quad de base (coins à ±2 : coupure de la gaussienne à exp(−4))
  geometry = new THREE.InstancedBufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-2, -2, 0, 2, -2, 0, 2, 2, 0, -2, 2, 0]), 3))
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.instanceCount = N

  // tableaux maîtres (ordre de création) + tampons triés (ordre de dessin)
  const mCenter = new Float32Array(N * 3), mCovA = new Float32Array(N * 3), mCovB = new Float32Array(N * 3)
  const mColor = new Float32Array(N * 3), mOpacity = new Float32Array(N)
  splats.forEach((s, i) => {
    mCenter.set(s.c, i * 3)
    mCovA.set([s.cov[0], s.cov[1], s.cov[2]], i * 3)
    mCovB.set([s.cov[3], s.cov[4], s.cov[5]], i * 3)
    mColor.set(s.color, i * 3)
    mOpacity[i] = s.o
  })
  const aCenter = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3)
  const aCovA = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3)
  const aCovB = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3)
  const aColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3)
  const aOpacity = new THREE.InstancedBufferAttribute(new Float32Array(N), 1)
  const aRank = new THREE.InstancedBufferAttribute(new Float32Array(N), 1)
  geometry.setAttribute('iCenter', aCenter)
  geometry.setAttribute('iCovA', aCovA)
  geometry.setAttribute('iCovB', aCovB)
  geometry.setAttribute('iColor', aColor)
  geometry.setAttribute('iOpacity', aOpacity)
  geometry.setAttribute('iRank', aRank)

  material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uViewport: { value: new THREE.Vector2(800, 300) },
      uFocal: { value: 400 },
      uScale2: { value: 1 },
      uOrder: { value: 0 },
    },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  scene.add(mesh)

  const order = new Array(N).fill(0).map((_, i) => i)
  const depths = new Float32Array(N)
  function sortAndUpload() {
    const e = camera.matrixWorldInverse.elements
    for (let i = 0; i < N; i++) {
      depths[i] = e[2] * mCenter[i * 3] + e[6] * mCenter[i * 3 + 1] + e[10] * mCenter[i * 3 + 2] + e[14]
    }
    order.sort((p, q) => depths[p] - depths[q]) // z le plus négatif (loin) d'abord
    for (let k = 0; k < N; k++) {
      const i = order[k]
      aCenter.array.set(mCenter.subarray(i * 3, i * 3 + 3), k * 3)
      aCovA.array.set(mCovA.subarray(i * 3, i * 3 + 3), k * 3)
      aCovB.array.set(mCovB.subarray(i * 3, i * 3 + 3), k * 3)
      aColor.array.set(mColor.subarray(i * 3, i * 3 + 3), k * 3)
      ;(aOpacity.array as Float32Array)[k] = mOpacity[i]
      ;(aRank.array as Float32Array)[k] = N > 1 ? k / (N - 1) : 0
    }
    aCenter.needsUpdate = aCovA.needsUpdate = aCovB.needsUpdate = true
    aColor.needsUpdate = aOpacity.needsUpdate = aRank.needsUpdate = true
  }

  function resize() {
    const w = el.clientWidth || 800
    const h = 300
    renderer!.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    const db = new THREE.Vector2()
    renderer!.getDrawingBufferSize(db)
    material!.uniforms.uViewport.value.copy(db)
    material!.uniforms.uFocal.value = db.y / (2 * Math.tan((camera.fov * Math.PI) / 360))
  }
  resizeObs = new ResizeObserver(resize)
  resizeObs.observe(el)
  resize()

  function animate() {
    raf = requestAnimationFrame(animate)
    controls!.autoRotate = rotating.value
    controls!.update()
    camera.updateMatrixWorld()
    material!.uniforms.uScale2.value = scaleMul.value * scaleMul.value
    material!.uniforms.uOrder.value = showOrder.value ? 1 : 0
    sortAndUpload() // tri par profondeur à chaque image — le cœur du splatting
    renderer!.render(scene, camera)
  }
  animate()
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  resizeObs?.disconnect()
  controls?.dispose()
  geometry?.dispose()
  material?.dispose()
  if (renderer) { renderer.dispose(); renderer.domElement.remove() }
})
</script>

<template>
  <div class="gs-wrap">
    <div ref="container" class="gs-canvas"></div>
    <div class="gs-controls">
      <button class="gs-btn-main" @click="rotating = !rotating">{{ rotating ? '⏸ Orbite' : '▶ Orbite' }}</button>
      <button class="gs-btn" :class="{ active: showOrder }" @click="showOrder = !showOrder">Ordre de tri (loin=cyan → proche=rouge)</button>
      <label class="gs-sl">Taille des gaussiennes ×<strong>{{ scaleMul.toFixed(1) }}</strong>
        <input type="range" v-model.number="scaleMul" min="0.3" max="2" step="0.1" /></label>
      <span class="gs-hint">{{ nSplats }} gaussiennes · Σ′=JWΣWᵀJᵀ dans le shader · tri en profondeur à chaque image · glissez pour orbiter</span>
    </div>
  </div>
</template>

<style scoped>
.gs-wrap { display: flex; flex-direction: column; gap: 5px; width: 100%; }
.gs-canvas { width: 100%; height: 300px; border: 1px solid #CBD5E1; border-radius: 5px; overflow: hidden; background: #f8fafc; }
.gs-canvas :deep(canvas) { display: block; }
.gs-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.gs-btn-main { padding: 3px 12px; border-radius: 5px; font-size: 0.72rem; border: 1.5px solid #CF1C24; background: #fef2f2; color: #CF1C24; font-weight: 700; cursor: pointer; }
.gs-btn-main:hover { background: #CF1C24; color: white; }
.gs-btn { padding: 3px 10px; border-radius: 5px; font-size: 0.7rem; border: 1.5px solid #CBD5E1; background: #f8fafc; color: #64748b; font-weight: 600; cursor: pointer; }
.gs-btn.active { background: #f0fdf4; border-color: #25B34B; color: #15803d; }
.gs-sl { display: flex; align-items: center; gap: 5px; font-family: monospace; font-size: 0.72rem; color: #334155; }
.gs-sl strong { color: #CF1C24; min-width: 26px; display: inline-block; }
.gs-sl input[type=range] { width: 110px; height: 4px; accent-color: #CF1C24; cursor: pointer; }
.gs-hint { font-size: 0.62rem; color: #64748b; font-style: italic; }
</style>
