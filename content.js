/* Markdown Viewer (Local File) - content.js
 * Compatible with Chrome 100: ES2019 only, no modules, no top-level await.
 * Works on file:/// pages that Chrome renders as <pre> raw text.
 */
(function () {
  'use strict';

  // 1. Only run on markdown files
  function isMarkdownFile() {
    try {
      var path = location.pathname || location.href;
      // strip query/hash
      path = path.split('?')[0].split('#')[0];
      if (/\/$/.test(path)) return false; // directory listing
      return /\.(md|markdown|mdown|mkd)(\.txt)?$/i.test(path);
    } catch (e) {
      return false;
    }
  }

  if (!isMarkdownFile()) return;

  // 2. Get raw text (Chrome wraps file:// text in <pre>)
  // Directory listings (fancy file manager) have tables/links, not a single <pre> -> ignore them.
  function getRawText() {
    var pre = document.querySelector('body > pre:only-child');
    if (pre) return pre.textContent || '';
    return '';
  }

  var raw = getRawText();
  if (!raw || raw.length < 2) return;
  // avoid re-render
  if (document.getElementById('mdv-root')) return;

  // 3. Inject CSS only on real markdown pages (was: manifest css hit directory listings too)
  (function injectCSS() {
    try {
      if (document.getElementById('mdv-style')) return;
      var link = document.createElement('link');
      link.id = 'mdv-style';
      link.rel = 'stylesheet';
      link.href = chrome.runtime.getURL('styles.css');
      (document.head || document.documentElement).appendChild(link);
    } catch (e) {}
  })();

  // ---------- helpers ----------
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Fix bad Windows paths: C://folder/file.md -> file:///C:/folder/file.md
  // Also linkify correct C:/... and file:///...
  function fixBadPathsInText(s) {
    // C://... (bad) -> file:///C:/...  (don't touch existing file:///...)
    return s.replace(/(^|[^A-Za-z/:])([A-Za-z]):\/\/([^\s<>"'`]*)/g, function (m, pre, drive, rest) {
      rest = rest.replace(/^\/+/, '');
      return pre + 'file:///' + drive + ':/' + rest;
    });
  }

  function linkifyFilePaths(htmlEscaped) {
    // linkify file:/// URLs that are not already inside href=""
    htmlEscaped = htmlEscaped.replace(/(?<!href=")(file:\/\/\/[A-Za-z]:\/[^\s<>"'`]*)/g, function (m) {
      return '<a href="' + m + '">' + m + '</a>';
    });
    // linkify bare C:/path (not already linked, not part of file:///)
    htmlEscaped = htmlEscaped.replace(/(?<![:">])(?<![A-Za-z]:)(?<![A-Za-z]:\/)([A-Za-z]:\/[^\s<>"'`]*)/g, function (m) {
      var fixed = 'file:///' + m.replace(/\//g, '/');
      return '<a href="' + fixed + '">' + m + '</a>';
    });
    return htmlEscaped;
  }

  function parseInline(text) {
    var s = escapeHtml(text);
    s = fixBadPathsInText(s);
    // images ![alt](src)
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, function (m, alt, src) {
      return '<img alt="' + alt + '" src="' + src + '">';
    });
    // links [t](u)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, function (m, t, u) {
      u = fixBadPathsInText(u);
      return '<a href="' + u + '">' + t + '</a>';
    });
    // inline code `x` (double-backtick first, for code containing backticks)
    s = s.replace(/``[ ]?([^`\n]+?)[ ]?``/g, '<code>$1</code>');
    s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // bold+italic ***t***, bold **t**, italic *t* / _t_, strike ~~t~~
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    s = s.replace(/(^|\W)_([^_\n]+)_/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = linkifyFilePaths(s);
    // autolink http(s)
    s = s.replace(/(?<!href=")(https?:\/\/[^\s<>"'`]+)/g, '<a href="$1">$1</a>');
    return s;
  }

  function isTableSep(line) {
    return /^\s*\|?[\s:|-]+\|?[\s:|-]*$/.test(line) && line.indexOf('-') !== -1 && line.indexOf('|') !== -1;
  }

  // keep the author's number when a fresh <ol> opens (lists broken by code blocks)
  function openListTag(type, marker) {
    if (type === 'ul') return '<ul>';
    var n = parseInt(marker, 10);
    return (n > 1) ? '<ol start="' + n + '">' : '<ol>';
  }

  function splitRow(line) {
    var t = line.trim().replace(/^\||\|$/g, '');
    return t.split('|').map(function (c) { return c.trim(); });
  }

  function parseMarkdown(src) {
    // strip YAML frontmatter ---
    src = src.replace(/^\uFEFF/, '');
    src = src.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    var lines = src.replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var i = 0;
    var inCode = false;
    var codeLang = '';
    var fenceChar = '';
    var fenceIndent = 0;
    var codeBuf = [];
    var listStack = []; // {type, indent}
    var inQuote = false;
    var para = [];

    function flushPara() {
      if (para.length) {
        html.push('<p>' + parseInline(para.join(' ')) + '</p>');
        para = [];
      }
    }
    function closeLists(targetIndent) {
      if (targetIndent === undefined) targetIndent = -1;
      while (listStack.length && listStack[listStack.length - 1].indent > targetIndent) {
        var l = listStack.pop();
        html.push(l.type === 'ul' ? '</ul>' : '</ol>');
      }
    }
    function closeQuote() {
      if (inQuote) { html.push('</blockquote>'); inQuote = false; }
    }

    while (i < lines.length) {
      var line = lines[i];
      // fenced code (``` or ~~~, up to 3-space indent so fences inside lists work)
      var fence = line.match(/^ {0,3}(```+|~~~+)\s*([^\s`~]*)\s*$/);
      if (fence) {
        if (!inCode) {
          flushPara(); closeLists(); closeQuote();
          inCode = true; codeLang = fence[2] || ''; fenceChar = fence[1].charAt(0);
          fenceIndent = line.match(/^ */)[0].length;
          codeBuf = [];
        } else if (fence[1].charAt(0) === fenceChar) {
          inCode = false;
          var cls = codeLang ? ' class="language-' + escapeHtml(codeLang) + '"' : '';
          html.push('<pre><code' + cls + '>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>');
        } else {
          codeBuf.push(line); // mismatched fence char inside code is content
        }
        i++; continue;
      }
      if (inCode) {
        if (fenceIndent > 0) codeBuf.push(line.replace(new RegExp('^ {1,' + fenceIndent + '}'), ''));
        else codeBuf.push(line);
        i++; continue;
      }

      // headings #..######
      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushPara(); closeLists(); closeQuote();
        var lvl = h[1].length;
        var text = h[2].replace(/\s+#+\s*$/, '');
        var id = text.toLowerCase().replace(/[^\w\u0600-\u06FF\s-]/g, '').trim().replace(/\s+/g, '-');
        html.push('<h' + lvl + ' id="' + escapeHtml(id) + '">' + parseInline(text) + '</h' + lvl + '>');
        i++; continue;
      }
      // hr
      if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
        flushPara(); closeLists(); closeQuote();
        html.push('<hr>');
        i++; continue;
      }
      // table: header + sep + rows
      if (line.indexOf('|') !== -1 && i + 1 < lines.length && isTableSep(lines[i + 1])) {
        flushPara(); closeLists(); closeQuote();
        var head = splitRow(line);
        html.push('<table><thead><tr>' + head.map(function (c) { return '<th>' + parseInline(c) + '</th>'; }).join('') + '</tr></thead><tbody>');
        i += 2;
        while (i < lines.length && lines[i].indexOf('|') !== -1 && lines[i].trim() !== '') {
          var row = splitRow(lines[i]);
          html.push('<tr>' + row.map(function (c) { return '<td>' + parseInline(c) + '</td>'; }).join('') + '</tr>');
          i++;
        }
        html.push('</tbody></table>');
        continue;
      }
      // blockquote (max 3-space indent; deeper indent is code, not a quote)
      var q = line.match(/^ {0,3}>\s?(.*)$/);
      if (q) {
        flushPara(); closeLists();
        if (!inQuote) { html.push('<blockquote>'); inQuote = true; }
        if (q[1].trim() === '') html.push('<br>');
        else html.push('<p>' + parseInline(q[1]) + '</p>');
        i++; continue;
      } else {
        closeQuote();
      }
      // lists
      var lm = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (lm) {
        flushPara();
        var indent = lm[1].replace(/\t/g, '  ').length;
        var type = /^\d/.test(lm[2]) ? 'ol' : 'ul';
        var content = lm[3];
        // checkbox - [ ] / - [x]
        var cb = content.match(/^\[([ xX])\]\s+(.*)$/);
        var cbHtml = '';
        if (cb) {
          var checked = (cb[1].toLowerCase() === 'x') ? ' checked disabled' : ' disabled';
          cbHtml = '<input type="checkbox"' + checked + '> ';
          content = cb[2];
        }
        if (!listStack.length || indent > listStack[listStack.length - 1].indent) {
          html.push(openListTag(type, lm[2]));
          listStack.push({ type: type, indent: indent });
        } else {
          while (listStack.length > 1 && indent < listStack[listStack.length - 1].indent) {
            var l2 = listStack.pop();
            html.push(l2.type === 'ul' ? '</ul>' : '</ol>');
          }
          if (listStack.length && listStack[listStack.length - 1].type !== type) {
            var l3 = listStack.pop();
            html.push(l3.type === 'ul' ? '</ul>' : '</ol>');
            html.push(openListTag(type, lm[2]));
            listStack.push({ type: type, indent: indent });
          }
        }
        // continuation indent for nested? keep simple: nested handled by indent growth
        html.push('<li>' + cbHtml + parseInline(content) + '</li>');
        i++; continue;
      }
      // indented code (4 spaces)
      if (/^    \S/.test(line)) {
        flushPara(); closeLists();
        var cb2 = [];
        while (i < lines.length && (/^    \S/.test(lines[i]) || lines[i].trim() === '')) {
          cb2.push(lines[i].replace(/^    /, ''));
          i++;
        }
        html.push('<pre><code>' + escapeHtml(cb2.join('\n')) + '</code></pre>');
        continue;
      }
      // blank
      if (/^\s*$/.test(line)) {
        flushPara();
        i++; continue;
      }
      para.push(line.trim());
      i++;
    }
    flushPara();
    closeLists();
    closeQuote();
    if (inCode) {
      html.push('<pre><code>' + escapeHtml(codeBuf.join('\n')) + '</code></pre>');
    }
    return html.join('\n');
  }

  // ---------- theme ----------
  var THEME_KEY = 'mdv-theme';
  function getPreferredTheme(cb) {
    try {
      if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([THEME_KEY], function (res) {
          var t = res && res[THEME_KEY];
          if (t) return cb(t);
          var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
          cb(dark ? 'dark' : 'light');
        });
        return;
      }
    } catch (e) {}
    var dark2 = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    cb(dark2 ? 'dark' : 'light');
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try {
      if (window.chrome && chrome.storage && chrome.storage.local) {
        var o = {}; o[THEME_KEY] = t;
        chrome.storage.local.set(o);
      } else {
        try { localStorage.setItem(THEME_KEY, t); } catch (e2) {}
      }
    } catch (e) {}
    var btn = document.getElementById('mdv-theme-btn');
    if (btn) btn.textContent = (t === 'dark') ? '☀️ Light' : '🌙 Dark';
  }

  // ---------- render ----------
  function fileName() {
    try {
      var p = decodeURIComponent(location.pathname);
      return p.split('/').pop() || location.href;
    } catch (e) { return location.href; }
  }

  var bodyHtml = parseMarkdown(raw);
  // TOC from h1-h3
  function buildTOC() {
    var tmp = document.createElement('div');
    tmp.innerHTML = bodyHtml;
    var heads = tmp.querySelectorAll('h1, h2, h3');
    if (!heads.length) return '';
    var out = '<nav id="mdv-toc"><div class="mdv-toc-title">Contents</div><ul>';
    for (var k = 0; k < heads.length; k++) {
      var el = heads[k];
      var lvl = parseInt(el.tagName.substring(1), 10);
      out += '<li class="toc-l' + lvl + '"><a href="#' + (el.id || '') + '">' + el.textContent.substring(0, 80) + '</a></li>';
    }
    return out + '</ul></nav>';
  }

  document.title = fileName() + ' — Markdown Viewer';
  document.body.innerHTML = '';
  var root = document.createElement('div');
  root.id = 'mdv-root';
  root.innerHTML =
    '<header id="mdv-bar">' +
      '<span id="mdv-file">📄 ' + escapeHtml(fileName()) + '</span>' +
      '<span id="mdv-actions">' +
        '<button id="mdv-theme-btn" title="Toggle dark/light">🌙 Dark</button>' +
        '<button id="mdv-raw-btn" title="Show raw text">‹› Raw</button>' +
      '</span>' +
    '</header>' +
    '<div id="mdv-layout">' +
      buildTOC() +
      '<article id="mdv-article" class="markdown-body">' + bodyHtml + '</article>' +
    '</div>' +
    '<pre id="mdv-raw" style="display:none"></pre>';
  document.body.appendChild(root);
  document.getElementById('mdv-raw').textContent = raw;

  getPreferredTheme(function (t) { setTheme(t); });

  document.getElementById('mdv-theme-btn').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(cur === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('mdv-raw-btn').addEventListener('click', function () {
    var r = document.getElementById('mdv-raw');
    var a = document.getElementById('mdv-article');
    var toc = document.getElementById('mdv-toc');
    var showing = r.style.display !== 'none';
    r.style.display = showing ? 'none' : 'block';
    a.style.display = showing ? 'block' : 'none';
    if (toc) toc.style.display = showing ? 'block' : 'none';
    this.textContent = showing ? '‹› Raw' : '📖 Rendered';
  });
})();
