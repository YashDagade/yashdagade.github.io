// Essays (page mode): the reading-progress hairline, the taller top veil once scrolled, and no timed
// "Press F" hint on a text page (the Find [F] pill already says it). Loaded after core.js.
(function () {
  'use strict';

  // Site.boot's hint:false asks core for this; the observer covers a core that does not know the option.
  // Other hints (Sound on/off) stay.
  var hint = document.getElementById('hint');
  if (hint && window.MutationObserver) {
    new MutationObserver(function () {
      if (hint.classList.contains('is-visible') && /^Press F\b/.test(hint.textContent)) hint.classList.remove('is-visible');
    }).observe(hint, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  var bar = document.querySelector('.essay-progress');
  var veil = document.querySelector('.essay-veil');
  var root = document.documentElement;
  var veilOn = false, ticking = false, last = -1;

  function sync() {
    ticking = false;
    var y = window.scrollY || root.scrollTop || 0;
    var max = Math.max(1, root.scrollHeight - window.innerHeight);
    var p = Math.max(0, Math.min(1, y / max));
    if (bar && Math.abs(p - last) > 0.0005) { last = p; bar.style.transform = 'scaleX(' + p.toFixed(4) + ')'; }
    var want = y > 24;
    if (veil && want !== veilOn) { veilOn = want; veil.classList.toggle('is-on', veilOn); }
  }
  function queue() { if (!ticking) { ticking = true; requestAnimationFrame(sync); } }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
  window.addEventListener('load', queue);
  sync();
})();
