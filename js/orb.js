import * as THREE from "three";

/*
 * AROUN / Liquid Pearl
 * A procedural, texture-free Three.js object so the visual works before any
 * local photos or textures are added. Pointer movement affects both geometry
 * and reflected light; reduced-motion users receive the same still object.
 */

export function initOrb({ onReady = () => {}, onFallback = () => {} } = {}) {
  const host = document.querySelector("#orbCanvas");
  const frame = document.querySelector("#orbFrame");
  const fallback = document.querySelector("#orbFallback");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = window.matchMedia("(pointer: coarse)");

  if (!host || !frame) {
    onFallback();
    onReady();
    return { destroy() {} };
  }

  let renderer;
  let scene;
  let camera;
  let pearl;
  let haloRing;
  let particleField;
  let raf = 0;
  let resizeObserver;
  let destroyed = false;
  let lastTime = 0;
  let readyCalled = false;

  const pointerTarget = new THREE.Vector2(0, 0);
  const pointerSmooth = new THREE.Vector2(0, 0);
  const clock = new THREE.Clock();

  function ready() {
    if (readyCalled) return;
    readyCalled = true;
    frame.classList.add("has-webgl");
    if (fallback) fallback.hidden = true;
    onReady();
  }

  function useFallback(error) {
    if (error) console.warn("AROUN liquid pearl fallback:", error);
    frame.classList.remove("has-webgl");
    if (fallback) fallback.hidden = false;
    onFallback();
    onReady();
  }

  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !coarsePointer.matches,
      powerPreference: "high-performance"
    });
  } catch (error) {
    useFallback(error);
    return { destroy() {} };
  }

  const width = Math.max(1, host.clientWidth);
  const height = Math.max(1, host.clientHeight);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer.matches ? 1 : 1.6));
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(37, width / height, 0.1, 30);
  camera.position.set(0, 0, 4.4);

  scene.add(new THREE.AmbientLight(0xffeee0, 1.25));

  const keyLight = new THREE.PointLight(0xfff4df, 34, 12, 2);
  keyLight.position.set(-2.4, 2.5, 3.2);
  scene.add(keyLight);

  const roseLight = new THREE.PointLight(0xe9a99f, 24, 11, 2);
  roseLight.position.set(2.6, -1.4, 1.6);
  scene.add(roseLight);

  const warmRim = new THREE.PointLight(0xc9a97c, 28, 10, 2);
  warmRim.position.set(-2.0, -2.4, -1.6);
  scene.add(warmRim);

  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(0, 0) },
    uReducedMotion: { value: reduceMotion.matches ? 1 : 0 }
  };

  const vertexShader = `
    uniform float uTime;
    uniform vec2 uPointer;
    uniform float uReducedMotion;
    varying vec3 vNormalView;
    varying vec3 vPositionView;
    varying vec3 vNormalObject;
    varying float vWave;

    void main() {
      vec3 p = position;
      float t = uTime;
      float motion = 1.0 - uReducedMotion;

      float waveA = sin(p.y * 3.15 + t * 0.58) * cos(p.x * 2.65 - t * 0.38);
      float waveB = sin(p.z * 4.2 - t * 0.42 + p.x * 1.5);
      float mouseWave = exp(-distance(normalize(p.xy), uPointer * 0.72) * 3.7);
      float distortion = (waveA * 0.024 + waveB * 0.012 + mouseWave * (uPointer.x * 0.016 + uPointer.y * 0.012)) * motion;

      p += normal * distortion;
      vWave = waveA * 0.5 + waveB * 0.5;
      vNormalObject = normalize(normal);

      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      vPositionView = -mvPosition.xyz;
      vNormalView = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec2 uPointer;
    uniform float uReducedMotion;
    varying vec3 vNormalView;
    varying vec3 vPositionView;
    varying vec3 vNormalObject;
    varying float vWave;

    void main() {
      vec3 n = normalize(vNormalView);
      vec3 viewDir = normalize(vPositionView);
      float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.15);
      float lightSweep = sin(vNormalObject.y * 3.2 + vNormalObject.x * 2.0 + uTime * 0.22) * 0.5 + 0.5;
      float pearlLayer = smoothstep(-0.65, 0.8, vWave + lightSweep * 0.34);

      vec3 ivory = vec3(1.0, 0.965, 0.89);
      vec3 champagne = vec3(0.77, 0.62, 0.43);
      vec3 rose = vec3(0.78, 0.48, 0.43);
      vec3 warmShadow = vec3(0.32, 0.22, 0.17);

      vec3 base = mix(champagne, ivory, 0.25 + pearlLayer * 0.58);
      base = mix(base, rose, smoothstep(0.25, 0.95, vNormalObject.x * 0.5 + vNormalObject.y * 0.35) * 0.43);
      base = mix(warmShadow, base, 0.42 + max(dot(n, normalize(vec3(-0.4, 0.8, 1.0))), 0.0) * 0.62);

      vec3 halfVector = normalize(normalize(vec3(-0.48, 0.8, 1.8)) + viewDir);
      float specA = pow(max(dot(n, halfVector), 0.0), 74.0);
      float specB = pow(max(dot(n, normalize(vec3(0.9, -0.4, 1.4))), 0.0), 30.0);
      float thinRim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.2);
      float movingGlint = pow(max(0.0, 1.0 - distance(vNormalObject.xy, uPointer * 0.28 + vec2(-0.35, 0.25))), 12.0) * (1.0 - uReducedMotion);

      vec3 color = base + vec3(1.0, 0.91, 0.73) * specA * 0.95;
      color += vec3(1.0, 0.74, 0.64) * specB * 0.37;
      color += mix(vec3(0.77, 0.57, 0.39), vec3(1.0, 0.84, 0.65), fresnel) * thinRim * 0.74;
      color += vec3(1.0, 0.92, 0.77) * movingGlint * 0.32;

      gl_FragColor = vec4(color, 0.985);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  const pearlMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.FrontSide
  });

  pearl = new THREE.Mesh(
    new THREE.SphereGeometry(1, coarsePointer.matches ? 72 : 112, coarsePointer.matches ? 56 : 88),
    pearlMaterial
  );
  pearl.rotation.set(-0.12, 0.25, 0.08);
  scene.add(pearl);

  // Two fine, orbital ellipses lend a jewellery-like reference without clutter.
  const ringMaterialA = new THREE.MeshBasicMaterial({
    color: 0xc9a97c,
    transparent: true,
    opacity: 0.48,
    depthWrite: false
  });
  const ringMaterialB = new THREE.MeshBasicMaterial({
    color: 0xd9a79a,
    transparent: true,
    opacity: 0.32,
    depthWrite: false
  });

  const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.0025, 5, 180), ringMaterialA);
  ringA.rotation.set(1.08, 0.36, -0.34);
  ringA.scale.set(1.02, 0.86, 1);
  scene.add(ringA);

  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.0017, 5, 180), ringMaterialB);
  ringB.rotation.set(0.54, -0.46, 0.72);
  ringB.scale.set(1.0, 0.76, 1);
  scene.add(ringB);
  haloRing = ringA;

  // Fine floating points around the pearl, deliberately reduced on mobile.
  const particleCount = coarsePointer.matches ? 30 : 70;
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i += 1) {
    const radius = 1.2 + Math.random() * 0.62;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    sizes[i] = 0.009 + Math.random() * 0.014;
  }

  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const pointMaterial = new THREE.PointsMaterial({
    color: 0xc9a97c,
    size: coarsePointer.matches ? 0.015 : 0.012,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
    sizeAttenuation: true
  });

  particleField = new THREE.Points(pointGeometry, pointMaterial);
  scene.add(particleField);

  const onPointerMove = (event) => {
    const rect = host.getBoundingClientRect();
    pointerTarget.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    pointerTarget.y = -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
  };

  const onPointerLeave = () => pointerTarget.set(0, 0);

  host.addEventListener("pointermove", onPointerMove, { passive: true });
  host.addEventListener("pointerleave", onPointerLeave, { passive: true });

  function resize() {
    if (destroyed || !renderer || !camera) return;
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer.matches ? 1 : 1.6));
    renderer.setSize(w, h, false);
  }

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  function animate(now = 0) {
    if (destroyed) return;
    raf = requestAnimationFrame(animate);

    const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    const time = clock.getElapsedTime();
    const movement = reduceMotion.matches ? 0 : 1;

    pointerSmooth.x += (pointerTarget.x - pointerSmooth.x) * 0.055;
    pointerSmooth.y += (pointerTarget.y - pointerSmooth.y) * 0.055;

    uniforms.uTime.value = time;
    uniforms.uPointer.value.copy(pointerSmooth);
    uniforms.uReducedMotion.value = reduceMotion.matches ? 1 : 0;

    if (pearl) {
      pearl.rotation.y += delta * 0.12 * movement + pointerSmooth.x * 0.0009;
      pearl.rotation.x += ((-0.12 + pointerSmooth.y * 0.11) - pearl.rotation.x) * 0.025;
      pearl.scale.setScalar(1 + Math.sin(time * 0.55) * 0.012 * movement);
    }

    if (haloRing && movement) haloRing.rotation.z += delta * 0.025;
    if (particleField && movement) particleField.rotation.y -= delta * 0.018;

    renderer.render(scene, camera);

    if (!readyCalled) ready();
  }

  try {
    animate();
  } catch (error) {
    useFallback(error);
  }

  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);

      scene?.traverse((object) => {
        object.geometry?.dispose?.();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose?.());
        }
      });

      renderer?.dispose();
      renderer?.domElement?.remove();
    }
  };
}
