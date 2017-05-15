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

@@PLUGINSTART@@

// PLUGIN START ////////////////////////////////////////////////////////
var setup = (function (window, document, undefined) {
    'use strict';

    var plugin, actions,
        firstPortal, secondPortal,
        types = {
            function: 'function',
        },
        classList = {
            active: 'active',
        };

    plugin = function () { };
    if (typeof window.plugin !== types.function) window.plugin = function () { };
    window.plugin.multidraw = plugin;

    return setup;

    function toggleMenu() {
        if (actions.classList.contains(classList.active)) {
            actions.classList.remove(classList.active);
        }
        else {
            actions.classList.add(classList.active);
        }
    }

    function selectFirstPortal() {
        log('First portal selected');
        toggleMenu();

        firstPortal = getPortalSelected();
    }

    function selectSecondPortal() {
        var latlngs;
        log('Second portal selected');
        toggleMenu();

        secondPortal = getPortalSelected();
        if (!secondPortal) return;

        draw();
    }

    function selectOtherPortal() {
        var portal;
        log('Other portal selected');
        toggleMenu();

        portal = getPortalSelected();
        if (!portal) return;

        draw(portal);
    }

    function draw(portal) {
        var latlngs;

        if (!(firstPortal && secondPortal)) return;

        latlngs = [];
        latlngs.push(firstPortal.ll);
        if (portal) latlngs.push(portal.ll);
        latlngs.push(secondPortal.ll);

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

        return {
            guid: selectedPortal,
            ll: portals[selectedPortal].getLatLng()
        };
    }

    function log(message) {
        console.log('Multi draw: ' + message);
    }

    function setup() {
        var parent, control, section, toolbar,
            button,
            firstPortal, secondPortal, otherPortal,
            firstPortalLink, secondPortalLink, otherPortalLink;

        $('<style>').prop('type', 'text/css')
            .html('.leaflet-draw-actions.active{display: block;}.leaflet-control-multidraw a.leaflet-multidraw-edit-edit {background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCI+Cgk8ZyBzdHlsZT0iZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eTowLjQ7c3Ryb2tlOm5vbmUiPgoJCTxwYXRoIGQ9Ik0gNiwyNCAyNCwyNCAxNSw2IHoiLz4KCQk8cGF0aCBkPSJNIDYsMjQgMjQsMjQgMTUsMTIgeiIvPgoJCTxwYXRoIGQ9Ik0gNiwyNCAyNCwyNCAxNSwxOCB6Ii8+Cgk8L2c+Cjwvc3ZnPgo=");}')
            .appendTo('head');

        button = document.createElement("a");
        button.className = "leaflet-multidraw-edit-edit";
        button.addEventListener("click", toggleMenu, false);
        button.title = 'Draw multi links';

        toolbar = document.createElement("div");
        toolbar.className = "leaflet-draw-toolbar leaflet-bar";
        toolbar.appendChild(button);

        firstPortalLink = document.createElement("a");
        firstPortalLink.innerText = "1";
        firstPortalLink.title = 'Select first portal';
        firstPortalLink.addEventListener("click", selectFirstPortal, false);
        firstPortal = document.createElement("li");
        firstPortal.appendChild(firstPortalLink);

        secondPortalLink = document.createElement("a");
        secondPortalLink.innerText = "2";
        secondPortalLink.title = 'Select second portal';
        secondPortalLink.addEventListener("click", selectSecondPortal, false);
        secondPortal = document.createElement("li");
        secondPortal.appendChild(secondPortalLink);

        otherPortalLink = document.createElement("a");
        otherPortalLink.innerText = "N";
        otherPortalLink.title = 'Select other portal';
        otherPortalLink.addEventListener("click", selectOtherPortal, false);
        otherPortal = document.createElement("li");
        otherPortal.appendChild(otherPortalLink);

        actions = document.createElement("ul");
        actions.className = "leaflet-draw-actions leaflet-draw-actions-top";
        actions.appendChild(firstPortal);
        actions.appendChild(secondPortal);
        actions.appendChild(otherPortal);

        section = document.createElement("div");
        section.className = "leaflet-draw-section";
        section.appendChild(toolbar);
        section.appendChild(actions);

        control = document.createElement("div");
        control.className = "leaflet-control-multidraw leaflet-draw leaflet-control";
        control.appendChild(section);

        parent = $(".leaflet-top.leaflet-left", window.map.getContainer());
        parent.append(control);
    }
})(window, document);
// PLUGIN END //////////////////////////////////////////////////////////

@@PLUGINEND@@