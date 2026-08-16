const cfg=window.SITE_CONFIG||{};
const toggle=document.getElementById("menuToggle"),nav=document.getElementById("mainNav");
toggle?.addEventListener("click",()=>{const open=nav.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));});
nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));

const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("visible");revealObserver.unobserve(entry.target);}}),{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>revealObserver.observe(el));

const waText=encodeURIComponent("Ciao, vorrei ricevere informazioni sulla consulenza gratuita per un trattamento dentale in Albania.");
const waHref=cfg.whatsappNumber?`https://wa.me/${cfg.whatsappNumber}?text=${waText}`:"#consulenza";
document.getElementById("floatingWhatsapp").href=waHref;
document.getElementById("footerWhatsapp").href=waHref;
document.getElementById("footerPhone").textContent=cfg.phoneNumber||"";
document.getElementById("footerEmail").textContent=cfg.emailAddress||"";

const waBubbleOpen=document.getElementById("waBubbleOpen");
if(waBubbleOpen)waBubbleOpen.href=waHref;

document.querySelectorAll(".wa-treatment-link").forEach(a=>{
  const topic=a.dataset.treatment;
  const text=encodeURIComponent(`Ciao, vorrei ricevere informazioni su: ${topic}.`);
  a.href=cfg.whatsappNumber?`https://wa.me/${cfg.whatsappNumber}?text=${text}`:"#consulenza";
});

// proactive WhatsApp bubble: same behavior as the landing page (appears once
// the cookie banner is out of the way, typing-delay animation, unread badge,
// dismissible, shown once per tab session) - general "how can we help" copy
// here rather than the landing page's preventivo-specific greeting.
const waWidget=document.getElementById("waWidget");
const waBadge=document.getElementById("waBadge");
const cookieBannerEl=document.getElementById("cookieBanner");
function bannerIsShowing(){return cookieBannerEl&&getComputedStyle(cookieBannerEl).display!=="none";}
function hideWaBadge(){waBadge?.classList.remove("wa-badge-visible");}
function tryShowWaBubble(){
  if(!waWidget||sessionStorage.getItem("waBubbleDismissed")||bannerIsShowing())return;
  waWidget.classList.add("wa-bubble-visible","wa-bubble-typing");
  setTimeout(()=>{waWidget.classList.remove("wa-bubble-typing");hideWaBadge();},1200);
}
function dismissWaBubble(){waWidget?.classList.remove("wa-bubble-visible");sessionStorage.setItem("waBubbleDismissed","1");}
if(waWidget){
  waBadge?.classList.add("wa-badge-visible");
  setTimeout(tryShowWaBubble,4000);
  document.getElementById("acceptCookies")?.addEventListener("click",()=>setTimeout(tryShowWaBubble,400));
  document.getElementById("rejectCookies")?.addEventListener("click",()=>setTimeout(tryShowWaBubble,400));
  document.getElementById("floatingWhatsapp")?.addEventListener("click",hideWaBadge);
  document.getElementById("waBubbleClose")?.addEventListener("click",dismissWaBubble);
  waBubbleOpen?.addEventListener("click",dismissWaBubble);
}

const reviews=Array.isArray(window.CLIENT_REVIEWS)?window.CLIENT_REVIEWS:[];
const track=document.getElementById("reviewsTrack");
let reviewIndex=0;
function esc(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function renderReviews(){if(!track)return;track.innerHTML=reviews.map(r=>`<article class="card review-card"><div class="review-stars">${"★".repeat(Math.max(1,Math.min(5,Number(r.rating)||5)))}</div><p>“${esc(r.text||"")}”</p><strong>${esc(r.name||"Cliente")}</strong><small>${esc(r.location||"")} · ${r.verified?"Recensione verificata":"Da verificare"}</small></article>`).join("");updateCarousel();}
function visibleCount(){return innerWidth<=720?1:innerWidth<=1120?2:3;}
function updateCarousel(){if(!track)return;const count=visibleCount(),max=Math.max(0,reviews.length-count);reviewIndex=Math.min(reviewIndex,max);const pct=(100/count)*reviewIndex;track.style.transform=`translateX(calc(-${pct}% - ${reviewIndex*22/count}px))`;track.style.transition="transform .35s ease";}
document.getElementById("reviewPrev")?.addEventListener("click",()=>{reviewIndex=Math.max(0,reviewIndex-1);updateCarousel();});
document.getElementById("reviewNext")?.addEventListener("click",()=>{reviewIndex=Math.min(Math.max(0,reviews.length-visibleCount()),reviewIndex+1);updateCarousel();});
addEventListener("resize",updateCarousel);renderReviews();

const lightbox=document.getElementById("lightbox"),lightboxImg=document.getElementById("lightboxImg");
function openLightbox(src,alt){if(!lightbox||!lightboxImg)return;lightboxImg.src=src;lightboxImg.alt=alt||"";lightbox.classList.add("is-open");}
function closeLightbox(){if(!lightbox)return;lightbox.classList.remove("is-open");lightboxImg.src="";}
document.querySelectorAll("[data-lightbox-src]").forEach(btn=>{
  btn.addEventListener("click",()=>openLightbox(btn.dataset.lightboxSrc,btn.querySelector("img")?.alt));
});
document.getElementById("lightboxClose")?.addEventListener("click",closeLightbox);
lightbox?.addEventListener("click",e=>{if(e.target===lightbox)closeLightbox();});
addEventListener("keydown",e=>{if(e.key==="Escape")closeLightbox();});
