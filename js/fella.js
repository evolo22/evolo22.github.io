// A little 3D fella swimming in a caustic-lit pool (three.js r128).
// If utils/fella.glb exists (and the site is served over http), that model
// replaces the built-in one. See utils/README.md.
(function () {
  const host = document.getElementById("fella");
  if (!host) return;
  if (!window.THREE) { host.classList.add("no-3d"); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (e) {
    host.classList.add("no-3d");
    return;
  }
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06302f);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 7.2, 3.6);
  camera.lookAt(0, 0, 0.2);

  scene.add(new THREE.HemisphereLight(0xe8fbff, 0x0a3f3c, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 0.75);
  sun.position.set(2.5, 8, 5);
  scene.add(sun);

  // ---------------------------------------------------------------- water
  const waterMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uFella: { value: new THREE.Vector2() },
    },
    vertexShader: `
      varying vec3 vW;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime;
      uniform vec2 uFella;
      varying vec3 vW;

      // tileable caustic pattern; only well-behaved for p far from the origin,
      // so wrap into one tile and shift it out to around -250
      float caustic(vec2 p, float t) {
        p = mod(p, 6.28318) - 250.0;
        vec2 i = p;
        float c = 1.0;
        float inten = 0.005;
        for (int n = 0; n < 5; n++) {
          float tt = t * (1.0 - (3.5 / float(n + 1)));
          i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
          c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
        }
        c /= 5.0;
        c = 1.17 - pow(c, 1.4);
        return pow(abs(c), 8.0);
      }

      void main() {
        vec2 p = vW.xz;
        float d = distance(p, uFella);
        float ring = sin(d * 14.0 - uTime * 5.0) * exp(-d * 1.6);
        vec2 warp = normalize(p - uFella + 1e-4) * ring * 0.08;

        float c1 = caustic((p + warp) * 1.1, uTime * 0.35);
        float c2 = caustic((p + warp) * 0.6 + 2.0, uTime * 0.22 + 3.0);

        vec3 deep = vec3(0.02, 0.16, 0.17);
        vec3 mid  = vec3(0.07, 0.42, 0.40);
        vec3 hi   = vec3(0.75, 1.00, 0.92);

        float m = 0.5 + 0.5 * sin(p.x * 0.3 + uTime * 0.1) * cos(p.y * 0.25);
        vec3 col = mix(deep, mid, 0.55 + 0.25 * m);
        col += hi * (c1 * 0.55 + c2 * 0.25);
        col += vec3(0.6, 0.9, 0.85) * max(ring, 0.0) * 0.18;

        float v = smoothstep(5.0, 1.2, length(p - vec2(0.0, 0.3)));
        col *= mix(0.55, 1.0, v);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), waterMat);
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // ripple rings that spawn behind the fella
  const ringGeo = new THREE.RingGeometry(0.62, 0.7, 64);
  const rings = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0xcffff4, transparent: true, opacity: 0, depthWrite: false,
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.01;
    scene.add(m);
    rings.push({ m, age: 99 });
  }

  // ---------------------------------------------------------------- fella
  function makeFella() {
    const root = new THREE.Group();
    const white = new THREE.MeshStandardMaterial({ color: 0xf6f8ff, roughness: 0.55 });
    const black = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.15, metalness: 0.1 });
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pink = new THREE.MeshBasicMaterial({ color: 0xff9fb8, transparent: true, opacity: 0.7 });
    const sphere = (r) => new THREE.SphereGeometry(r, 32, 24);

    const headC = new THREE.Vector3(0, 0.62, 0.05);
    const headR = 0.58;
    // put something on the head surface, facing outward
    function onHead(mesh, dx, dy, lift = 0) {
      const z = Math.sqrt(headR * headR - dx * dx - dy * dy);
      const n = new THREE.Vector3(dx, dy, z).normalize();
      mesh.position.copy(headC).addScaledVector(n, headR + lift);
      mesh.lookAt(mesh.position.clone().add(n));
      root.add(mesh);
      return mesh;
    }

    const body = new THREE.Mesh(sphere(0.5), white);
    body.scale.set(1, 0.9, 0.95);
    root.add(body);

    const head = new THREE.Mesh(sphere(headR), white);
    head.position.copy(headC);
    root.add(head);

    const ears = [];
    for (const side of [-1, 1]) {
      const ear = new THREE.Group();
      ear.position.set(side * 0.27, 1.05, 0);
      ear.rotation.z = -side * 0.22;
      const outer = new THREE.Mesh(sphere(0.18), white);
      outer.scale.set(0.75, 2.1, 0.6);
      outer.position.y = 0.2;
      const inner = new THREE.Mesh(sphere(0.1), pink);
      inner.scale.set(0.6, 2.4, 0.3);
      inner.position.set(0, 0.2, 0.08);
      ear.add(outer, inner);
      root.add(ear);
      ears.push(ear);
    }

    const eyes = [];
    for (const side of [-1, 1]) {
      const eye = onHead(new THREE.Mesh(sphere(0.09), black), side * 0.22, 0.04, -0.02);
      eye.scale.set(1, 1.15, 0.5);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 8), shine);
      glint.position.set(0.03, 0.035, 0.08);
      eye.add(glint);
      eyes.push(eye);

      const blush = onHead(new THREE.Mesh(sphere(0.07), pink), side * 0.36, -0.1, -0.01);
      blush.scale.set(1, 0.6, 0.3);
    }

    // little "w" mouth
    for (const side of [-1, 1]) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.011, 8, 20, Math.PI), black);
      onHead(arc, side * 0.035, -0.11, 0);
      arc.rotateZ(Math.PI);
    }

    const arms = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.42, 0.12, 0.1);
      const paw = new THREE.Mesh(sphere(0.14), white);
      paw.scale.set(0.8, 0.6, 1.3);
      paw.position.set(side * 0.08, 0, 0.06);
      pivot.add(paw);
      root.add(pivot);
      arms.push(pivot);
    }

    const feet = [];
    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(sphere(0.15), white);
      foot.scale.set(1, 0.6, 1.3);
      foot.position.set(side * 0.22, -0.4, 0.2);
      root.add(foot);
      feet.push(foot);
    }

    const tail = new THREE.Mesh(sphere(0.13), white);
    tail.position.set(0, -0.05, -0.48);
    root.add(tail);

    return { root, arms, ears, eyes, feet };
  }

  const fella = new THREE.Group();     // position + heading
  const tilt = new THREE.Group();      // leans back so the face looks up at the camera
  tilt.rotation.x = -0.55;
  fella.add(tilt);
  let model = makeFella();
  tilt.add(model.root);
  scene.add(fella);

  let mixer = null;

  // optional custom model
  if (THREE.GLTFLoader && location.protocol !== "file:") {
    new THREE.GLTFLoader().load("utils/fella.glb", (gltf) => {
      const obj = gltf.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      obj.scale.setScalar(1.7 / Math.max(size.x, size.y, size.z));
      box.setFromObject(obj);
      obj.position.sub(box.getCenter(new THREE.Vector3()));
      obj.position.y += 0.3;            // float with ~1/3 underwater
      tilt.remove(model.root);
      tilt.add(obj);
      tilt.rotation.x = -0.25;
      model = { root: obj, arms: [], ears: [], eyes: [], feet: [] };
      if (gltf.animations && gltf.animations.length) {
        mixer = new THREE.AnimationMixer(obj);
        mixer.clipAction(gltf.animations[0]).play();
      }
    }, undefined, () => { /* no custom model, keep the built-in fella */ });
  }

  // ---------------------------------------------------------------- sizing
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(3, (window.devicePixelRatio || 1) * (window.stageScale || 1)));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("stagescale", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
  resize();

  // ---------------------------------------------------------------- animate
  const SPEED = 0.32;
  const pathAt = (t) => ({
    x: 1.35 * Math.sin(t * SPEED),
    z: 0.75 * Math.sin(t * SPEED * 2) + 0.25,
  });
  const angleDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

  let t = 0, last = performance.now(), yaw = 0, ringTimer = 0, nextBlink = 2.5;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    const p = pathAt(t), q = pathAt(t + 0.05);
    const heading = Math.atan2(q.x - p.x, q.z - p.z);
    // mostly face where we're going, but keep peeking at the camera
    const target = Math.max(-1.1, Math.min(1.1, heading + angleDiff(heading, 0) * 0.45));
    const turn = angleDiff(yaw, target);
    yaw += turn * Math.min(1, dt * 3);

    fella.position.set(p.x, 0.05 + Math.sin(t * 2.2) * 0.05, p.z);
    fella.rotation.y = yaw;
    fella.rotation.z = Math.sin(t * 1.7) * 0.08 - turn * 0.15;

    model.arms.forEach((a, i) => { a.rotation.x = Math.sin(t * 6 + i * Math.PI) * 0.8; });
    model.feet.forEach((f, i) => { f.rotation.x = Math.sin(t * 6 + i * Math.PI + 1) * 0.5; });
    model.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 2 + i) * 0.12; });

    nextBlink -= dt;
    const blinking = nextBlink < 0.12 && nextBlink > 0;
    model.eyes.forEach((e) => { e.scale.y = blinking ? 0.12 : 1.15; });
    if (nextBlink <= 0) nextBlink = 2.5 + Math.random() * 3;

    ringTimer += dt;
    if (ringTimer > 0.75) {
      ringTimer = 0;
      const r = rings.find((r) => r.age > 2.4) || rings[0];
      r.age = 0;
      r.m.position.x = p.x;
      r.m.position.z = p.z;
    }
    rings.forEach((r) => {
      r.age += dt;
      const k = Math.min(1, r.age / 2.4);
      r.m.scale.setScalar(1 + k * 2.2);
      r.m.material.opacity = (1 - k) * 0.35;
    });

    if (mixer) mixer.update(dt);
    waterMat.uniforms.uTime.value = t;
    waterMat.uniforms.uFella.value.set(p.x, p.z);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
