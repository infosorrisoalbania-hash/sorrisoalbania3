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
