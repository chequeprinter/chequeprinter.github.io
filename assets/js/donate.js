// Applies window.CP_DONATE to every donate element on the page (static HTML already has the same defaults).
// Also sends donate_click / download_click to GA4 when gtag is present (after consent).
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
})();
