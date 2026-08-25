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

  var cachedData = null;
  var lastJsonString = '';

  // ── Detectar Invitado Específico por URL o Nombre de Archivo ──
  function getTargetGuestIndex() {
    try {
      var params = new URLSearchParams(window.location.search);
      var gParam = params.get('guest');
      if (gParam === '2' || gParam === 'guest2') return 2;
      if (gParam === '3' || gParam === 'guest3') return 3;
      if (gParam === '1' || gParam === 'guest1') return 1;

      var path = window.location.pathname.toLowerCase();
      // Invitado 2
      if (path.indexOf('ov2') !== -1 || path.indexOf('ovv2') !== -1 || path.indexOf('vv2') !== -1 || path.indexOf('invitado-vertical-2') !== -1 || path.indexOf('invitado-2') !== -1 || path.indexOf('guest-2') !== -1 || path.indexOf('vertical-2') !== -1) return 2;
      // Invitado 3
      if (path.indexOf('ov3') !== -1 || path.indexOf('ovv3') !== -1 || path.indexOf('vv3') !== -1 || path.indexOf('invitado-vertical-3') !== -1 || path.indexOf('invitado-3') !== -1 || path.indexOf('guest-3') !== -1 || path.indexOf('vertical-3') !== -1) return 3;
      // Invitado 1
      if (path.indexOf('ov1') !== -1 || path.indexOf('ovv1') !== -1 || path.indexOf('vv1') !== -1 || path.indexOf('invitado-vertical-1') !== -1 || path.indexOf('invitado-1') !== -1 || path.indexOf('guest-1') !== -1 || path.indexOf('vertical-1') !== -1) return 1;
    } catch (e) {}
    return null;
  }

  function applyData(data) {
    if (!data) return;
    cachedData = data;

    var jsonStr = JSON.stringify(data);
    if (jsonStr === lastJsonString) return;
    lastJsonString = jsonStr;

    // ── 0. SHOW BRANDING (SESIONES RG & SLOGANS) ────────────────────────────
    var showTitle = (data.show && data.show.title) ? data.show.title : 'SESIONES RG';
    var showSlogan = (data.show && data.show.slogan) ? data.show.slogan : 'En Vivo: Entrevistas en vivo y zapadas con invitados.';

    document.querySelectorAll('[data-bind="show-title"]').forEach(function (el) {
      el.textContent = showTitle;
    });
    document.querySelectorAll('[data-bind="show-slogan"]').forEach(function (el) {
      el.textContent = showSlogan;
    });

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

    // ── 2. INVITADO PRINCIPAL (O ESPECÍFICO SEGÚN URL/ARCHIVO) ───────────────
    var targetGuestIdx = getTargetGuestIndex();
    var activeGuest = data.guest || {};
    var defaultRole = '💬 INVITADO ESPECIAL';

    if (targetGuestIdx === 2 && data.guest2) {
      activeGuest = data.guest2;
      defaultRole = '💬 INVITADO 2';
    } else if (targetGuestIdx === 3 && data.guest3) {
      activeGuest = data.guest3;
      defaultRole = '💬 INVITADO 3';
    } else if (targetGuestIdx === 1 && (data.guest1 || data.guest)) {
      activeGuest = data.guest1 || data.guest;
      defaultRole = '💬 INVITADO 1';
    } else if (data.guest1 && data.guest1.name && data.guest1.name.trim() !== '') {
      activeGuest = data.guest1;
    }

    var guestNameRaw = (activeGuest && activeGuest.name) ? activeGuest.name : '';
    var guestRole    = (activeGuest && activeGuest.role) ? activeGuest.role : defaultRole;
    var guestBio     = (activeGuest && activeGuest.bio)  ? activeGuest.bio  : '';
    var guestEvents  = (activeGuest && activeGuest.events) ? activeGuest.events : '';

    var guestEnabled = activeGuest ? (activeGuest.enabled !== false && guestNameRaw.trim() !== '') : false;
    var guestName    = guestEnabled ? guestNameRaw : '';

    document.querySelectorAll('[data-bind="guest-name"]').forEach(function (el) {
      el.textContent = guestName;
    });
    document.querySelectorAll('[data-bind="guest-role"]').forEach(function (el) {
      el.textContent = guestRole;
    });
    document.querySelectorAll('[data-bind="guest-bio"]').forEach(function (el) {
      el.textContent = guestBio;
    });
    document.querySelectorAll('[data-bind="guest-events"]').forEach(function (el) {
      el.textContent = guestEvents;
      el.style.display = (guestEnabled && guestEvents.trim() !== '') ? '' : 'none';
    });
    document.querySelectorAll('[data-bind="guest-box"], [data-bind="guest-container"], [data-guest-box]').forEach(function (el) {
      el.style.display = guestEnabled ? '' : 'none';
    });

    // ── 2b. MÚLTIPLES INVITADOS (GUEST 1, GUEST 2, GUEST 3) ─────────────────
    var g1Name = (data.guest1 && data.guest1.name) ? data.guest1.name : (guestName || 'INVITADO 1');
    var g1Role = (data.guest1 && data.guest1.role) ? data.guest1.role : (guestRole || '💬 INVITADO 1');

    var g2Name = (data.guest2 && data.guest2.name) ? data.guest2.name : 'INVITADO 2';
    var g2Role = (data.guest2 && data.guest2.role) ? data.guest2.role : '💬 INVITADO 2';

    var g3Name = (data.guest3 && data.guest3.name) ? data.guest3.name : 'INVITADO 3';
    var g3Role = (data.guest3 && data.guest3.role) ? data.guest3.role : '💬 INVITADO 3';

    document.querySelectorAll('[data-bind="guest1-name"]').forEach(function (el) { el.textContent = g1Name; });
    document.querySelectorAll('[data-bind="guest1-role"]').forEach(function (el) { el.textContent = g1Role; });

    document.querySelectorAll('[data-bind="guest2-name"]').forEach(function (el) { el.textContent = g2Name; });
    document.querySelectorAll('[data-bind="guest2-role"]').forEach(function (el) { el.textContent = g2Role; });

    document.querySelectorAll('[data-bind="guest3-name"]').forEach(function (el) { el.textContent = g3Name; });
    document.querySelectorAll('[data-bind="guest3-role"]').forEach(function (el) { el.textContent = g3Role; });

    // Redes del invitado activo
    document.querySelectorAll('[data-bind="guest-socials"]').forEach(function (container) {
      if (activeGuest && activeGuest.socials && Array.isArray(activeGuest.socials)) {
        var html = '';
        activeGuest.socials.forEach(function (s) {
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

    // ── 3b. CRONOGRAMA / AGENDA DEL STREAM ──────────────────────────────────
    if (data.agenda && Array.isArray(data.agenda)) {
      data.agenda.forEach(function (item, idx) {
        document.querySelectorAll('[data-bind="agenda-icon-' + idx + '"]').forEach(function (el) {
          if (item.icon !== undefined) el.textContent = item.icon;
        });
        document.querySelectorAll('[data-bind="agenda-title-' + idx + '"]').forEach(function (el) {
          if (item.title !== undefined) el.textContent = item.title;
        });
        document.querySelectorAll('[data-bind="agenda-sub-' + idx + '"]').forEach(function (el) {
          if (item.sub !== undefined) el.textContent = item.sub;
        });
      });
    }

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

  function fetchStreamData() {
    var fetchUrl = (scriptDir || '') + 'stream-data.json?t=' + Date.now();

    fetch(fetchUrl, { cache: 'no-store' })
      .then(function (res) {
        if (res.ok) return res.json();
      })
      .then(function (data) {
        if (data) {
          applyData(data);
          try { localStorage.setItem('streamData', JSON.stringify(data)); } catch (e) {}
        }
      })
      .catch(function () {
        var localStr = localStorage.getItem('streamData');
        if (localStr) {
          try { applyData(JSON.parse(localStr)); } catch (e) {}
        }
      });
  }

  function reapplyData() {
    if (cachedData) {
      lastJsonString = '';
      applyData(cachedData);
    }
  }

  function init() {
    var localStr = localStorage.getItem('streamData');
    if (localStr) {
      try {
        var localData = JSON.parse(localStr);
        applyData(localData);
      } catch (e) {}
    }
    fetchStreamData();
    setInterval(fetchStreamData, 2000);

    // Ciclo de calibración escalonada al arrancar TTLS / OBS
    [50, 150, 300, 600, 1200, 2500].forEach(function (delay) {
      setTimeout(reapplyData, delay);
    });

    if (window.ResizeObserver && document.body) {
      var ro = new ResizeObserver(function () {
        reapplyData();
      });
      ro.observe(document.body);
    }
  }

  window.addEventListener('resize', function () {
    reapplyData();
  });
  window.addEventListener('load', function () {
    reapplyData();
  });

  window.addEventListener('storage', function (e) {
    if (e.key === 'streamData' && e.newValue) {
      try {
        applyData(JSON.parse(e.newValue));
      } catch (err) {}
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
