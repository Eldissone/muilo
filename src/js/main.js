import * as THREE from 'three'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

gsap.registerPlugin(ScrollTrigger)

// Custom cursor
const cursor = document.querySelector('.cursor')
document.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px'
  cursor.style.top = e.clientY + 'px'
})

// Add hover effect to interactive elements
const interactiveElements = document.querySelectorAll('button, a, .feature-card, .nav-link')
interactiveElements.forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'))
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'))
})

// Stats counter animation
const stats = document.querySelectorAll('.stat-number')
stats.forEach(stat => {
  const target = parseInt(stat.getAttribute('data-target'))
  const increment = target / 100
  let current = 0

  const updateCounter = () => {
    if (current < target) {
      current += increment
      stat.textContent = Math.floor(current)
      setTimeout(updateCounter, 20)
    } else {
      stat.textContent = target
    }
  }

  // Start counter when in view
  ScrollTrigger.create({
    trigger: stat.parentElement,
    start: 'top 80%',
    onEnter: updateCounter
  })
})

// Metric bars animation
const metricBars = document.querySelectorAll('.metric-bar')
metricBars.forEach(bar => {
  const percent = bar.getAttribute('data-percent')

  ScrollTrigger.create({
    trigger: bar,
    start: 'top 80%',
    onEnter: () => {
      gsap.to(bar, {
        width: `${percent}%`,
        duration: 2,
        ease: 'power3.out'
      })
    }
  })
})

// Canvas Setup
const canvas = document.querySelector('#webgl')
const scene = new THREE.Scene()
scene.background = new THREE.Color('#0b0f19')

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

// Camera
const camera = new THREE.PerspectiveCamera(
  70,
  sizes.width / sizes.height,
  0.1,
  100
)
camera.position.z = 4
scene.add(camera)

// Create multiple geometric objects
const geometries = [
  new THREE.IcosahedronGeometry(0.8, 1),
  new THREE.OctahedronGeometry(0.7, 0),
  new THREE.TetrahedronGeometry(0.9, 0),
  new THREE.DodecahedronGeometry(0.6, 0)
]

const material = new THREE.MeshPhysicalMaterial({
  color: '#4f8cff',
  metalness: 0.8,
  roughness: 0.2,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  transmission: 0.2,
  opacity: 0.9
})

// Create multiple objects
const objects = geometries.map((geometry, i) => {
  const object = new THREE.Mesh(geometry, material)
  object.position.x = (i - 1.5) * 2.5
  object.originalX = object.position.x
  scene.add(object)
  return object
})

// Add wireframe to objects
const wireframeMaterial = new THREE.MeshBasicMaterial({
  color: '#8b5cf6',
  wireframe: true,
  transparent: true,
  opacity: 0.3
})

objects.forEach(object => {
  const wireframe = new THREE.Mesh(object.geometry, wireframeMaterial)
  wireframe.scale.set(1.05, 1.05, 1.05)
  object.add(wireframe)
})

// Particle system
const particleCount = 5000
const particles = new THREE.BufferGeometry()
const positions = new Float32Array(particleCount * 3)
const colors = new Float32Array(particleCount * 3)

for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 100
  positions[i * 3 + 1] = (Math.random() - 0.5) * 100
  positions[i * 3 + 2] = (Math.random() - 0.5) * 100

  colors[i * 3] = 0.3 + Math.random() * 0.2
  colors[i * 3 + 1] = 0.6 + Math.random() * 0.4
  colors[i * 3 + 2] = 1.0
}

particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))
particles.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const particleMaterial = new THREE.PointsMaterial({
  size: 0.05,
  vertexColors: true,
  transparent: true,
  opacity: 0.6
})

const particleSystem = new THREE.Points(particles, particleMaterial)
scene.add(particleSystem)

// Enhanced lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.5))

const keyLight = new THREE.DirectionalLight(0xffffff, 1.5)
keyLight.position.set(5, 5, 5)
scene.add(keyLight)

const fillLight = new THREE.DirectionalLight(0x4f8cff, 0.5)
fillLight.position.set(-5, -3, -2)
scene.add(fillLight)

// Add point lights for glow effect
const pointLight1 = new THREE.PointLight(0x4f8cff, 2, 10)
pointLight1.position.set(2, 2, 2)
scene.add(pointLight1)

