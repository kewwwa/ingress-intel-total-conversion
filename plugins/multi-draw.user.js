// ==UserScript==
// @id             iitc-plugin-multidraw@kewwwa
// @name           IITC plugin: Multi draw
// @category       Layer
// @version        0.1.@@DATETIMEVERSION@@
// @namespace      https://github.com/kewwwa/iitc-plugin-multidraw
// @updateURL      @@UPDATEURL@@
// @downloadURL    @@DOWNLOADURL@@
// @description    [@@BUILDNAME@@-@@BUILDDATE@@] Draw multiple links
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==

//@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////
var setup = (function (window, document, undefined) {
  'use strict';

  var plugin, actions, isAutoMode, portalSelectionPending, firstPortal, secondPortal,
    firstMarker, secondMarker,
    clearLink, firstPortalLink, secondPortalLink,
    otherPortalLink, autoModeLink,
    groups = {
      links: null,
      markers: null
    },
    classList = { active: 'active', hidden: 'hidden' },
    misc = {
      firstPortal: {
        markerColor: '#fb8500',
        text: { init: 'Select portal base A', active: 'A' },
        tooltip: { init: 'Click to mark selected portal', active: 'Reset portal base A' }
      },
      secondPortal: {
        markerColor: '#9400fc',
        text: { init: 'Select portal base B', active: 'B' },
        tooltip: { init: 'Click to mark selected portal', active: 'Reset portal base B' }
      }
    };

  plugin = function () { };
  if (typeof window.plugin !== 'function') window.plugin = function () { };
  window.plugin.multidraw = plugin;

  return setup;

  function toggleMenu() {
    if (actions.classList.contains(classList.hidden)) {
      actions.classList.remove(classList.hidden);
    } else {
      actions.classList.add(classList.hidden);
    }
  }

  function clear() {
    firstPortal = false;
    secondPortal = false;
    isAutoMode = false;

    if (firstMarker) {
      groups.markers.removeLayer(firstMarker);
      firstMarker = null;
    }
    if (secondMarker) {
      groups.markers.removeLayer(secondMarker);
      secondMarker = null;
    }

    firstPortalLink.innerText = misc.firstPortal.text.init;
    firstPortalLink.title = misc.firstPortal.tooltip.init;
    firstPortalLink.classList.remove(classList.active);

    secondPortalLink.innerText = misc.secondPortal.text.init;
    secondPortalLink.title = misc.secondPortal.tooltip.init;
    secondPortalLink.classList.remove(classList.active);
    secondPortalLink.classList.add(classList.hidden);

    autoModeLink.classList.remove(classList.active);
    autoModeLink.classList.add(classList.hidden);

    otherPortalLink.classList.add(classList.hidden);
    clearLink.classList.add(classList.hidden);
  }

  function toggleAutoMode() {
    isAutoMode = !isAutoMode;
    if (isAutoMode) {
      autoModeLink.classList.add(classList.active);
    } else {
      autoModeLink.classList.remove(classList.active);
      toggleMenu();
    }
  }

  function selectFirstPortal() {
    var portal = getPortalSelected();
    if (!portal) {
      alert('Select a portal to mark.');
      return;
    }

    clear();

    firstPortal = portal;
    firstMarker = drawMarker(firstPortal, misc.firstPortal.markerColor);

    firstPortalLink.innerText = misc.firstPortal.text.active;
    firstPortalLink.title = misc.firstPortal.tooltip.active;
    firstPortalLink.classList.add(classList.active);

    clearLink.classList.remove(classList.hidden);
    secondPortalLink.classList.remove(classList.hidden);
  }

  function selectSecondPortal() {
    secondPortal = getPortalSelected();
    if (!secondPortal) {
      alert('Select a portal to mark.');
      return;
    }
    if (secondPortal.guid === firstPortal.guid) {
      alert('Select another portal to mark.');
      return;
    }

    secondPortalLink.innerText = misc.secondPortal.text.active;
    secondPortalLink.title = misc.secondPortal.tooltip.active;
    secondPortalLink.classList.add(classList.active);

    otherPortalLink.classList.remove(classList.hidden);
    autoModeLink.classList.remove(classList.hidden);

    if (secondMarker) {
      groups.markers.removeLayer(secondMarker);
    }
    secondMarker = drawMarker(secondPortal, misc.secondPortal.markerColor);
    drawLine();
  }

  function onPortalSelected(e) {
    if (!selectedPortal || !isAutoMode) { return; }

    if (portalSelectionPending && e && e.selectedPortalGuid !== e.unselectedPortalGuid) {
      clearTimeout(portalSelectionPending);
      portalSelectionPending = null;
    }

    if (!portalSelectionPending) {
      selectOtherPortal();

      portalSelectionPending = setTimeout(() => {
        portalSelectionPending = null;
      }, 500);
    }
  }

  function selectOtherPortal() {
    var portal = getPortalSelected();
    if (!portal) {
      alert('Select a portal to mark.');
      return;
    }
    if (portal.guid === firstPortal.guid || portal.guid === secondPortal.guid) {
      alert('Select another portal to mark.');
      return;
    }

    drawLine(portal);
  }

  function drawMarker(portal, color) {
    var options = {
      icon: window.plugin.drawTools.getMarkerIcon(color),
      zIndexOffset: 2000
    };

    var marker = L.marker(portal.ll, options);
    marker.on('click', function () { renderPortalDetails(portal.guid); });
    marker.on('spiderfiedclick', function () { renderPortalDetails(portal.guid); });

    window.registerMarkerForOMS(marker);
    groups.markers.addLayer(marker);

    return marker;
  }

  function drawLine(portal) {
    var latlngs = [];

    if (!firstPortal || !secondPortal) {
      return;
    }

    latlngs.push(firstPortal.ll);
    if (portal) { latlngs.push(portal.ll); }
    latlngs.push(secondPortal.ll);

    var existingLine;
    if (portal) {
      existingLine = deleteExistingLine(latlngs);
    } else {
      existingLine = findPolyline(latlngs);
    }

    if (!existingLine) {
      window.map.fire('draw:created', {
        layer: L.geodesicPolyline(latlngs, window.plugin.drawTools.lineOptions),
        layerType: 'polyline'
      });
    }
  }

  function deleteExistingLine(latlngs) {
    var line = findPolyline(latlngs);
    if (line) {
      groups.links.removeLayer(line);
      window.map.fire('draw:deleted');
    }

    return line;
  }

  function findPolyline(latlngs) {
    var matchLine, isMatch, ll, index;

    groups.links.eachLayer(function (layer) {
      if (!matchLine && (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline)) {
        ll = layer.getLatLngs();

        if (latlngs.length === ll.length) {
          isMatch = true;
          index = latlngs.length;

          while (--index >= 0 && isMatch) {
            isMatch = latlngs[index].lat === ll[index].lat
              && latlngs[index].lng === ll[index].lng;
          }

          if (isMatch) {
            matchLine = layer;
          } else {
            isMatch = true;
            index = latlngs.length;

            while (--index >= 0 && isMatch) {
              isMatch = latlngs[latlngs.length - 1 - index].lat === ll[index].lat
                && latlngs[latlngs.length - 1 - index].lng === ll[index].lng;
            }

            if (isMatch) {
              matchLine = layer;
            }
          }
        }
      }
    });

    return matchLine;
  }

  function getPortalSelected() {
    if (selectedPortal) {
      return getPortalData(portals[selectedPortal]);
    }
  }

  function getPortalData(portal) {
    if (portal) {
      return { guid: portal.options.guid, ll: portal.getLatLng() };
    }
  }

  function setup() {
    var parent, control, section, toolbar, button, autoModeLi, clearLi,
      firstPortalLi, secondPortalLi, otherPortalLi;

    if (!window.plugin.drawTools) {
      dialog({
        title: 'Multi draw',
        html: 'The "<a href="http://iitc.me/desktop/#plugin-draw-tools" target="_BLANK"><strong>Draw Tools</strong></a>" plugin is required.</span>',
      });
    }

    groups.links = window.plugin.drawTools.drawnItems;
    groups.markers = new L.FeatureGroup();
    window.addLayerGroup('Multi draw', groups.markers, true);

    window.addHook('portalSelected', onPortalSelected);

    $('<style>')
      .prop('type', 'text/css')
      .html('@@INCLUDESTRING:plugins/multi-draw.css@@')
      .appendTo('head');

    button = document.createElement('a');
    button.className = 'leaflet-multidraw-edit-edit';
    button.addEventListener('click', toggleMenu, false);
    button.title = 'Draw multi links';

    toolbar = document.createElement('div');
    toolbar.className = 'leaflet-draw-toolbar leaflet-bar';
    toolbar.appendChild(button);

    clearLink = document.createElement('a');
    clearLink.innerText = 'X';
    clearLink.title = 'Clear selected portals';
    clearLink.className = classList.hidden;
    clearLink.addEventListener('click', clear, false);
    clearLi = document.createElement('li');
    clearLi.appendChild(clearLink);

    firstPortalLink = document.createElement('a');
    firstPortalLink.innerText = misc.firstPortal.text.init;
    firstPortalLink.title = misc.firstPortal.tooltip.init;
    firstPortalLink.addEventListener('click', selectFirstPortal, false);
    firstPortalLi = document.createElement('li');
    firstPortalLi.appendChild(firstPortalLink);

    secondPortalLink = document.createElement('a');
    secondPortalLink.innerText = misc.secondPortal.text.init;
    secondPortalLink.title = misc.secondPortal.tooltip.init;
    secondPortalLink.className = classList.hidden;
    secondPortalLink.addEventListener('click', selectSecondPortal, false);
    secondPortalLi = document.createElement('li');
    secondPortalLi.appendChild(secondPortalLink);

    otherPortalLink = document.createElement('a');
    otherPortalLink.innerText = '+1';
    otherPortalLink.title = 'Add field on selected portal';
    otherPortalLink.className = classList.hidden;
    otherPortalLink.addEventListener('click', selectOtherPortal, false);
    otherPortalLi = document.createElement('li');
    otherPortalLi.appendChild(otherPortalLink);

    autoModeLink = document.createElement('a');
    autoModeLink.innerText = 'Auto';
    autoModeLink.title = 'Add field on each portal selection';
    autoModeLink.className = classList.hidden;
    autoModeLink.addEventListener('click', toggleAutoMode, false);
    autoModeLi = document.createElement('li');
    autoModeLi.appendChild(autoModeLink);

    actions = document.createElement('ul');
    actions.className = 'leaflet-draw-actions ' + classList.hidden;
    actions.appendChild(clearLi);
    actions.appendChild(firstPortalLi);
    actions.appendChild(secondPortalLi);
    actions.appendChild(otherPortalLi);
    actions.appendChild(autoModeLi);

    section = document.createElement('div');
    section.className = 'leaflet-draw-section';
    section.appendChild(toolbar);
    section.appendChild(actions);

    control = document.createElement('div');
    control.className =
      'leaflet-control-multidraw leaflet-draw leaflet-control';
    control.appendChild(section);

    parent = $('.leaflet-top.leaflet-left', window.map.getContainer());
    parent.append(control);
  }
})(window, document);
// PLUGIN END //////////////////////////////////////////////////////////

//@@PLUGINEND@@
