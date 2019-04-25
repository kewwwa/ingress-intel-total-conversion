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
var setup = (function(window, document, undefined) {
  'use strict';

  var plugin, actions, firstPortal, secondPortal, firstPortalLink,
      secondPortalLink, types = {
        function: 'function',
      },
                        classList = {
                          active: 'active',
                          highlighted: 'highlighted',
                        };

  plugin = function() {};
  if (typeof window.plugin !== types.function) window.plugin = function() {};
  window.plugin.multidraw = plugin;

  return setup;

  function toggleMenu() {
    if (actions.classList.contains(classList.active)) {
      actions.classList.remove(classList.active);
    } else {
      actions.classList.add(classList.active);
    }
  }

  function clear() {
    firstPortal = false;
    secondPortal = false;

    if (firstPortalLink.classList.contains(classList.highlighted)) {
      firstPortalLink.classList.remove(classList.highlighted);
    }

    if (secondPortalLink.classList.contains(classList.highlighted)) {
      secondPortalLink.classList.remove(classList.highlighted);
    }
  }

  function selectFirstPortal() {
    log('First portal selected');

    firstPortal = getPortalSelected();

    if (firstPortal &&
        !firstPortalLink.classList.contains(classList.highlighted)) {
      firstPortalLink.classList.add(classList.highlighted);
    }
  }

  function selectSecondPortal() {
    var latlngs;
    log('Second portal selected');

    secondPortal = getPortalSelected();
    if (!secondPortal) {
      return;
    }
    if (!secondPortalLink.classList.contains(classList.highlighted)) {
      secondPortalLink.classList.add(classList.highlighted);
    }

    draw();
  }

  function selectOtherPortal() {
    var portal;
    log('Other portal selected');

    portal = getPortalSelected();
    if (!portal) return;

    draw(portal);
  }

  function draw(portal) {
    var latlngs;
    let round = (num, accuracy) =>
        Math.round(num * Math.pow(10, accuracy)) / Math.pow(10, accuracy);
    let lleq = (l1, l2) => round(l1.lat, 5) === round(l2.lat, 5) &&
        round(l1.lng, 5) === round(l2.lng, 5);  // are latlngs equal
    let polylineeq = (ll1, ll2) => ll1.length === ll2.length &&
        (ll1.every((_, i) => lleq(ll1[i], ll2[i])) ||
         ll1.slice().reverse().every((_, i) => lleq(ll1[i], ll2[i])))
    // polyline compare. must have the same amount of points and nth point must
    // be equal to nth point of secont polyline or the same but one polyline is
    // reversed

    if (!(firstPortal && secondPortal)) return;

    latlngs = [];
    latlngs.push(firstPortal.ll);
    if (portal) latlngs.push(portal.ll);
    latlngs.push(secondPortal.ll);

    let foundSame = false;
    window.plugin.drawTools.drawnItems.eachLayer(function(layer) {
      if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
        if (foundSame) return;
        foundSame = polylineeq(layer._latlngs, latlngs);
      }
    });
    if (foundSame) return;

    window.map.fire('draw:created', {
      layer: L.geodesicPolyline(latlngs, window.plugin.drawTools.lineOptions),
      layerType: 'polyline'
    });

    if (!window.map.hasLayer(window.plugin.drawTools.drawnItems)) {
      window.map.addLayer(window.plugin.drawTools.drawnItems);
    }
  }

  function getPortalSelected(data) {
    if (!(selectedPortal && portals[selectedPortal])) return;

    return {guid: selectedPortal, ll: portals[selectedPortal].getLatLng()};
  }

  function log(message) {
    // console.log('Multi draw: ' + message);
  }

  function setup() {
    var parent, control, section, toolbar, button, clearLi, firstPortalLi,
        secondPortalLi, otherPortalLi, clearLink, otherPortalLink;

    $('<style>')
        .prop('type', 'text/css')
        .html(
            '.leaflet-draw-actions.active{display: block;}.leaflet-control-multidraw a.leaflet-multidraw-edit-edit {background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCI+Cgk8ZyBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjQ7c3Ryb2tlOm5vbmUiPgoJCTxwYXRoIGQ9Ik0gNiwyNCAyNCwyNCAxNSw2IHoiLz4KCQk8cGF0aCBkPSJNIDYsMjQgMjQsMjQgMTUsMTIgeiIvPgoJCTxwYXRoIGQ9Ik0gNiwyNCAyNCwyNCAxNSwxOCB6Ii8+Cgk8L2c+Cjwvc3ZnPgo=");}')
        .appendTo('head');
    $('<style>')
        .prop('type', 'text/css')
        .html('.multidraw.highlighted{background-color:#008902}')
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
    clearLink.addEventListener('click', clear, false);
    clearLi = document.createElement('li');
    clearLi.appendChild(clearLink);

    firstPortalLink = document.createElement('a');
    firstPortalLink.className = 'multidraw';
    firstPortalLink.innerText = '1';
    firstPortalLink.title = 'Select first portal';
    firstPortalLink.addEventListener('click', selectFirstPortal, false);
    firstPortalLi = document.createElement('li');
    firstPortalLi.appendChild(firstPortalLink);

    secondPortalLink = document.createElement('a');
    secondPortalLink.className = 'multidraw';
    secondPortalLink.innerText = '2';
    secondPortalLink.title = 'Select second portal';
    secondPortalLink.addEventListener('click', selectSecondPortal, false);
    secondPortalLi = document.createElement('li');
    secondPortalLi.appendChild(secondPortalLink);

    otherPortalLink = document.createElement('a');
    otherPortalLink.innerText = 'N';
    otherPortalLink.title = 'Select other portal';
    otherPortalLink.addEventListener('click', selectOtherPortal, false);
    otherPortalLi = document.createElement('li');
    otherPortalLi.appendChild(otherPortalLink);

    actions = document.createElement('ul');
    actions.className = 'leaflet-draw-actions leaflet-draw-actions-top';
    actions.appendChild(clearLi);
    actions.appendChild(firstPortalLi);
    actions.appendChild(secondPortalLi);
    actions.appendChild(otherPortalLi);

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
