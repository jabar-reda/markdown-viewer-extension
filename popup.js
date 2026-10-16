/* popup.js - Chrome 100 safe */
(function () {
  'use strict';
  function fixPath(s) {
    s = (s || '').trim().replace(/^["']|["']$/g, '');
    // C://... -> file:///C:/...
    var m = s.match(/^([A-Za-z]):\/\/+(.*)$/);
    if (m) return 'file:///' + m[1] + ':/' + m[2].replace(/^\/+/, '');
    // C:\... or C:/... -> file:///C:/...
    var m2 = s.match(/^([A-Za-z]):[\\/]+(.*)$/);
    if (m2) return 'file:///' + m2[1] + ':/' + m2[2].replace(/\\/g, '/').replace(/^\/+/, '');
    // already file:///
    if (/^file:\/\/\//i.test(s)) return s.replace(/\\/g, '/');
    return s;
  }
  var input = document.getElementById('in');
  var out = document.getElementById('out');
  var last = '';
  document.getElementById('fix').addEventListener('click', function () {
    last = fixPath(input.value);
    out.textContent = last || '—';
  });
  document.getElementById('copy').addEventListener('click', function () {
    var t = last || out.textContent;
    if (!t || t === '—') return;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t);
    else {
      var ta = document.createElement('textarea');
      ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
  });
  document.getElementById('open').addEventListener('click', function () {
    var t = last || out.textContent;
    if (!t || t === '—') return;
    chrome.tabs.create({ url: t });
  });
})();
