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
  var stageContainer = document.getElementById('stageContainer');
  var headerName     = document.getElementById('headerHostName');
  var headerRole     = document.getElementById('headerHostRole');
  var participantTxt = document.getElementById('participantCount');

  var hostsBlock     = document.getElementById('hostsBlock');
  var slotHost       = document.getElementById('slotHost');
  var slotHostName   = document.getElementById('slotHostName');
  var slotHostRole   = document.getElementById('slotHostRole');

  var slotCohost     = document.getElementById('slotCohost');
  var slotCohostName = document.getElementById('slotCohostName');
  var slotCohostRole = document.getElementById('slotCohostRole');

  var stageInfoCard  = document.getElementById('stageInfoCard');
  var guestsBlock    = document.getElementById('guestsBlock');

  var slotGuest1     = document.getElementById('slotGuest1');
  var slotGuest1Name = document.getElementById('slotGuest1Name');
  var slotGuest1Role = document.getElementById('slotGuest1Role');

  var slotGuest2     = document.getElementById('slotGuest2');
  var slotGuest2Name = document.getElementById('slotGuest2Name');
  var slotGuest2Role = document.getElementById('slotGuest2Role');

  var slotGuest3     = document.getElementById('slotGuest3');
  var slotGuest3Name = document.getElementById('slotGuest3Name');
  var slotGuest3Role = document.getElementById('slotGuest3Role');

  /* ── Detectar ruta base para stream-data.json ─────── */
  var scriptEl  = document.currentScript || document.querySelector('script[src*="overlay-frames-dinamico-engine"]');
  var scriptDir = '';
  if (scriptEl && scriptEl.src) {
    scriptDir = scriptEl.src.substring(0, scriptEl.src.lastIndexOf('/') + 1);
  }

  /* ── Cachés ────────────────────────────────────────── */
  var lastJson       = '';
  var lastLayout     = '';
  var lastTickerHtml = '';

  /* ── Aplicar datos ────────────────────────────────────── */
  function applyData(data) {
    if (!data) return;

    var jsonStr = JSON.stringify(data);
    if (jsonStr === lastJson) return;
    lastJson = jsonStr;

    /* ── 1. HOST (Siempre presente) ── */
    var hostName = (data.host && data.host.name && data.host.name.trim() !== '') ? data.host.name.trim() : 'GUTA FLORES';
    var hostRole = (data.host && data.host.role && data.host.role.trim() !== '') ? data.host.role.trim() : '🎙️ ANFITRIÓN / HOST';

    if (slotHostName && slotHostName.textContent !== hostName) slotHostName.textContent = hostName;
    if (slotHostRole && slotHostRole.textContent !== hostRole) slotHostRole.textContent = hostRole;

    /* ── 2. CO-HOST ── */
    var cohostEnabled = data.cohost
      && data.cohost.enabled === true
      && data.cohost.name
      && data.cohost.name.trim() !== '';

    var cohostName = cohostEnabled ? data.cohost.name.trim() : '';
    var cohostRole = (data.cohost && data.cohost.role && data.cohost.role.trim() !== '') ? data.cohost.role.trim() : '🎙️ CO-HOST / CO-ANFITRIÓN';

    if (slotCohost) {
      slotCohost.style.display = cohostEnabled ? '' : 'none';
      if (slotCohostName && slotCohostName.textContent !== cohostName) slotCohostName.textContent = cohostName;
      if (slotCohostRole && slotCohostRole.textContent !== cohostRole) slotCohostRole.textContent = cohostRole;
    }

    /* ── 3. INVITADOS (Guest principal o Multi-Guests) ── */
    var guests = [];

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
        if (!g.obj || g.obj.enabled === false || !g.obj.name || g.obj.name.trim() === '') return;
        guests.push({
          name:    g.obj.name.trim(),
          role:    (g.obj.role || g.defaultRole).trim(),
          socials: g.obj.socials || (data.guest ? data.guest.socials : []),
          bio:     g.obj.bio || (data.guest ? data.guest.bio : '')
        });
      });
    } else {
      var guestEnabled = data.guest
        && data.guest.enabled !== false
        && data.guest.name
        && data.guest.name.trim() !== '';

      if (guestEnabled) {
        guests.push({
          name:    data.guest.name.trim(),
          role:    (data.guest.role || '💬 INVITADO ESPECIAL').trim(),
          socials: data.guest.socials || [],
          bio:     data.guest.bio || ''
        });
      }
    }

    /* ── 4. Actualizar Bloque de Invitados ── */
    if (guestsBlock) {
      guestsBlock.style.display = guests.length > 0 ? 'flex' : 'none';
    }

    // Guest 1
    if (slotGuest1) {
      if (guests.length >= 1) {
        slotGuest1.style.display = '';
        if (slotGuest1Name && slotGuest1Name.textContent !== guests[0].name) slotGuest1Name.textContent = guests[0].name;
        if (slotGuest1Role && slotGuest1Role.textContent !== guests[0].role) slotGuest1Role.textContent = guests[0].role;
      } else {
        slotGuest1.style.display = 'none';
      }
    }

    // Guest 2
    if (slotGuest2) {
      if (guests.length >= 2) {
        slotGuest2.style.display = '';
        if (slotGuest2Name && slotGuest2Name.textContent !== guests[1].name) slotGuest2Name.textContent = guests[1].name;
        if (slotGuest2Role && slotGuest2Role.textContent !== guests[1].role) slotGuest2Role.textContent = guests[1].role;
      } else {
        slotGuest2.style.display = 'none';
      }
    }

    // Guest 3
    if (slotGuest3) {
      if (guests.length >= 3) {
        slotGuest3.style.display = '';
        if (slotGuest3Name && slotGuest3Name.textContent !== guests[2].name) slotGuest3Name.textContent = guests[2].name;
        if (slotGuest3Role && slotGuest3Role.textContent !== guests[2].role) slotGuest3Role.textContent = guests[2].role;
      } else {
        slotGuest3.style.display = 'none';
      }
    }

    /* ── 5. Panel de Información / Redes / Agenda (Llenador de Espacio) ── */
    // Se muestra cuando hay exactamente 1 invitado para que no quede ningún hueco vacío
    var showInfoCard = (guests.length === 1);
    if (stageInfoCard) {
      stageInfoCard.style.display = showInfoCard ? 'flex' : 'none';

      if (showInfoCard) {
        var activeGuest = guests[0];
        // Nombre del invitado en el header de la tarjeta
        var infoTitle = stageInfoCard.querySelector('[data-bind="guest-name"]');
        if (infoTitle && infoTitle.textContent !== activeGuest.name) {
          infoTitle.textContent = activeGuest.name;
        }

        // Renderizar redes sociales del invitado
        var socialsContainer = stageInfoCard.querySelector('[data-bind="guest-socials"]');
        if (socialsContainer && activeGuest.socials && Array.isArray(activeGuest.socials)) {
          var socHtml = '';
          activeGuest.socials.forEach(function (s) {
            if (s.handle && s.handle.trim() !== '') {
              socHtml += '<div class="social-item">'
                      +   '<span class="social-icon">' + (s.icon || '📱') + '</span>'
                      +   '<div class="social-text">'
                      +     '<span class="social-platform">' + (s.platform || 'Red Social') + '</span>'
                      +     '<span class="social-handle">' + s.handle + '</span>'
                      +   '</div>'
                      + '</div>';
            }
          });
          if (socialsContainer.innerHTML !== socHtml) {
            socialsContainer.innerHTML = socHtml;
          }
        }

        // Bio
        var bioEl = stageInfoCard.querySelector('[data-bind="guest-bio"]');
        if (bioEl) {
          var bioText = activeGuest.bio || (data.guest ? data.guest.bio : '') || 'Música, folklore y show en vivo.';
          if (bioEl.textContent !== bioText) bioEl.textContent = bioText;
        }
      }
    }

    /* ── 6. Layout Mode y Contador de Participantes ── */
    var totalParticipants = 1 + (cohostEnabled ? 1 : 0) + guests.length;

    var layoutKey = 'solo';
    if (totalParticipants === 1) {
      layoutKey = 'solo';
    } else if (cohostEnabled && guests.length >= 1) {
      layoutKey = 'cohost-guests';
    } else if (guests.length > 0) {
      layoutKey = 'host-guests';
    } else if (cohostEnabled) {
      layoutKey = 'hosts-duo';
    }

    if (layoutKey !== lastLayout) {
      lastLayout = layoutKey;
      if (stageContainer) {
        stageContainer.setAttribute('data-layout', layoutKey);
      }
    }

    if (participantTxt) {
      if (totalParticipants === 1) participantTxt.textContent = 'SOLO';
      else participantTxt.textContent = totalParticipants + ' EN ESCENA';
    }

    /* ── 7. Header ── */
    if (headerName && headerName.textContent !== hostName) headerName.textContent = hostName;
    if (headerRole && headerRole.textContent !== hostRole) headerRole.textContent = hostRole;

    /* ── 8. Motto banner ── */
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

    /* ── 9. Ticker ── */
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
