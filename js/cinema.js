/* Sorriso Albania — cinematic 3D scroll engine.
   Progressive enhancement only: the page is fully usable, readable and
   accessible with this script absent (CDN blocked, JS disabled, etc). It
   only ever *adds* motion on top of content that is already visible in
   plain CSS — see css/cinema-motion.css for the "hidden until gsap-ready"
   / "hidden until scene-3d" states this file switches on. */
(function () {
  var html = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var isSmall = window.innerWidth < 900;

  if (reduceMotion) html.classList.add("motion-reduced");

  // Header state + scroll progress bar run unconditionally (cheap, no GSAP needed).
  var header = document.querySelector(".site-header");
  var progressBar = document.querySelector(".scroll-progress__bar");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 30);
    if (progressBar) {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var scrolled = max > 0 ? h.scrollTop / max : 0;
      progressBar.style.transform = "scaleX(" + Math.min(1, Math.max(0, scrolled)) + ")";
    }
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (reduceMotion) return;

  // Soft-glow custom cursor, desktop pointer devices only.
  if (!isTouch) {
    var cursor = document.createElement("div");
    cursor.className = "cine-cursor is-hidden";
    document.body.appendChild(cursor);
    var tx = 0, ty = 0, cx = 0, cy = 0, primed = false;
    document.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!primed) { cx = tx; cy = ty; primed = true; }
      cursor.classList.remove("is-hidden");
    });
    (function raf() {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      cursor.style.left = cx + "px";
      cursor.style.top = cy + "px";
      requestAnimationFrame(raf);
    })();
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest("a,button,summary,input,select,textarea,label")) {
        cursor.classList.add("is-active");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest("a,button,summary,input,select,textarea,label")) {
        cursor.classList.remove("is-active");
      }
    });
  }

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  html.classList.add("gsap-ready");

  var canParallax = !isTouch && !isSmall;
  // The pinned 3D scenes need real vertical room to stay legible — only arm
  // them for desktop pointer devices with a reasonably tall viewport.
  var canScene = canParallax && window.innerHeight >= 620;
  if (canScene) html.classList.add("scene-3d");

  // Hero entrance sequence (on load, independent of scroll).
  gsap.timeline({ defaults: { ease: "power3.out" } })
    .to(".hero-copy .eyebrow", { opacity: 1, y: 0, duration: .7 }, .05)
    .to(".hero-copy .word-inner", { y: "0%", rotateX: 0, stagger: .045, duration: 1.1 }, .15)
    .to(".hero-copy .hero-text", { opacity: 1, y: 0, duration: .8 }, .55)
    .to(".hero-copy .check-list li", { opacity: 1, y: 0, stagger: .08, duration: .6 }, .68)
    .to(".hero-copy .hero-actions", { opacity: 1, y: 0, duration: .7 }, .9)
    .to(".scroll-cue", { opacity: 1, duration: .6 }, 1.15)
    .to(".trust-bar .trust-item", { opacity: 1, y: 0, rotateX: 0, stagger: .1, duration: .8 }, 1.0);

  // Generic scroll-triggered reveals, single elements: <div data-reveal="rise">.
  gsap.utils.toArray("[data-reveal]").forEach(function (el) {
    gsap.to(el, {
      opacity: 1, y: 0, rotateX: 0, rotateY: 0,
      duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });

  // Staggered groups: <div data-reveal-group> containing [data-reveal-item] children.
  // The treatments group gets its own dedicated horizontal-scroll scene below
  // once armed, so it's skipped here to avoid two systems fighting over the
  // same elements' transforms. The steps grid is a plain fallback (js/journey.js
  // owns the 3D version of that section entirely, separately), so it stays in.
  gsap.utils.toArray("[data-reveal-group]").forEach(function (group) {
    if (canScene && group.classList.contains("treatments-track")) return;
    var items = group.querySelectorAll("[data-reveal-item]");
    if (!items.length) return;
    gsap.to(items, {
      opacity: 1, y: 0, rotateX: 0,
      duration: .9, ease: "power3.out", stagger: .1,
      scrollTrigger: { trigger: group, start: "top 80%" }
    });
  });

  // Safety net: a scroll-triggered reveal can fail to ever fire if this page
  // ends up embedded somewhere that scrolls a container other than the one
  // ScrollTrigger measured (a third-party preview/viewer, for instance) —
  // content would stay permanently invisible with no way to recover. After
  // a short delay, force anything still hidden into its visible end state.
  setTimeout(function () {
    ScrollTrigger.refresh();
    document.querySelectorAll("[data-reveal], [data-reveal-item]").forEach(function (el) {
      if (getComputedStyle(el).opacity === "0") {
        gsap.set(el, { opacity: 1, y: 0, rotateX: 0, rotateY: 0 });
      }
    });
  }, 2500);

  // Panorama parallax.
  if (canParallax) {
    gsap.utils.toArray("[data-parallax]").forEach(function (el) {
      var amount = parseFloat(el.getAttribute("data-parallax")) || 8;
      gsap.to(el, {
        yPercent: amount,
        ease: "none",
        scrollTrigger: {
          trigger: el.closest("section") || el,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      });
    });
  }

  // Mouse-tilt on cards, desktop pointer only.
  if (canParallax) {
    document.querySelectorAll(".tilt").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - .5;
        var py = (e.clientY - r.top) / r.height - .5;
        gsap.to(card, { rotateY: px * 10, rotateX: py * -10, duration: .4, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", function () {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: .6, ease: "power3.out" });
      });
    });
  }

  if (!canScene) { ScrollTrigger.refresh(); return; }

  /* ======================================================================
     3D SCENES — desktop only, real perspective/translateZ depth, scrubbed
     directly to scroll position via position:sticky (no ScrollTrigger.pin,
     so there's no pin-spacer to fight the responsive breakpoints).
     ====================================================================== */

  // Scene 1 — Hero: the photo tilts away in 3D while the headline lifts
  // toward the camera and dissolves, handing off into the trust bar.
  var heroScene = document.querySelector(".hero-scene");
  if (heroScene) {
    gsap.timeline({
      scrollTrigger: { trigger: heroScene, start: "top top", end: "bottom top", scrub: .6 }
    })
      .to(".scroll-cue", { opacity: 0, y: 14, duration: .12, ease: "none" }, 0)
      .fromTo(".hero-media img", { rotateX: 0, scale: 1.12 }, { rotateX: 8, scale: 1.36, duration: 1, ease: "none" }, 0)
      .to(".hero-copy", { z: 170, y: -60, opacity: 0, duration: 1, ease: "none" }, .05);

    // Subtle cursor-driven depth parallax on the hero, independent axes from
    // the scroll-scrub above so the two never fight over the same property.
    var hmx = 0, hmy = 0, hcx = 0, hcy = 0;
    heroScene.addEventListener("mousemove", function (e) {
      var r = heroScene.getBoundingClientRect();
      hmx = (e.clientX - r.left) / r.width - .5;
      hmy = (e.clientY - r.top) / r.height - .5;
    });
    gsap.ticker.add(function () {
      hcx += (hmx - hcx) * .06;
      hcy += (hmy - hcy) * .06;
      gsap.set(".hero-media img", { xPercent: hcx * -2.4, yPercent: hcy * -2.4 });
    });
  }

  // "Come funziona" is its own WebGL flythrough, entirely separate from
  // GSAP/ScrollTrigger — see js/journey.js.

  // Scene 2 — Trattamenti: pins while the card row scroll-jacks horizontally.
  var treatStage = document.querySelector(".treatments-stage");
  var treatInner = document.querySelector(".treatments-inner");
  var treatTrack = document.querySelector(".treatments-track");
  if (treatStage && treatInner && treatTrack) {
    // These cards are excluded from the generic [data-reveal-item] fade-in
    // above (it would fight the horizontal scrub), so their CSS "hidden
    // until gsap-ready" starting state needs clearing explicitly here.
    gsap.set(treatTrack.querySelectorAll(".treatment-card"), { opacity: 1, y: 0, rotateX: 0 });
    gsap.to(treatTrack, {
      x: function () { return -(treatTrack.scrollWidth - treatInner.clientWidth); },
      ease: "none",
      scrollTrigger: { trigger: treatStage, start: "top top", end: "bottom bottom", scrub: .5 }
    });
  }

  ScrollTrigger.refresh();
})();