const pointLight2 = new THREE.PointLight(0x8b5cf6, 1.5, 10)
pointLight2.position.set(-2, -1, 3)
scene.add(pointLight2)

// Renderer with post-processing
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1

// Post-processing
const composer = new EffectComposer(renderer)
const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(sizes.width, sizes.height),
  1.5,  // strength
  0.4,  // radius
  0.9   // threshold
)
composer.addPass(bloomPass)

// Complex scroll animations
objects.forEach((object, i) => {
  // Hero section animation
  gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  })
    .to(object.rotation, {
      x: Math.PI * 0.25,
      y: Math.PI * 0.5 * (i + 1),
      duration: 1
    }, 0)
    .to(camera.position, {
      z: 3 + i * 0.3,
      duration: 1
    }, 0)

  // Features section animation
  gsap.timeline({
    scrollTrigger: {
      trigger: '.feature-section',
      start: 'top center',
      end: 'bottom center',
      scrub: true
    }
  })
    .to(object.rotation, {
      x: Math.PI,
      y: Math.PI * 2 * (i + 1),
      duration: 2
    })
    .to(object.position, {
      x: object.originalX + Math.sin(i) * 2,
      y: Math.cos(i) * 1.5,
      duration: 2
    }, 0)

  // Performance section animation
  gsap.timeline({
    scrollTrigger: {
      trigger: '.performance-section',
      start: 'top center',
      end: 'bottom center',
      scrub: true
    }
  })
    .to(object.rotation, {
      z: Math.PI * 3,
      duration: 2
    })
    .to(object.scale, {
      x: 1.2,
      y: 1.2,
      z: 1.2,
      duration: 2
    }, 0)
})

// Particle animation
gsap.timeline({
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom bottom',
    scrub: true
  }
})
  .to(particleSystem.rotation, {
    x: Math.PI * 2,
    y: Math.PI * 2,
    duration: 10
  })

// Light animations
gsap.to(pointLight1.position, {
  x: 5,
  y: 5,
  z: 5,
  duration: 5,
  repeat: -1,
  yoyo: true,
  ease: 'sine.inOut'
})

gsap.to(pointLight2.position, {
  x: -5,
  y: -5,
  z: 5,
  duration: 4,
  repeat: -1,
  yoyo: true,
  ease: 'sine.inOut',
  delay: 1
})

// Mouse move interaction
document.addEventListener('mousemove', (e) => {
  const mouseX = (e.clientX / sizes.width) * 2 - 1
  const mouseY = -(e.clientY / sizes.height) * 2 + 1

  objects.forEach((object, i) => {
    gsap.to(object.rotation, {
      x: mouseY * 0.3,
      y: mouseX * 0.3,
      duration: 0.5
    })
  })

  gsap.to(camera.position, {
    x: mouseX * 0.5,
    y: mouseY * 0.5,
    duration: 1
  })
})

// Resize handler
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  renderer.setSize(sizes.width, sizes.height)
  composer.setSize(sizes.width, sizes.height)
})

// Auto-rotation when not scrolling
let lastScrollTime = Date.now()
let autoRotate = true

document.addEventListener('scroll', () => {
  lastScrollTime = Date.now()
  autoRotate = false

  setTimeout(() => {
    if (Date.now() - lastScrollTime > 1000) {
      autoRotate = true
    }
  }, 1000)
})

// Render loop
const clock = new THREE.Clock()

const tick = () => {
  const elapsedTime = clock.getElapsedTime()

  // Auto-rotation
  if (autoRotate) {
    objects.forEach((object, i) => {
      object.rotation.y = elapsedTime * 0.1 + i * 0.5
      object.rotation.x = Math.sin(elapsedTime * 0.05 + i) * 0.1
    })
  }

  // Animate particles
  particleSystem.rotation.y = elapsedTime * 0.02

  // Pulse effect on objects
  objects.forEach((object, i) => {
    const scale = 1 + Math.sin(elapsedTime * 0.5 + i) * 0.05
    object.scale.set(scale, scale, scale)
  })

  composer.render()
  requestAnimationFrame(tick)
}

// Start animations on load
window.addEventListener('load', () => {
  gsap.from('.hero-title', { opacity: 0, y: 50, duration: 1 })
  gsap.from('.hero-subtitle', { opacity: 0, y: 30, duration: 1, delay: 0.3 })
  gsap.from('.cta-container', { opacity: 0, y: 30, duration: 1, delay: 0.6 })

  tick()
})