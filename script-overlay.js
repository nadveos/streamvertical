/**
 * script-overlay.js
 *
 * Motor de sincronización en tiempo real para todos los overlays.
 *
 * FUNCIONALIDAD:
 *  - Carga datos desde stream-data.json y localStorage ('streamData').
 *  - Sincroniza al instante cuando el panel modifica localStorage (evento 'storage').
 *  - Realiza sondeo (polling) cada 2 segundos a stream-data.json para OBS Browser Sources.
 *  - Actualiza dinámicamente los elementos con el atributo [data-bind].
 */

(function () {
  'use strict';

  // Determinar el directorio base de script-overlay.js para cargar stream-data.json
  // correctamente incluso cuando el HTML se encuentra en subcarpetas (frames/, frames/vertical/, etc.)
  var scriptEl = document.currentScript || document.querySelector('script[src*="script-overlay.js"]');
  var scriptDir = '';
  if (scriptEl && scriptEl.src) {
    scriptDir = scriptEl.src.substring(0, scriptEl.src.lastIndexOf('/') + 1);
  }

  var lastJsonString = '';

  function applyData(data) {
    if (!data) return;

    var jsonStr = JSON.stringify(data);
    if (jsonStr === lastJsonString) return;
    lastJsonString = jsonStr;

    // ── 1. HOST ─────────────────────────────────────────────────────────────
    var hostName = (data.host && data.host.name) ? data.host.name : 'Guta Flores';
    var hostRole = (data.host && data.host.role) ? data.host.role : '🎙️ ANFITRIÓN / HOST';

    document.querySelectorAll('[data-bind="host-name"]').forEach(function (el) {
      el.textContent = hostName;
    });
    document.querySelectorAll('[data-bind="host-role"]').forEach(function (el) {
      el.textContent = hostRole;
    });

    // ── 1b. CO-HOST / CO-ANFITRIÓN ──────────────────────────────────────────
    var cohostName = (data.cohost && data.cohost.name) ? data.cohost.name : '';
    var cohostRole = (data.cohost && data.cohost.role) ? data.cohost.role : '🎙️ CO-HOST / CO-ANFITRIÓN';
    var cohostEnabled = data.cohost ? (data.cohost.enabled === true && cohostName.trim() !== '') : false;

    document.querySelectorAll('[data-bind="cohost-name"]').forEach(function (el) {
      el.textContent = cohostName;
    });
    document.querySelectorAll('[data-bind="cohost-role"]').forEach(function (el) {
      el.textContent = cohostRole;
    });
    document.querySelectorAll('[data-bind="cohost-box"], [data-bind="cohost-container"]').forEach(function (el) {
      el.style.display = cohostEnabled ? '' : 'none';
    });

    // ── 2. INVITADO ──────────────────────────────────────────────────────────
    var guestName = (data.guest && data.guest.name) ? data.guest.name : '';
    var guestRole = (data.guest && data.guest.role) ? data.guest.role : '💬 INVITADO ESPECIAL';
    var guestBio  = (data.guest && data.guest.bio)  ? data.guest.bio  : '';

    document.querySelectorAll('[data-bind="guest-name"]').forEach(function (el) {
      el.textContent = guestName;
    });
    document.querySelectorAll('[data-bind="guest-role"]').forEach(function (el) {
      el.textContent = guestRole;
    });
    document.querySelectorAll('[data-bind="guest-bio"]').forEach(function (el) {
      el.textContent = guestBio;
    });

    // Redes del invitado
    document.querySelectorAll('[data-bind="guest-socials"]').forEach(function (container) {
      if (data.guest && data.guest.socials && Array.isArray(data.guest.socials)) {
        var html = '';
        data.guest.socials.forEach(function (s) {
          if (s.handle && s.handle.trim() !== '') {
            html += '<div class="social-item">'
                 +   '<span class="social-icon">' + (s.icon || '📱') + '</span>'
                 +   '<div class="social-text">'
                 +     '<span class="social-platform">' + (s.platform || 'Red Social') + '</span>'
                 +     '<span class="social-handle">' + s.handle + '</span>'
                 +   '</div>'
                 + '</div>';
          }
        });
        container.innerHTML = html;
      }
    });

    // ── 2b. SOLO VERTICAL STREAM INFO ───────────────────────────────────────
    var soloDescLabel = (data.solo && data.solo.descLabel) ? data.solo.descLabel : '📢 Hoy en el stream';
    var soloBio       = (data.solo && data.solo.bio)       ? data.solo.bio       : '¡Bienvenidos al stream en vivo! Música argentina, folklore y mucho más.';
    var soloHandle    = (data.solo && data.solo.handle)    ? data.solo.handle    : '@gutafloresok';
    var soloTagsRaw   = (data.solo && data.solo.tags)      ? data.solo.tags      : '#Folklore, #Musica, #GuitarreandoALaGorra, #EnVivo, #ArgentinaMusic';

    document.querySelectorAll('[data-bind="solo-desc-label"]').forEach(function (el) {
      el.textContent = soloDescLabel;
    });
    document.querySelectorAll('[data-bind="solo-bio"]').forEach(function (el) {
      el.textContent = soloBio;
    });
    document.querySelectorAll('[data-bind="solo-handle"]').forEach(function (el) {
      el.textContent = soloHandle;
    });
    document.querySelectorAll('[data-bind="solo-role"]').forEach(function (el) {
      el.textContent = hostRole;
    });
    document.querySelectorAll('[data-bind="solo-name"]').forEach(function (el) {
      el.textContent = hostName;
    });

    document.querySelectorAll('[data-bind="solo-tags"]').forEach(function (container) {
      var tagsArray = [];
      if (Array.isArray(soloTagsRaw)) {
        tagsArray = soloTagsRaw;
      } else if (typeof soloTagsRaw === 'string') {
        tagsArray = soloTagsRaw.split(/[\s,]+/).filter(function (t) { return t.trim() !== ''; });
      }
      var tagsHtml = '';
      tagsArray.forEach(function (tag) {
        var cleanTag = tag.trim();
        if (cleanTag) {
          if (!cleanTag.startsWith('#')) cleanTag = '#' + cleanTag;
          tagsHtml += '<span class="desc-tag">' + cleanTag + '</span> ';
        }
      });
      if (tagsHtml !== '') {
        container.innerHTML = tagsHtml;
      }
    });

    // ── 3. MOTTO BANNER (FRASE DESTACADA) ───────────────────────────────────
    var mottoP1 = (data.motto && data.motto.phrase1) ? data.motto.phrase1 : '🎙️ DIFUNDIENDO ARTISTAS POCOS CONOCIDOS';
    var mottoConn = (data.motto && data.motto.connector) ? data.motto.connector : 'Y';
    var mottoP2 = (data.motto && data.motto.phrase2) ? data.motto.phrase2 : 'GUITARREAMOS A LA GORRA 🪕';

    document.querySelectorAll('[data-bind="motto-phrase1"]').forEach(function (el) {
      el.textContent = mottoP1;
    });
    document.querySelectorAll('[data-bind="motto-connector"]').forEach(function (el) {
      el.textContent = mottoConn;
    });
    document.querySelectorAll('[data-bind="motto-phrase2"]').forEach(function (el) {
      el.textContent = mottoP2;
    });

    // ── 4. TICKER CONTENT ───────────────────────────────────────────────────
    if (data.ticker && Array.isArray(data.ticker)) {
      document.querySelectorAll('[data-bind="ticker-content"]').forEach(function (container) {
        var tickerHtml = '';
        data.ticker.forEach(function (item) {
          if (item.text || item.prefix) {
            tickerHtml += (item.prefix ? item.prefix + ' ' : '')
                       + '<span class="highlight">' + (item.text || '') + '</span>'
                       + '<span class="sep">◆</span> ';
          }
        });
        if (tickerHtml !== '') {
          container.innerHTML = tickerHtml;
        }
      });
    }
  }

  function loadData() {
    var localStr = localStorage.getItem('streamData');
    if (localStr) {
      try {
        var localData = JSON.parse(localStr);
        applyData(localData);
      } catch (e) {}
    }

    var fetchUrl = (scriptDir || '') + 'stream-data.json?t=' + Date.now();

    fetch(fetchUrl)
      .then(function (res) {
        if (res.ok) return res.json();
      })
      .then(function (data) {
        if (data) applyData(data);
      })
      .catch(function () {});
  }

  window.addEventListener('storage', function (e) {
    if (e.key === 'streamData' && e.newValue) {
      try {
        applyData(JSON.parse(e.newValue));
      } catch (err) {}
    }
  });

  document.addEventListener('DOMContentLoaded', loadData);
  loadData();
  setInterval(loadData, 2000);

}());
