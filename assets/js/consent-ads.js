/* Cookie consent (Google Consent Mode v2) + optional AdSense and GA4 loaders.
   Included when a real GA_MEASUREMENT_ID and/or AdSense IDs are configured.
   Defaults are denied. Ads load only after accept (and a user gesture / short idle).
   GA4's gtag.js, when configured, is loaded in the page head with denied consent
   and is switched to granted on Accept. */
(function () {
  var cfg = window.CP_CONSENT || window.CP_ADS || {};
  var gaId = cfg.gaId || "";
  var adsPubId = cfg.adsPubId || cfg.pubId || "";
  if (!gaId && !adsPubId) return;

  var KEY = "cp-consent-v1";
  var choice = null;
  try { choice = localStorage.getItem(KEY); } catch (e) {}

  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }
  window.gtag = window.gtag || gtag;

  function hideBanner() {
    var el = document.getElementById("cp-consent");
    if (el) el.remove();
    document.body.classList.remove("has-consent-banner");
  }

  function updateConsent(granted) {
    var state = granted ? "granted" : "denied";
    gtag("consent", "update", {
      ad_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      analytics_storage: state
    });
  }

  var adsLoaded = false;
  function loadAds() {
    if (adsLoaded || choice !== "granted" || !adsPubId) return;
    adsLoaded = true;
    var s = document.createElement("script");
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(adsPubId);
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = function () {
      try {
        document.querySelectorAll("ins.adsbygoogle").forEach(function () {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        });
      } catch (e) {}
    };
    document.head.appendChild(s);
  }

  function afterGesture(fn) {
    var done = false;
    function run() {
      if (done) return;
      done = true;
      ["click", "scroll", "keydown", "touchstart", "pointerdown"].forEach(function (ev) {
        window.removeEventListener(ev, run, { passive: true });
      });
      fn();
    }
    ["click", "scroll", "keydown", "touchstart", "pointerdown"].forEach(function (ev) {
      window.addEventListener(ev, run, { passive: true });
    });
    window.setTimeout(run, 6000);
  }

  function accept() {
    choice = "granted";
    try { localStorage.setItem(KEY, choice); } catch (e) {}
    updateConsent(true);
    hideBanner();
    loadAds();
  }

  function reject() {
    choice = "denied";
    try { localStorage.setItem(KEY, choice); } catch (e) {}
    updateConsent(false);
    hideBanner();
  }

  function privacyHref() {
    if (cfg.privacyUrl) return cfg.privacyUrl;
    var a = document.querySelector('footer a[href*="privacy"]');
    return (a && a.getAttribute("href")) || "privacy/";
  }

  function bannerCopy() {
    if (gaId && adsPubId) {
      return {
        title: "Cookies, analytics and ads",
        text: "We use Google Analytics to understand visits, and Google AdSense to show ads on some articles. These cookies stay off until you accept.",
        accept: "Accept",
        reject: "Reject"
      };
    }
    if (gaId) {
      return {
        title: "Cookies and analytics",
        text: "We use Google Analytics to understand how this site is used. Analytics cookies stay off until you accept.",
        accept: "Accept",
        reject: "Reject"
      };
    }
    return {
      title: "Cookies and ads",
      text: "We use cookies and Google AdSense to show ads on some articles. Ads and ad-measurement cookies stay off until you accept.",
      accept: "Accept ads",
      reject: "Reject"
    };
  }

  function showBanner() {
    if (document.getElementById("cp-consent")) return;
    var copy = bannerCopy();
    var bar = document.createElement("div");
    bar.id = "cp-consent";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-labelledby", "cp-consent-title");
    bar.setAttribute("aria-describedby", "cp-consent-text");
    bar.innerHTML =
      '<p id="cp-consent-title" class="cp-consent-title">' + copy.title + "</p>" +
      '<p id="cp-consent-text">' + copy.text + ' Read the <a href="' + privacyHref() + '">privacy policy</a>.</p>' +
      '<div class="cp-consent-actions">' +
      '<button type="button" class="btn btn-primary btn-sm" id="cp-consent-accept">' + copy.accept + "</button>" +
      '<button type="button" class="btn btn-ghost btn-sm" id="cp-consent-reject">' + copy.reject + "</button>" +
      "</div>";
    document.body.appendChild(bar);
    document.body.classList.add("has-consent-banner");
    document.getElementById("cp-consent-accept").addEventListener("click", accept);
    document.getElementById("cp-consent-reject").addEventListener("click", reject);
  }

  if (choice === "granted") {
    updateConsent(true);
    afterGesture(loadAds);
  } else if (choice === "denied") {
    /* keep defaults (denied); no banner, no ads */
  } else {
    showBanner();
  }
})();
