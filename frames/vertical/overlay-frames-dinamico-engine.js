/**
 * overlay-frames-dinamico-engine.js
 *
 * Motor dinámico del overlay 16:9 con marcos 9:16.
 * Lee el estado del panel (localStorage / stream-data.json) y:
 *  - Determina cuántos participantes están activos
 *  - Ajusta el data-layout del contenedor (1-4)
 *  - Actualiza el contenido de cada slot con nombre y rol
 *  - Actualiza el header, motto y ticker vía data-bind
 */

(function () {
  'use strict';

  /* ── Referencias DOM ─────────────────────────────── */
  var framesRow      = document.getElementById('framesRow');
  var headerName     = document.getElementById('headerHostName');
  var headerRole     = document.getElementById('headerHostRole');
  var participantTxt = document.getElementById('participantCount');

  /* ── Detectar ruta base para stream-data.json ─────── */
  var scriptEl  = document.currentScript || document.querySelector('script[src*="overlay-frames-dinamico-engine"]');
  var scriptDir = '';
  if (scriptEl && scriptEl.src) {
    scriptDir = scriptEl.src.substring(0, scriptEl.src.lastIndexOf('/') + 1);
  }

  /* ── Cachés ────────────────────────────────────────── */
  var lastJson       = '';
  var lastLayout     = 0;
  var lastTickerHtml = '';

  /* ── Etiquetas para el contador ─────────────────────── */
  var LAYOUT_LABELS = {
    1: 'SOLO',
    2: '2 EN ESCENA',
    3: '3 EN ESCENA',
    4: '4 EN ESCENA'
  };

  /* ── Color classes por slot (0 = host) ───────────────── */
  var BORDER_CLASSES = ['fb-host', 'fb-guest1', 'fb-guest2', 'fb-guest3'];
  var TAG_CLASSES    = ['nt-host', 'nt-guest1', 'nt-guest2', 'nt-guest3'];

  /* La posición co-host siempre usa colores de cohost */
  var COHOST_BORDER = 'fb-cohost';
  var COHOST_TAG    = 'nt-cohost';

  /* ── Aplicar datos ────────────────────────────────────── */
  function applyData(data) {
    if (!data) return;

    var jsonStr = JSON.stringify(data);
    if (jsonStr === lastJson) return;
    lastJson = jsonStr;

    /* ── Construir lista de participantes ── */
    var participants = [];

    /* 0. Host — siempre presente */
    var hostName = (data.host && data.host.name && data.host.name.trim() !== '') ? data.host.name.trim() : 'GUTA FLORES';
    var hostRole = (data.host && data.host.role && data.host.role.trim() !== '') ? data.host.role.trim() : '🎙️ ANFITRIÓN / HOST';
    participants.push({ name: hostName, role: hostRole, isCohost: false });

    /* 1. Co-host — si está habilitado y tiene nombre */
    var cohostEnabled = data.cohost
      && data.cohost.enabled === true
      && data.cohost.name
      && data.cohost.name.trim() !== '';

    if (cohostEnabled && participants.length < 4) {
      participants.push({
        name:     data.cohost.name.trim(),
        role:     (data.cohost.role && data.cohost.role.trim() !== '' ? data.cohost.role : '🎙️ CO-HOST / CO-ANFITRIÓN').trim(),
        isCohost: true
      });
    }

    /* 2. Multi-invitados (guest1, guest2, guest3) o Invitado principal */
    var multiGuests = [
      { obj: data.guest1, defaultRole: '💬 INVITADO 1' },
      { obj: data.guest2, defaultRole: '💬 INVITADO 2' },
      { obj: data.guest3, defaultRole: '💬 INVITADO 3' }
    ];

    var hasMultiGuests = multiGuests.some(function (g) {
      return g.obj && g.obj.enabled !== false && g.obj.name && g.obj.name.trim() !== '';
    });

    if (hasMultiGuests) {
      multiGuests.forEach(function (g) {
        if (participants.length >= 4) return;
        if (!g.obj || g.obj.enabled === false || !g.obj.name || g.obj.name.trim() === '') return;
        participants.push({
          name:     g.obj.name.trim(),
          role:     (g.obj.role || g.defaultRole).trim(),
          isCohost: false
        });
      });
    } else {
      /* Invitado principal (guest) */
      var guestEnabled = data.guest
        && data.guest.enabled !== false
        && data.guest.name
        && data.guest.name.trim() !== '';

      if (guestEnabled && participants.length < 4) {
        participants.push({
          name:     data.guest.name.trim(),
          role:     (data.guest.role || '💬 INVITADO ESPECIAL').trim(),
          isCohost: false
        });
      }
    }

    var count = Math.max(1, Math.min(4, participants.length));

    /* ── Actualizar layout ──────────────────────────── */
    if (count !== lastLayout) {
      lastLayout = count;
      if (framesRow) {
        framesRow.setAttribute('data-layout', count);
      }
      if (participantTxt) {
        participantTxt.textContent = LAYOUT_LABELS[count] || (count + ' EN ESCENA');
      }
    }

    /* ── Asignar slot guest color-index ──────────────── */
    var guestColorIdx = 1;

    /* ── Actualizar slots de frames ──────────────────── */
    for (var i = 0; i < 4; i++) {
      var slot       = document.getElementById('slot' + i);
      var roleEl     = document.getElementById('slot' + i + 'Role');
      var nameEl     = document.getElementById('slot' + i + 'Name');
      var borderEl   = slot ? slot.querySelector('.frame-border-anim') : null;
      var nameTagEl  = slot ? slot.querySelector('.name-tag') : null;

      if (!slot) continue;

      if (i < participants.length) {
        var p = participants[i];

        /* Mostrar slot con animación suave solo si estaba oculto */
        if (slot.style.display === 'none') {
          slot.style.display = '';
          slot.classList.add('is-entering');
          setTimeout((function (s) {
            return function () { s.classList.remove('is-entering'); };
          })(slot), 600);
        }

        /* Texto */
        if (roleEl && roleEl.textContent !== p.role) roleEl.textContent = p.role;
        if (nameEl && nameEl.textContent !== p.name) nameEl.textContent = p.name;

        /* Clases de color */
        if (i === 0) {
          if (borderEl && borderEl.className !== 'frame-border-anim fb-host') borderEl.className = 'frame-border-anim fb-host';
          if (nameTagEl && nameTagEl.className !== 'name-tag nt-host') nameTagEl.className = 'name-tag nt-host';
        } else if (p.isCohost) {
          if (borderEl && borderEl.className !== 'frame-border-anim ' + COHOST_BORDER) borderEl.className = 'frame-border-anim ' + COHOST_BORDER;
          if (nameTagEl && nameTagEl.className !== 'name-tag ' + COHOST_TAG) nameTagEl.className = 'name-tag ' + COHOST_TAG;
        } else {
          var gIdx = Math.min(guestColorIdx, 3);
          var expectedBorder = 'frame-border-anim ' + BORDER_CLASSES[gIdx];
          var expectedTag = 'name-tag ' + TAG_CLASSES[gIdx];
          if (borderEl && borderEl.className !== expectedBorder) borderEl.className = expectedBorder;
          if (nameTagEl && nameTagEl.className !== expectedTag) nameTagEl.className = expectedTag;
          guestColorIdx++;
        }

      } else {
        /* Ocultar slot excedente */
        if (slot.style.display !== 'none') {
          slot.style.display = 'none';
        }
      }
    }

    /* ── Header ──────────────────────────────────────── */
    if (headerName && headerName.textContent !== hostName) headerName.textContent = hostName;
    if (headerRole && headerRole.textContent !== hostRole) headerRole.textContent = hostRole;

    /* ── Motto banner ────────────────────────────────── */
    var mottoP1 = (data.motto && typeof data.motto.phrase1 === 'string') ? data.motto.phrase1 : '🎙️ DIFUNDIENDO ARTISTAS POCOS CONOCIDOS';
    var mottoConn = (data.motto && typeof data.motto.connector === 'string') ? data.motto.connector : 'Y';
    var mottoP2 = (data.motto && typeof data.motto.phrase2 === 'string') ? data.motto.phrase2 : 'GUITARREAMOS A LA GORRA 🪕';

    document.querySelectorAll('[data-bind="motto-phrase1"]').forEach(function (el) {
      if (el.textContent !== mottoP1) el.textContent = mottoP1;
    });
    document.querySelectorAll('[data-bind="motto-connector"]').forEach(function (el) {
      if (el.textContent !== mottoConn) el.textContent = mottoConn;
      el.style.display = (mottoP1 || mottoP2) ? '' : 'none';
    });
    document.querySelectorAll('[data-bind="motto-phrase2"]').forEach(function (el) {
      if (el.textContent !== mottoP2) el.textContent = mottoP2;
    });

    /* ── Ticker ──────────────────────────────────────── */
    if (data.ticker && Array.isArray(data.ticker)) {
      var html = '';
      data.ticker.forEach(function (item) {
        if (item.text || item.prefix) {
          html += (item.prefix ? '<span class="highlight">' + item.prefix + '</span> ' : '')
                + (item.text || '')
                + ' <span class="sep">◆</span> ';
        }
      });

      if (html && html !== lastTickerHtml) {
        lastTickerHtml = html;
        var fullHtml = html + html;
        document.querySelectorAll('[data-bind="ticker-content"]').forEach(function (container) {
          container.innerHTML = fullHtml;
          var duration = Math.max(25, Math.min(60, html.length / 8));
          container.style.animationDuration = duration + 's';
        });
      }
    }
  }

  /* ── Resolver URL de stream-data.json ─────────────── */
  function getStreamDataUrl() {
    var ts = Date.now();
    if (window.location.protocol.indexOf('http') === 0) {
      try {
        return new URL('../../stream-data.json?t=' + ts, window.location.href).href;
      } catch (e) {
        return '/stream-data.json?t=' + ts;
      }
    }
    if (scriptDir) {
      return scriptDir + '../../stream-data.json?t=' + ts;
    }
    return '../../stream-data.json?t=' + ts;
  }

  /* ── Fetch autoritativo de datos ──────────────────── */
  function fetchStreamData() {
    var url = getStreamDataUrl();
    fetch(url, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data) {
          applyData(data);
          try {
            localStorage.setItem('streamData', JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch(function () {
        // Fallback local solo si falla el fetch
        var localStr = localStorage.getItem('streamData');
        if (localStr) {
          try { applyData(JSON.parse(localStr)); } catch (e) {}
        }
      });
  }

  /* ── Inicialización ──────────────────────────────── */
  function init() {
    // 1. Carga rápida desde localStorage como valor inicial
    var localStr = localStorage.getItem('streamData');
    if (localStr) {
      try { applyData(JSON.parse(localStr)); } catch (e) {}
    }

    // 2. Carga autoritativa desde stream-data.json
    fetchStreamData();

    // 3. Sondeo periódico (polling) CADA 2 SEGUNDOS solo a stream-data.json
    setInterval(fetchStreamData, 2000);
  }

  /* ── Sincronización instantánea vía storage (mismo origen) */
  window.addEventListener('storage', function (e) {
    if (e.key === 'streamData' && e.newValue) {
      try { applyData(JSON.parse(e.newValue)); } catch (err) {}
    }
  });

  /* ── Arranque ────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
