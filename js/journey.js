/* Sorriso Albania — "Come funziona" scroll journey.
   =========================================================================
   Five stills of the same person (home → call → airport → clinic → reveal)
   pinned full-bleed, one on top of the other, cross-dissolving into each
   other as you scroll — the whole point is that it reads as ONE continuous
   transformation of the same face, not five separate photos in a gallery.
   Every frame shares the same object-position (face-anchored), so the face
   stays put on screen while the crossfade happens around it. Wheel/touch/
   keyboard input is hijacked *only while this section is engaged* so one
   scroll gesture advances exactly one beat, animated smoothly.

   THE 5 STORY BEATS (index 0-4, in order):
     0 — La richiesta   (the request: patient fills in the form)
     1 — La risposta    (the response: the team calls back with a plan)
     2 — Il viaggio      (the journey: heading to the airport)
     3 — La cura         (the care: inside the clinic in Albania)
     4 — Il risultato    (the result: the new smile, revealed)
   Each beat's photo (SCENE_IMAGES below) and caption live together with a
   "BEAT N" comment at their definition site in index.html's #journeyRail
   markup — change both in the same place to swap a beat. All 5 beats are
   the same identity-consistent person, mouth closed until beat 4's reveal.

   Stack: plain HTML/CSS/JS, no build step, no framework, no WebGL — a
   crossfade doesn't need 3D, so this runs on far more devices than the
   corridor-of-framed-panels version it replaced.

   Progressive enhancement, same principle as the rest of the site: the
   flat card grid (#stepsGridFallback, already in the DOM) is what everyone
   gets by default — including everyone on prefers-reduced-motion, touch,
   or a small/short viewport, which is this dental-tourism audience's
   realistic mid-range-mobile baseline. This script only swaps the fallback
   out after confirming all of the above pass. Any failure anywhere below
   leaves the fallback exactly as it was — nothing here is required for the
   section to work. */
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var isSmall = window.innerWidth < 900 || window.innerHeight < 620;
  if (reduceMotion || isTouch || isSmall) return;

  var rail = document.getElementById("journeyRail");
  var stage = document.getElementById("journeyStage");
  var fallback = document.getElementById("stepsGridFallback");
  if (!rail || !stage || !fallback) return;

  var NUM_SCENES = 5;
  var SCENE_IMAGES = [
    "assets/images/journey-photos/scene-1-richiesta.jpg",
    "assets/images/journey-photos/scene-2-risposta.jpg",
    "assets/images/journey-photos/scene-3-viaggio.jpg",
    "assets/images/journey-photos/scene-4-cura.jpg",
    "assets/images/journey-photos/scene-5-risultato.jpg"
  ];

  // Capability confirmed past this point — commit to the scene.
  rail.hidden = false;
  rail.style.height = (NUM_SCENES * 100) + "vh";
  fallback.style.display = "none";

  var oldCanvas = document.getElementById("journeyCanvas");
  if (oldCanvas) oldCanvas.remove();

  // ---- the crossfade stack: one full-bleed <img> per beat, stacked in the
  // same position. object-position stays identical across all five so the
  // face doesn't jump between frames — only opacity moves. Inserted as the
  // *first* children of stage (existing captions/progress/hint markup stays
  // after them in the DOM) so the frames paint behind that overlay UI
  // without needing extra z-index bookkeeping. ----
  var stageAnchor = stage.firstChild;
  var frames = SCENE_IMAGES.map(function (src, i) {
    var img = document.createElement("img");
    img.className = "journey-frame";
    img.src = src;
    img.alt = "";
    img.style.opacity = i === 0 ? "1" : "0";
    stage.insertBefore(img, stageAnchor);
    return img;
  });

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

    // Cross-dissolve: each frame's opacity is a triangular window peaking
    // at its own beat and fading to 0 one beat away either side, so
    // consecutive frames overlap and blend through the transition instead
    // of hard-cutting.
    frames.forEach(function (img, i) {
      var dist = Math.abs(i - sceneFloat);
      img.style.opacity = String(Math.max(0, 1 - dist));
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
  window.addEventListener("resize", measure);

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
  updateFromScroll();
})();
