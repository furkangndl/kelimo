<script setup lang="ts">
import * as THREE from 'three';
import { gsap } from 'gsap';

const FILLER = [
  'serendipity', 'ephemeral', 'wander', 'luminous', 'echo', 'horizon', 'velvet', 'drift', 'whisper', 'ember',
  'canopy', 'mosaic', 'tide', 'solace', 'orbit', 'lantern', 'petrichor', 'kindle', 'meadow', 'cascade',
  'nimbus', 'quill', 'zenith', 'harbor', 'mellow', 'prism', 'lull', 'saffron', 'thrive', 'wisp',
];
const TOTAL = 34;
const RADIUS = 7.5;
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const words = useState<string[]>('sceneWords', () => []);
const route = useRoute();
const host = ref<HTMLDivElement>();

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pointer = { x: 0, y: 0 };

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let group: THREE.Group;
let frame = 0;
let sprites: THREE.Sprite[] = [];

/** Saved words look highlighted with a marker; filler words are plain ink. */
const makeSprite = (text: string, hot: boolean): THREE.Sprite => {
  const family = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim() || 'serif';
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 160;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `84px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (hot) {
    const width = ctx.measureText(text).width;
    ctx.fillStyle = css('--marker');
    ctx.fillRect(320 - width / 2 - 10, 84, width + 20, 38);
  }
  ctx.fillStyle = css('--ink');
  ctx.fillText(text, 320, 80);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.scale.set(5, 1.25, 1);
  sprite.userData.base = hot ? 1 : 0.55;
  return sprite;
};

const clearSprites = () => {
  for (const sprite of sprites) {
    group.remove(sprite);
    sprite.material.map?.dispose();
    sprite.material.dispose();
  }
  sprites = [];
};

const build = () => {
  clearSprites();
  const own = [...new Set(words.value.map((word) => word.toLowerCase()))].slice(0, 40);
  const labels = [
    ...own.map((text) => ({ text, hot: true })),
    ...FILLER.filter((text) => !own.includes(text))
      .slice(0, Math.max(0, TOTAL - own.length))
      .map((text) => ({ text, hot: false })),
  ];
  const golden = Math.PI * (3 - Math.sqrt(5));
  labels.forEach(({ text, hot }, index) => {
    const y = 1 - (index / Math.max(1, labels.length - 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const sprite = makeSprite(text, hot);
    sprite.position.set(Math.cos(golden * index) * ring * RADIUS, y * RADIUS, Math.sin(golden * index) * ring * RADIUS);
    group.add(sprite);
    sprites.push(sprite);
    if (!reduced) {
      gsap.from(sprite.scale, { x: 0, y: 0, duration: 0.7, delay: index * 0.025, ease: 'back.out(2)' });
    }
  });
};

const place = (path: string) => (path === '/words' ? 11 : 15);

onMounted(() => {
  const element = host.value;
  if (!element) {
    return;
  }
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(element.clientWidth, element.clientHeight);
  element.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, element.clientWidth / element.clientHeight, 0.1, 100);
  camera.position.set(0, 0, place(route.path));

  group = new THREE.Group();
  scene.add(group);

  build();
  document.fonts?.ready.then(() => group && build());

  const world = new THREE.Vector3();
  const tick = () => {
    frame = requestAnimationFrame(tick);
    if (document.hidden) {
      return;
    }
    if (!reduced) {
      group.rotation.y += 0.0014;
      group.rotation.x += (pointer.y * 0.3 - group.rotation.x) * 0.04;
      camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.04;
      camera.lookAt(0, 0, 0);
    }
    for (const sprite of sprites) {
      sprite.getWorldPosition(world);
      const depth = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(world.z, -RADIUS, RADIUS, 0.1, 1), 0.1, 1);
      sprite.material.opacity = depth * sprite.userData.base;
    }
    renderer.render(scene, camera);
  };
  tick();

  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointer);
});

const onResize = () => {
  const element = host.value;
  if (!element || !renderer) {
    return;
  }
  camera.aspect = element.clientWidth / element.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(element.clientWidth, element.clientHeight);
};

const onPointer = (event: PointerEvent) => {
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
};

watch(
  () => words.value.join('|'),
  () => group && build(),
);

watch(
  () => route.path,
  (path) => camera && gsap.to(camera.position, { z: place(path), duration: 1.6, ease: 'power3.inOut' }),
);

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  window.removeEventListener('resize', onResize);
  window.removeEventListener('pointermove', onPointer);
  if (renderer) {
    clearSprites();
    renderer.dispose();
  }
});
</script>

<template>
  <div ref="host" class="scene" aria-hidden="true" />
</template>
