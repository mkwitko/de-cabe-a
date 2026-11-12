/* global window, document */
// AdSense for the server-rendered player pages (apps/api seo.routes.ts). A file because the CSP
// allows only same-origin scripts. Never personalised, for anyone (ECA Digital, as AdSlot.tsx).
(function () {
  var ads = (window.adsbygoogle = window.adsbygoogle || []);
  ads.requestNonPersonalizedAds = 1;
  var blocks = document.querySelectorAll('ins.adsbygoogle');
  if (!blocks.length) return;
  for (var i = 0; i < blocks.length; i++) ads.push({});
  var s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src =
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
    blocks[0].getAttribute('data-ad-client');
  document.head.appendChild(s);
})();
