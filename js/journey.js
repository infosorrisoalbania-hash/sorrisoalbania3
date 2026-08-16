/* Sorriso Albania — "Come funziona" WebGL journey.
   =========================================================================
   A real Three.js flythrough (not CSS transforms or fading cards): the
   camera dollies through a corridor of 5 framed video "beats" while the
   section is pinned, with wheel/touch/keyboard input hijacked *only while
   this section is engaged* so one scroll gesture advances exactly one
   beat, animated — not a long continuous drag through empty space.

   THE 5 STORY BEATS (index 0-4, in order):
     0 — La richiesta   (the request: patient fills in the form)
     1 — La risposta    (the response: the team calls back with a plan)
     2 — Il viaggio      (the journey: heading to the airport)
     3 — La cura         (the care: inside the clinic in Albania)
     4 — Il risultato    (the result: the new smile, revealed)
   Each beat's asset (video) and copy (caption) live together with a
   "BEAT N" comment at their definition site below and in index.html's
   #journeyRail markup — change both in the same place to swap a beat.

   Stack: plain HTML/CSS/JS, no build step, no framework. Three.js is the
   only dependency, loaded from a CDN <script> tag in index.html.

   Progressive enhancement, same principle as the rest of the site: the
   flat card grid (#stepsGridFallback, already in the DOM) is what everyone
   gets by default — including everyone on prefers-reduced-motion, touch,
   a small/short viewport, or without a working WebGL context, which is
   this dental-tourism audience's realistic mid-range-mobile baseline.
   This script only swaps the fallback out after confirming all of the
   above pass. Any failure anywhere below leaves the fallback exactly as
   it was — nothing here is required for the section to work. */
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var isSmall = window.innerWidth < 900 || window.innerHeight < 620;
  if (reduceMotion || isTouch || isSmall || !window.THREE) return;

  var rail = document.getElementById("journeyRail");
  var canvas = document.getElementById("journeyCanvas");
  var fallback = document.getElementById("stepsGridFallback");
  if (!rail || !canvas || !fallback) return;

  var NUM_SCENES = 5;
  var videos = [0, 1, 2, 3, 4].map(function (i) { return document.getElementById("jv" + i); });
  if (videos.some(function (v) { return !v; })) return;

  var THREE = window.THREE;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) { return; }
  if (!renderer) return;

  // Capability confirmed past this point — commit to the WebGL scene.
  rail.hidden = false;
  rail.style.height = (NUM_SCENES * 100) + "vh";
  fallback.style.display = "none";
  videos.forEach(function (v) { v.play().catch(function () {}); });

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  // Fog does double duty as the "soft blur-crossfade into the next beat":
  // portals a couple of steps away visually desaturate and fade toward the
  // background color rather than popping in/out.
  scene.fog = new THREE.FogExp2(0xeaf5fc, 0.04);

  var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 6);

  // Bright, clean, warm lighting — trustworthy dental-tourism site, not a
  // moody game trailer. Palette: whites / soft blues (#eaf5fc, #1168c0),
  // warm skin tones carried by the video footage itself.
  scene.add(new THREE.AmbientLight(0xffffff, 0.9));
  var key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(4, 6, 8);
  scene.add(key);
  var fill = new THREE.DirectionalLight(0xeaf5fc, 0.5);
  fill.position.set(-5, 2, 4);
  scene.add(fill);

  // ---- soft atmospheric backdrop, a parallax layer behind every portal ----
  // A large, far, slow-moving plane with a soft radial gradient. Because
  // it sits much farther from the camera than the portals, the same camera
  // dolly moves it far less across the screen — real 3D parallax between
  // this background layer and the foreground portals, for free.
  function makeBackdropTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 512;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(256, 200, 40, 256, 256, 380);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.55, "#eaf5fc");
    g.addColorStop(1, "#d7e9f7");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    return new THREE.CanvasTexture(c);
  }
  var PORTAL_Z_SPACING = -14;
  var backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 46),
    new THREE.MeshBasicMaterial({ map: makeBackdropTexture(), depthWrite: false, fog: false })
  );
  backdrop.position.set(0, 2, PORTAL_Z_SPACING * (NUM_SCENES - 1) - 34);
  scene.add(backdrop);

  // ---- soft glow "light bloom" behind whichever portal is currently in
  // focus — the transition cue into/out of each beat ----
  function makeGlowTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 256;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,0.85)");
    g.addColorStop(0.4, "rgba(190,215,240,0.4)");
    g.addColorStop(1, "rgba(190,215,240,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    return new THREE.CanvasTexture(c);
  }
  var glowTexture = makeGlowTexture();

  // Soft, low-contrast contact shadow behind each panel — real elevation
  // cue instead of a drawn border, so the video reads as a photograph
  // resting in the scene rather than a framed postcard.
  function makeShadowTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 256;
    var ctx = c.getContext("2d");
    var g = ctx.createRadialGradient(128, 150, 10, 128, 150, 150);
    g.addColorStop(0, "rgba(4,16,31,0.38)");
    g.addColorStop(0.6, "rgba(4,16,31,0.16)");
    g.addColorStop(1, "rgba(4,16,31,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    return new THREE.CanvasTexture(c);
  }
  var shadowTexture = makeShadowTexture();

  // ---- video portals: real footage of each beat, borderless full-bleed
  // panels (no picture-frame mat) arranged in an alternating-side corridor,
  // grounded by a soft contact shadow rather than a drawn edge ----
  var portals = [];
  videos.forEach(function (vid, i) {
    var texture = new THREE.VideoTexture(vid);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    var group = new THREE.Group();
    var w = 4.4, h = 5.6;

    var glow = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshBasicMaterial({ map: glowTexture, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    glow.position.z = -0.6;
    group.add(glow);

    var shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w + 1.6, h + 1.6),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.55, depthWrite: false, fog: false })
    );
    shadow.position.set(0.22, -0.22, -0.05);
    group.add(shadow);

    var screen = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
    );
    group.add(screen);

    var side = i % 2 === 0 ? -1 : 1;
    group.position.set(side * 2.6, Math.sin(i * 1.3) * 0.6, i * PORTAL_Z_SPACING - 6);
    group.rotation.y = -side * 0.32;
    scene.add(group);
    // BEAT N portal — group.userData.glow is faded in/out by proximity to
    // the active scene in updateFromScroll() below.
    group.userData.glow = glow;
    portals.push(group);
  });

  // ---- one restrained brand accent, not a prop showcase ----
  function makeTooth() {
    var pts = [];
    for (var a = 0; a <= 10; a++) {
      var t = a / 10;
      pts.push(new THREE.Vector2(0.45 * Math.sin(t * Math.PI) * (1 - t * 0.3) + 0.05, t * 1.1));
    }
    var mesh = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.05 })
    );
    mesh.scale.set(0.7, 0.7, 0.7);
    return mesh;
  }
  var tooth = makeTooth();
  tooth.position.set(2.6, 1.4, 4);
  scene.add(tooth);

  // ---- waypoint-based camera: an explicit, comfortable framing position
  // per beat, interpolated smoothly between stops (the dolly/pan/zoom).
  // Far more predictable than deriving the path from a formula — every
  // portal ends up correctly and consistently framed, since each waypoint
  // is built directly from that portal's own position rather than an
  // independent curve that can drift out of sync with it. ----
  function buildWaypoints() {
    // wps[i] must land exactly on portal[i]'s own framing — getSceneFloat()
    // returns 0..NUM_SCENES-1 with no separate "intro" segment before beat
    // 0, so there must be no extra leading waypoint here either, or every
    // beat frames one step behind (confirmed by screenshotting all 5 beats:
    // "Il risultato" was showing "La cura" large in the foreground until
    // this was removed).
    var wps = [];
    portals.forEach(function (p) {
      wps.push({
        pos: new THREE.Vector3(p.position.x * 0.22, p.position.y * 0.4 + 0.3, p.position.z + 5.6),
        look: new THREE.Vector3(p.position.x * 0.55, p.position.y * 0.5, p.position.z)
      });
    });
    wps.push(wps[wps.length - 1]); // hold at the last beat rather than flying past it
    return wps;
  }
  var waypoints = buildWaypoints();
  var lookTarget = new THREE.Vector3();

  var captions = Array.prototype.slice.call(document.querySelectorAll(".journey-caption"));
  var progressDots = Array.prototype.slice.call(document.querySelectorAll(".journey-progress span"));
  var hint = document.getElementById("journeyHint");
  var activeScene = -1;
  var railTop = 0, scrollRange = 1;

  function measure() {
    var rect = rail.getBoundingClientRect();
    railTop = rect.top + window.scrollY;
    scrollRange = Math.max(1, rail.offsetHeight - window.innerHeight);
  }
  function getSceneFloat() {
    var local = (window.scrollY - railTop) / scrollRange;
    return Math.max(0, Math.min(1, local)) * (NUM_SCENES - 1);
  }
  function isEngaged() {
    var r = rail.getBoundingClientRect();
    return r.top <= 2 && r.bottom >= window.innerHeight - 2;
  }

  function updateFromScroll() {
    var sceneFloat = getSceneFloat();
    var wpIdx = Math.min(Math.floor(sceneFloat), waypoints.length - 2);
    var wpFrac = sceneFloat - wpIdx;
    camera.position.lerpVectors(waypoints[wpIdx].pos, waypoints[wpIdx + 1].pos, wpFrac);
    lookTarget.lerpVectors(waypoints[wpIdx].look, waypoints[wpIdx + 1].look, wpFrac);
    camera.lookAt(lookTarget);

    // Glow bloom peaks on the in-focus portal and fades out over roughly
    // one beat's distance either side — the "soft transition" cue.
    portals.forEach(function (p, i) {
      var dist = Math.abs(i - sceneFloat);
      p.userData.glow.material.opacity = Math.max(0, 1 - dist * 1.15) * 0.85;
    });

    var nearest = Math.round(sceneFloat);
    if (nearest !== activeScene) {
      activeScene = nearest;
      captions.forEach(function (c) { c.classList.toggle("is-active", Number(c.dataset.scene) === nearest); });
      progressDots.forEach(function (d, i) { d.classList.toggle("is-active", i === nearest); });
    }
    if (hint) hint.style.opacity = sceneFloat < 0.15 ? 1 : 0;
  }

  window.addEventListener("scroll", updateFromScroll, { passive: true });
  window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    measure();
  });

  // ---- snap navigation: one wheel/swipe/key gesture advances one full
  // beat, animated smoothly. Only active while the section is actually
  // pinned (isEngaged()); at the first/last beat, letting the same gesture
  // repeat with no preventDefault hands control back to native scroll,
  // which carries the user out of the section either direction. ----
  var isSnapping = false;
  function animateScrollTo(targetY, duration) {
    isSnapping = true;
    var startY = window.scrollY;
    var delta = targetY - startY;
    var startTime = performance.now();
    (function step(now) {
      var t = Math.min(1, (now - startTime) / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      window.scrollTo(0, startY + delta * eased);
      if (t < 1) requestAnimationFrame(step);
      else isSnapping = false;
    })(performance.now());
  }
  function nearestSnapIndex() {
    return Math.round(getSceneFloat());
  }
  function snapTo(index) {
    animateScrollTo(railTop + (index / (NUM_SCENES - 1)) * scrollRange, 700);
  }

  var wheelCooldown = false;
  window.addEventListener("wheel", function (e) {
    if (!isEngaged()) return;
    var dir = e.deltaY > 0 ? 1 : -1;
    var next = nearestSnapIndex() + dir;
    if (next < 0 || next > NUM_SCENES - 1) return; // let the gesture escape the section
    e.preventDefault();
    if (isSnapping || wheelCooldown) return;
    wheelCooldown = true;
    snapTo(next);
    setTimeout(function () { wheelCooldown = false; }, 80);
  }, { passive: false });

  window.addEventListener("keydown", function (e) {
    if (!isEngaged() || isSnapping) return;
    if (["ArrowDown", "PageDown"].indexOf(e.key) !== -1) {
      var down = nearestSnapIndex() + 1;
      if (down <= NUM_SCENES - 1) { e.preventDefault(); snapTo(down); }
    } else if (["ArrowUp", "PageUp"].indexOf(e.key) !== -1) {
      var up = nearestSnapIndex() - 1;
      if (up >= 0) { e.preventDefault(); snapTo(up); }
    }
  });

  measure();
  function animate() {
    requestAnimationFrame(animate);
    tooth.rotation.y += 0.006;
    renderer.render(scene, camera);
  }
  animate();
  updateFromScroll();
})();
