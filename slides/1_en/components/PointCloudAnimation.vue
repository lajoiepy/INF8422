<template>
  <div ref="container" class="pcl-wrap">
    <canvas ref="canvas" class="pcl-canvas" />
    <div class="pcl-overlay">
      <div class="pcl-legend">
        <span><span class="pcl-dot" style="background:#f03b20" /> Sol</span>
        <span><span class="pcl-dot" style="background:#41ab5d" /> Aérien</span>
      </div>
      <div class="pcl-controls">
        <button class="pcl-btn" @click.stop="toggleGround">Sol</button>
        <button class="pcl-btn" @click.stop="toggleAerial">Aérien</button>
        <span class="pcl-sep">|</span>
        <button class="pcl-btn" @click.stop="toggleRotate">↻ Rotation</button>
        <button class="pcl-btn" @click.stop="resetCamera">Reset</button>
        <span class="pcl-sep">|</span>
        <span class="pcl-label">pts</span>
        <button class="pcl-btn" @click.stop="changeSize(-0.05)">−</button>
        <button class="pcl-btn" @click.stop="changeSize(+0.05)">+</button>
      </div>
      <p class="pcl-hint">Glisser pour tourner · Molette pour zoomer · Oxford RobotCar (ICP)</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const container = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()

let groundPoints: any = null
let aerialPoints: any = null
let autoRotate = true
let animId = 0
let theta = 0.4, phi = 1.1, radius = 65
let camera: any = null
let renderer: any = null
let scene: any = null
const targetVec = { x: 0, y: 4, z: 0 }

// Cleanup refs for event listeners
let onMouseUp: (() => void) | null = null
let onResize: (() => void) | null = null
let resizeObs: ResizeObserver | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })
}

function updateCamera() {
  if (!camera) return
  camera.position.set(
    targetVec.x + radius * Math.sin(phi) * Math.cos(theta),
    targetVec.y + radius * Math.cos(phi),
    targetVec.z + radius * Math.sin(phi) * Math.sin(theta)
  )
  camera.lookAt(targetVec.x, targetVec.y, targetVec.z)
}

function resizeRenderer() {
  if (!renderer || !container.value || !camera) return
  const W = container.value.clientWidth
  const H = container.value.clientHeight
  if (W === 0 || H === 0) return
  // false = don't override CSS; let the class styles (inset:0 / 100%×100%) handle layout
  renderer.setSize(W, H, false)
  camera.aspect = W / H
  camera.updateProjectionMatrix()
}

