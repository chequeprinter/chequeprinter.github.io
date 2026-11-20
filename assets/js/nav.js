// Mobile menu toggle (progressive enhancement; nav is visible without JS via .no-js fallback)
(function(){var b=document.querySelector('.nav-toggle'),n=document.getElementById('site-nav');if(!b||!n)return;b.addEventListener('click',function(){var o=n.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');});})();
