// Applies window.CP_DONATE to every donate element on the page (static HTML already has the same defaults).
// Also sends donate_click / download_click to GA4 when gtag is present (after consent).
// When the Razorpay button is used, a full-screen blur hides the UPI QR until checkout closes.
(function(){
  var c=window.CP_DONATE;
  function track(name, extra){
    if (typeof window.gtag === "function") {
      var p = extra || {};
      p.event_category = p.event_category || "engagement";
      window.gtag("event", name, p);
    }
  }
  if(c){
    var base=(document.currentScript&&document.currentScript.src||'').replace(/assets\/js\/donate\.js.*$/,'');
    var upi='upi://pay?pa='+encodeURIComponent(c.upiId)+'&pn='+encodeURIComponent(c.payeeName)+'&tn='+encodeURIComponent(c.note)+'&cu=INR';
    document.querySelectorAll('[data-donate-upi]').forEach(function(a){
      a.href=upi;
      a.addEventListener('click', function(){ track('donate_click', {method:'upi'}); });
    });
    document.querySelectorAll('[data-donate-link]').forEach(function(a){
      if(!c.paymentLink){ a.hidden=true; a.removeAttribute('href'); return; }
      a.href=c.paymentLink;
    });
    document.querySelectorAll('[data-donate-qr]').forEach(function(i){i.src=base+c.qrImage;});
    document.querySelectorAll('[data-donate-id]').forEach(function(s){s.textContent=c.upiId;});
    document.querySelectorAll('[data-copy-upi]').forEach(function(b){b.addEventListener('click',function(){
      if(navigator.clipboard){navigator.clipboard.writeText(c.upiId).then(function(){b.textContent='Copied';setTimeout(function(){b.textContent='Copy UPI ID';},1500);});}
    });});
  }
  document.querySelectorAll('script[data-payment_button_id]').forEach(function(s){
    var form = s.closest('form');
    if (!form || form.getAttribute('data-tracked') === '1') return;
    form.setAttribute('data-tracked', '1');
    form.addEventListener('click', function(){ track('donate_click', {method:'razorpay'}); });
  });
  document.querySelectorAll('[data-track="download_click"]').forEach(function(a){
    a.addEventListener('click', function(){
      track('download_click', {link_text: (a.getAttribute('data-track-label') || a.textContent || '').trim()});
    });
  });

  // --- Razorpay checkout: blur the page (especially the UPI QR) ---
  var BACKDROP_ID = 'rzp-checkout-blur';
  var open = false;
  var dismissed = false;
  var backdrop = null;
  var raiseTimer = null;

  function isRzpFrame(el){
    if (!el || el.tagName !== 'IFRAME') return false;
    var blob = ((el.className||'')+' '+(el.id||'')+' '+(el.name||'')+' '+(el.src||'')+' '+(el.getAttribute('title')||'')).toLowerCase();
    return blob.indexOf('razorpay') !== -1 || blob.indexOf('rzp_') !== -1;
  }
  function isShown(el){
    if (!el) return false;
    var st = window.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }
  function rzpFrames(){
    return Array.prototype.filter.call(document.querySelectorAll('iframe'), function(f){ return isRzpFrame(f) && isShown(f); });
  }
  function raiseFrames(){
    rzpFrames().forEach(function(f){
      var node = f;
      for (var i=0;i<4 && node && node !== document.body;i++){
        var z = window.getComputedStyle(node).zIndex;
        var n = parseInt(z, 10);
        if (node === f || (!isNaN(n) && n > 0) || /razorpay/i.test(node.className||'')) {
          if (isNaN(n) || n < 2147483646) node.style.setProperty('z-index', '2147483646', 'important');
        }
        node = node.parentElement;
      }
    });
  }
  function ensureBackdrop(){
    if (backdrop && document.getElementById(BACKDROP_ID)) return backdrop;
    backdrop = document.getElementById(BACKDROP_ID);
    if (!backdrop){
      backdrop = document.createElement('div');
      backdrop.id = BACKDROP_ID;
      backdrop.setAttribute('role', 'presentation');
      backdrop.hidden = true;
      backdrop.addEventListener('click', function(){ dismissCheckout(); });
      document.body.appendChild(backdrop);
    }
    return backdrop;
  }
  function showBlur(){
    dismissed = false;
    if (open) { raiseFrames(); return; }
    open = true;
    ensureBackdrop();
    backdrop.hidden = false;
    document.documentElement.classList.add('rzp-checkout-open');
    document.body.classList.add('rzp-checkout-open');
    raiseFrames();
  }
  function hideBlur(){
    if (!open) return;
    open = false;
    if (backdrop) backdrop.hidden = true;
    document.documentElement.classList.remove('rzp-checkout-open');
    document.body.classList.remove('rzp-checkout-open');
  }
  function syncBlur(){
    if (dismissed) {
      if (!rzpFrames().length) dismissed = false;
      else { hideBlur(); return; }
    }
    if (rzpFrames().length) showBlur();
    else hideBlur();
  }
  function closeRazorpayUi(){
    var sels = [
      '.razorpay-container iframe',
      'iframe.razorpay-checkout-frame',
      '.razorpay-checkout-close',
      'button[aria-label="Close"]',
      'button[aria-label="close"]'
    ];
    document.querySelectorAll(sels.join(',')).forEach(function(el){
      if (el.tagName === 'BUTTON' || (el.getAttribute && /close/i.test(el.getAttribute('aria-label')||el.className||''))) {
        try { el.click(); } catch (e) {}
      }
    });
    try {
      document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape', code:'Escape', keyCode:27, which:27, bubbles:true}));
    } catch (e) {}
  }
  function dismissCheckout(){
    dismissed = true;
    closeRazorpayUi();
    hideBlur();
  }
  function onRazorpayIntent(){
    showBlur();
    track('donate_click', {method:'razorpay'});
    window.clearTimeout(raiseTimer);
    [50, 200, 600, 1500].forEach(function(ms){
      raiseTimer = window.setTimeout(function(){ if (!dismissed) { raiseFrames(); syncBlur(); } }, ms);
    });
  }

  function bindRazorpay(){
    document.querySelectorAll('form.razorpay-donate, script[data-payment_button_id]').forEach(function(el){
      var form = el.tagName === 'FORM' ? el : el.closest('form');
      if (!form || form.getAttribute('data-rzp-blur') === '1') return;
      form.setAttribute('data-rzp-blur', '1');
      form.addEventListener('click', onRazorpayIntent, true);
      form.addEventListener('submit', onRazorpayIntent, true);
    });
  }
  bindRazorpay();
  // The payment-button script injects a button asynchronously.
  window.setTimeout(bindRazorpay, 500);
  window.setTimeout(bindRazorpay, 2000);

  var obs = new MutationObserver(function(){
    bindRazorpay();
    syncBlur();
  });
  obs.observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['style','class','hidden','src']});

  window.addEventListener('focus', syncBlur);
  document.addEventListener('visibilitychange', syncBlur);
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      dismissCheckout();
    }
  });
})();
