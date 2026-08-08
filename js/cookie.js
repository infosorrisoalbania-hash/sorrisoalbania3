const banner = document.getElementById("cookieBanner");
const cookieChoice = localStorage.getItem("cookieChoice");

if (cookieChoice && banner) banner.style.display = "none";

function updateGoogleConsent(granted) {
  if (typeof window.gtag !== "function") return;
  const value = granted ? "granted" : "denied";
  window.gtag("consent", "update", {
    ad_storage: value,
    analytics_storage: value,
    ad_user_data: value,
    ad_personalization: value
  });
}

document.getElementById("acceptCookies")?.addEventListener("click", () => {
  localStorage.setItem("cookieChoice", "accepted");
  updateGoogleConsent(true);
  if (banner) banner.style.display = "none";
});

document.getElementById("rejectCookies")?.addEventListener("click", () => {
  localStorage.setItem("cookieChoice", "rejected");
  updateGoogleConsent(false);
  if (banner) banner.style.display = "none";
});
