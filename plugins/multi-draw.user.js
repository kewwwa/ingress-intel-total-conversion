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

  var plugin, drawTools,
    actions, isAutoMode, portalSelectionPending,
    firstPortal, secondPortal,
    firstMarker, secondMarker,
    clearLink, firstPortalLink, secondPortalLink,
    otherPortalLink, autoModeLink,
    groups = {
      links: undefined,
      markers: undefined
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
  if (typeof window.plugin.multidraw === 'function') {
    console.warn('Multi draw: already there');
    return plugin;
  }

  window.plugin.multidraw = plugin;
  return init;

  function toggleMenu() {
    if (actions.classList.contains(classList.hidden)) {
      actions.classList.remove(classList.hidden);
    } else {
      actions.classList.add(classList.hidden);
    }
  }

  function clear() {
    firstPortal = undefined;
    secondPortal = undefined;
    isAutoMode = false;

    if (firstMarker) {
      groups.markers.removeLayer(firstMarker);
      firstMarker = undefined;
    }
    if (secondMarker) {
      groups.markers.removeLayer(secondMarker);
      secondMarker = undefined;
    }

    updateButtonState(firstPortalLink, misc.firstPortal, false);
    updateButtonState(secondPortalLink, misc.secondPortal, false);

    secondPortalLink.classList.add(classList.hidden);
    otherPortalLink.classList.add(classList.hidden);
    clearLink.classList.add(classList.hidden);
    autoModeLink.classList.add(classList.hidden);
    autoModeLink.classList.remove(classList.active);
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

  function triggerAutoMode() {
    if (!selectedPortal) {
      return;
    }

    actions.classList.remove(classList.hidden);

    if (!firstPortal) {
      selectFirstPortal();
    } else if (!secondPortal) {
      selectSecondPortal();
    } else {
      selectOtherPortal();
    }
  }

  function selectFirstPortal() {
    var portal = getPortalSelected();
    if (!portal) {
      alert('Select a portal to mark.');
      return;
    }
    if (firstPortal && portal.guid === firstPortal.guid || secondPortal && portal.guid === secondPortal.guid) {
      alert('Select another portal to mark.');
      return;
    }

    if (secondPortal) {
      moveDrawnItems(firstPortal, portal, secondPortal);
      firstPortal = portal;
    } else {
      clear();
      firstPortal = portal;
      window.map.fire('draw:edited');

      updateButtonState(firstPortalLink, misc.firstPortal, true);

      clearLink.classList.remove(classList.hidden);
      secondPortalLink.classList.remove(classList.hidden);
    }

    firstMarker = drawMarker(portal, misc.firstPortal.markerColor, firstMarker);
  }

  function selectSecondPortal() {
    var portal = getPortalSelected();
    if (!portal) {
      alert('Select a portal to mark.');
      return;
    }
    if (firstPortal && portal.guid === firstPortal.guid || secondPortal && portal.guid === secondPortal.guid) {
      alert('Select another portal to mark.');
      return;
    }

    if (secondPortal) {
      moveDrawnItems(secondPortal, portal, firstPortal);
      secondPortal = portal;
    } else {
      secondPortal = portal;
      drawLine();

      updateButtonState(secondPortalLink, misc.secondPortal, true);

      otherPortalLink.classList.remove(classList.hidden);
      autoModeLink.classList.remove(classList.hidden);
    }

    secondMarker = drawMarker(portal, misc.secondPortal.markerColor, secondMarker);
  }

  function onPortalSelected(e) {
    if (!selectedPortal || !isAutoMode) { return; }

    if (portalSelectionPending && e && e.selectedPortalGuid !== e.unselectedPortalGuid) {
      clearTimeout(portalSelectionPending);
      portalSelectionPending = undefined;
    }

    if (!portalSelectionPending) {
      selectOtherPortal();

      portalSelectionPending = setTimeout(() => {
        portalSelectionPending = undefined;
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

  function drawMarker(portal, color, existingMarker) {
    var options = {
      icon: drawTools.getMarkerIcon(color),
      zIndexOffset: 2000
    };

    if (existingMarker) {
      groups.markers.removeLayer(existingMarker);
    }

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
        layer: L.geodesicPolyline(latlngs, drawTools.lineOptions),
        layerType: 'polyline'
      });
    }
  }

  function moveDrawnItems(oldPortal, newPortal, otherPortal) {
    groups.links.eachLayer(function (layer) {
      if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
        ll = layer.getLatLngs();
        if (ll[0].lat === oldPortal.ll.lat && ll[0].lng === oldPortal.ll.lng
          && ll[ll.length - 1].lat === otherPortal.ll.lat && ll[ll.length - 1].lng === otherPortal.ll.lng) {
          ll[0].lat = newPortal.ll.lat;
          ll[0].lng = newPortal.ll.lng;
          layer.setLatLngs(ll);
        } else if (ll[ll.length - 1].lat === oldPortal.ll.lat && ll[ll.length - 1].lng === oldPortal.ll.lng
          && ll[0].lat === otherPortal.ll.lat && ll[0].lng === otherPortal.ll.lng) {
          ll[ll.length - 1].lat = newPortal.ll.lat;
          ll[ll.length - 1].lng = newPortal.ll.lng;
          layer.setLatLngs(ll);
        }
      }
    });

    window.map.fire('draw:edited');
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

  function updateButtonState(buttonLink, data, isActive) {
    if (isActive) {
      buttonLink.innerText = data.text.active;
      buttonLink.title = data.tooltip.active;
      buttonLink.classList.add(classList.active);
    } else {
      buttonLink.innerText = data.text.init;
      buttonLink.title = data.tooltip.init;
      buttonLink.classList.remove(classList.active);
    }
  }

  function init() {
    if (plugin.isInit) {
      console.warn('Multi draw: already setup');
    }
    var control, section, toolbar, button, autoModeLi, clearLi,
      firstPortalLi, secondPortalLi, otherPortalLi, accessKeyButton;

    if (!window.plugin.drawTools) {
      dialog({
        title: 'Multi draw',
        html: 'The "<a href="http://iitc.me/desktop/#plugin-draw-tools" target="_BLANK"><strong>Draw Tools</strong></a>" plugin is required.</span>',
      });
    }

    drawTools = window.plugin.drawTools;
    groups.links = drawTools.drawnItems;
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
    button.title = 'Draw multi links [z]';

    toolbar = document.createElement('div');
    toolbar.className = 'leaflet-bar';
    toolbar.appendChild(button);

    clearLink = document.createElement('a');
    clearLink.innerText = 'X';
    clearLink.title = 'Clear selected portals';
    clearLink.className = classList.hidden;
    clearLink.addEventListener('click', clear, false);
    clearLi = document.createElement('li');
    clearLi.appendChild(clearLink);

    firstPortalLink = document.createElement('a');
    updateButtonState(firstPortalLink, misc.firstPortal, false);
    firstPortalLink.addEventListener('click', selectFirstPortal, false);
    firstPortalLi = document.createElement('li');
    firstPortalLi.appendChild(firstPortalLink);

    secondPortalLink = document.createElement('a');
    updateButtonState(secondPortalLink, misc.secondPortal, false);
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

    accessKeyButton = document.createElement('a');
    accessKeyButton.innerText = 'Automatic link [z]';
    accessKeyButton.title = 'Access key button';
    accessKeyButton.className = classList.hidden;
    accessKeyButton.accessKey = 'z';
    accessKeyButton.addEventListener('click', triggerAutoMode, false);

    autoModeLi = document.createElement('li');
    autoModeLi.appendChild(autoModeLink);
    autoModeLi.appendChild(accessKeyButton);

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

    L.Control.Multidraw = L.Control.extend({
      onAdd: function (map) {
        console.debug('Control added');
        return control;
      },
      onRemove: function (map) {
        console.debug('Control removed');
      }
    });

    map.addControl(new L.Control.Multidraw({ position: 'topleft' }));

    plugin.isInit = true;
  }
})(window, document);
// PLUGIN END //////////////////////////////////////////////////////////

//@@PLUGINEND@@