async function init() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
  await loadScript('/clouds.js')

  const THREE = (window as any).THREE
  const GROUND_CLOUD = (window as any).GROUND_CLOUD
  const AERIAL_CLOUD = (window as any).AERIAL_CLOUD
  if (!THREE || !GROUND_CLOUD || !canvas.value || !container.value) return

  const W = container.value.clientWidth || 860
  const H = container.value.clientHeight || 340

  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true })
  // Match the screen's native DPI — going higher (e.g. *2.5) creates a GL buffer of
  // ~3900px on Retina, which forces the browser's GPU compositor to allocate a tile
  // at that resolution for the entire slide layer, degrading everything else.
  renderer.setPixelRatio(window.devicePixelRatio)
  // false = don't update canvas CSS width/height; class styles (inset:0 + 100%×100%)
  // handle layout, so we never set absolute px values that would fight Slidev's
  // transform:scale() coordinate system.
  renderer.setSize(W, H, false)
  renderer.setClearColor(0x0d1117, 1)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000)
  updateCamera()

  function makePoints(cloud: any, size: number) {
    const n = cloud.x.length
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      pos[i*3] = cloud.x[i]; pos[i*3+1] = cloud.y[i]; pos[i*3+2] = cloud.z[i]
      col[i*3] = cloud.r[i]; col[i*3+1] = cloud.g[i]; col[i*3+2] = cloud.b[i]
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return new THREE.Points(geo, new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true }))
  }

  groundPoints = makePoints(GROUND_CLOUD, 0.35)
  aerialPoints = makePoints(AERIAL_CLOUD, 0.35)
  scene.add(groundPoints)
  scene.add(aerialPoints)

  // Orbit via mouse on canvas only
  let dragging = false, lastX = 0, lastY = 0
  canvas.value.addEventListener('mousedown', (e) => {
    if (e.target !== canvas.value) return
    dragging = true; lastX = e.clientX; lastY = e.clientY; autoRotate = false
    canvas.value!.style.cursor = 'grabbing'
  })
  onMouseUp = () => { dragging = false; if (canvas.value) canvas.value.style.cursor = 'grab' }
  window.addEventListener('mouseup', onMouseUp)
  canvas.value.addEventListener('mousemove', (e) => {
    if (!dragging) return
    theta -= (e.clientX - lastX) * 0.009
    phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi + (e.clientY - lastY) * 0.009))
    lastX = e.clientX; lastY = e.clientY
    updateCamera()
  })
  canvas.value.addEventListener('wheel', (e) => {
    radius = Math.max(20, Math.min(160, radius + e.deltaY * 0.06))
    updateCamera(); e.preventDefault()
  }, { passive: false })

  // Touch
  let lastTX = 0, lastTY = 0
  canvas.value.addEventListener('touchstart', (e) => {
    lastTX = e.touches[0].clientX; lastTY = e.touches[0].clientY; autoRotate = false
  }, { passive: true })
  canvas.value.addEventListener('touchmove', (e) => {
    theta -= (e.touches[0].clientX - lastTX) * 0.012
    phi = Math.max(0.15, Math.min(Math.PI-0.15, phi + (e.touches[0].clientY - lastTY) * 0.012))
    lastTX = e.touches[0].clientX; lastTY = e.touches[0].clientY
    updateCamera()
  }, { passive: true })

  // ResizeObserver for correct sizing
  resizeObs = new ResizeObserver(() => resizeRenderer())
  resizeObs.observe(container.value)
  // Also on window resize
  onResize = () => resizeRenderer()
  window.addEventListener('resize', onResize)

  // Animation loop
  let prev = 0
  function animate(now: number) {
    animId = requestAnimationFrame(animate)
    const dt = (now - prev) / 1000; prev = now
    if (autoRotate) { theta += 0.25 * dt; updateCamera() }
    renderer.render(scene, camera)
  }
  requestAnimationFrame(animate)
}

function toggleGround() { if (groundPoints) groundPoints.visible = !groundPoints.visible }
function toggleAerial() { if (aerialPoints) aerialPoints.visible = !aerialPoints.visible }
function toggleRotate() { autoRotate = !autoRotate }
function resetCamera() { theta = 0.4; phi = 1.1; radius = 65; autoRotate = true; updateCamera() }
function changeSize(delta: number) {
  if (!groundPoints || !aerialPoints) return
  const s = Math.max(0.05, Math.min(2.0, groundPoints.material.size + delta))
  groundPoints.material.size = s; aerialPoints.material.size = s
  groundPoints.material.needsUpdate = true; aerialPoints.material.needsUpdate = true
}

onMounted(() => init())
onUnmounted(() => {
  cancelAnimationFrame(animId)
  if (onMouseUp) window.removeEventListener('mouseup', onMouseUp)
  if (onResize) window.removeEventListener('resize', onResize)
  resizeObs?.disconnect()
  renderer?.dispose()
})
</script>

<style scoped>
.pcl-wrap {
  position: relative;
  width: 100%;
  height: 340px;
  background: #0d1117;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
}
.pcl-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
}
/* Overlay sits above the canvas via z-index */
.pcl-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}
.pcl-legend {
  position: absolute;
  top: 6px;
  right: 8px;
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 0.65em;
  color: #ddd;
}
.pcl-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  margin-right: 3px;
  vertical-align: middle;
}
.pcl-controls {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
  align-items: center;
  pointer-events: auto;
}
.pcl-btn {
  background: rgba(0,0,0,0.65);
  border: 1px solid rgba(255,255,255,0.3);
  color: #ccc;
  border-radius: 3px;
  padding: 3px 9px;
  cursor: pointer;
  font-size: 0.62em;
  white-space: nowrap;
  line-height: 1.5;
  pointer-events: auto;
}
.pcl-btn:hover { background: rgba(255,255,255,0.18); color: #fff; }
.pcl-btn:active { background: rgba(255,255,255,0.3); }
.pcl-sep { color: rgba(255,255,255,0.2); font-size: 0.7em; padding: 0 2px; }
.pcl-label { color: #888; font-size: 0.6em; }
.pcl-hint {
  position: absolute;
  bottom: 5px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.52em;
  color: #555;
  white-space: nowrap;
}
</style>
