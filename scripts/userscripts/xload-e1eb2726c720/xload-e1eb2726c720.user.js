// ==UserScript==
// @name         Raumschüsse Fix für CaveRenderPro
// @namespace    https://greasyfork.org/de/users/1246726-andreas-schuller
// @version      2.0
// @description  Berechnet die Richtung der Raumschüsse neu
// @author       Andreas Schuller
// @match        https://www.google.com/*
// @match        https://www.google.de/*
// @match        https://www.google.fr/*
// @match        https://www.google.com/?hl=en*
// @match        https://www.google.com/?hl=de*
// @match        https://www.google.com/?hl=fr*
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/484636/Raumsch%C3%BCsse%20Fix%20f%C3%BCr%20CaveRenderPro.user.js
// @updateURL https://update.greasyfork.org/scripts/484636/Raumsch%C3%BCsse%20Fix%20f%C3%BCr%20CaveRenderPro.meta.js
// ==/UserScript==

var PANEL_TASK = 'xload-e1eb2726c720';
var PANEL_URL = 'https://xload.net/scripts/userscripts/xload-e1eb2726c720/panel.html';

// XLoadPanel —— 面板通信层（脚本侧精简实现，协议与站点 assets/panel/panel.js 对齐）
// 消息格式：{type, data, _from}；请求-响应：{_id, _request}
// 信任模型：跨源仅信任面板页来源 PANEL_ORIGIN；优先使用 open() 返回的窗口引用
(function () {
  'use strict';
  var PREFIX = 'xload-panel:';
  var PANEL_ORIGIN = 'https://xload.net';

  function Channel(taskId) {
    this._id = String(taskId || '');
    this._seq = 0;
    this._handlers = {};
    this._pending = {};
    this._bc = null;
    this._opener = null;
    this._panelWin = null;
    var self = this;
    try {
      if (window.opener && window.opener !== window) this._opener = window.opener;
    } catch (e) { this._opener = null; }
    this._onMsg = function (ev) {
      if (!ev.data || typeof ev.data !== 'object' || !ev.data.type) return;
      if (ev.source === window) return;
      if (ev.source && ev.source !== self._panelWin && ev.source !== self._opener) return;
      if (ev.origin && ev.origin !== PANEL_ORIGIN && ev.origin !== window.location.origin) return;
      if (ev.data._from !== self._id) return;
      self._dispatch(ev.data);
    };
    window.addEventListener('message', this._onMsg);
    try {
      this._bc = new BroadcastChannel(PREFIX + this._id);
      this._bc.onmessage = function (ev) { self._dispatch(ev.data); };
    } catch (e) { this._bc = null; }
  }

  Channel.prototype.attach = function (panelWin) {
    if (panelWin) this._panelWin = panelWin;
    return this;
  };

  Channel.prototype._post = function (msg) {
    if (this._panelWin) { try { this._panelWin.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
    else if (this._opener) { try { this._opener.postMessage(msg, PANEL_ORIGIN); } catch (e) {} }
    if (this._bc) { try { this._bc.postMessage(msg); } catch (e) {} }
  };

  Channel.prototype._dispatch = function (msg) {
    if (!msg || typeof msg.type !== 'string') return;
    if (msg._id != null && Object.prototype.hasOwnProperty.call(this._pending, msg._id)) {
      var p = this._pending[msg._id];
      delete this._pending[msg._id];
      if (p._timer) clearTimeout(p._timer);
      if (msg.error != null) p.reject(new Error(String(msg.error)));
      else p.resolve(msg.data == null ? {} : msg.data);
      return;
    }
    var hs = this._handlers[msg.type];
    if (hs) {
      var data = msg.data == null ? {} : msg.data;
      for (var i = 0; i < hs.length; i++) hs[i](data, msg);
    }
  };

  // 单向发送：type 命令；上报用 progress/done/error
  Channel.prototype.send = function (type, data) {
    this._post({ type: type, data: data == null ? {} : data, _from: this._id });
    return this;
  };

  // 请求-响应：等待面板回包，默认超时 8000ms
  Channel.prototype.request = function (type, data, timeout) {
    var self = this;
    var id = ++this._seq;
    var t = typeof timeout === 'number' && timeout > 0 ? timeout : 8000;
    return new Promise(function (resolve, reject) {
      self._pending[id] = { resolve: resolve, reject: reject };
      self._pending[id]._timer = setTimeout(function () {
        if (self._pending[id]) {
          delete self._pending[id];
          reject(new Error('panel request timeout: ' + type));
        }
      }, t);
      self._post({ type: type, data: data == null ? {} : data, _id: id, _request: true, _from: self._id });
    });
  };

  // 监听面板消息（面板命令 type = action.id）
  Channel.prototype.on = function (type, handler) {
    (this._handlers[type] = this._handlers[type] || []).push(handler);
    return this;
  };

  Channel.prototype.close = function () {
    if (this._onMsg) { try { window.removeEventListener('message', this._onMsg); } catch (e) {} }
    if (this._bc) { try { this._bc.close(); } catch (e) {} }
    var ids = Object.keys(this._pending);
    for (var i = 0; i < ids.length; i++) {
      var p = this._pending[ids[i]];
      if (p._timer) clearTimeout(p._timer);
      p.reject(new Error('panel channel closed'));
    }
    this._pending = {};
    this._handlers = {};
    this._bc = null;
    this._opener = null;
    this._panelWin = null;
  };

  window.XLoadPanel = {
    CHANNEL_PREFIX: PREFIX,
    PANEL_ORIGIN: PANEL_ORIGIN,
    channel: function (taskId) { return new Channel(taskId || ''); },
    // 打开面板页并绑定信任窗口：window.open 不带 noopener，返回的引用即跨源信任源
    open: function (panelUrl, taskId) {
      var win = null;
      try { win = window.open(panelUrl, '_blank'); } catch (e) { win = null; }
      return new Channel(taskId || '').attach(win);
    }
  };
})();

function CRP_Hilfszuege_Fix() {
    'use strict';

    var TEXTS = [
        {
            german: true,
            title: 'CaveRenderPro Raumschüsse',
            onhover: 'Richtung neu berechnen',
            start: 'Neu Berechnen!',
            errorClose: 'Schließen',
            error: 'Fehler! Es scheint, dass CaveRenderPro beim Exportieren der Datei einen Fehler gemacht hat, denn die Datei enthält Messwerte aus mehr als einer Höhle. Bitte eine neue Export-Datei erstellen und nochmal versuchen.',
            successPrefix: 'Erfolg! ',
            successMiddle: ' Messungen in ',
            successSuffix: ' Sekunden (Schließen)'
        },
        {
            german: false,
            title: 'CaveRenderPro splays',
            onhover: 'Recalculate direction',
            start: 'Recalculate!',
            errorClose: 'Close',
            error: 'Error! It seems that CaveRenderPro made a mistake when exporting the file, because the file contains measurements from more than one cave. Please export a new file and try again.',
            successPrefix: 'Success! ',
            successMiddle: ' measurements in ',
            successSuffix: ' seconds (close)'
        }
    ];

    function degreeToRadians(degree) {
        return degree * Math.PI / 180;
    }

    function parseDecimal(value) {
        return Number(String(value).replace(',', '.'));
    }

    function parseLength(value) {
        return Number(String(value).replace(',00', ''));
    }

    function roundToHundredth(value) {
        return Math.round(value * 100) / 100;
    }

    // Azimut auf den Bereich innerhalb von +/-180 Grad normalisieren (identisch zur Original-Logik)
    function normalizeAzimuth(azimuth) {
        return azimuth - 180 >= 0 ? azimuth - 180 : azimuth + 180;
    }

    // Tabellenzeile des CaveRenderPro-Exports in ihre Felder zerlegen
    function parseRow(line) {
        var fields = line.split(/\t/);
        return {
            fields: fields,
            cave: fields[0],
            refGang: fields[1],
            refPunkt: fields[2],
            gang: fields[3],
            punkt: fields[4],
            laenge: parseLength(fields[8]),
            azimut: parseDecimal(fields[9]),
            richtung: parseDecimal(fields[20]),
            refX: parseDecimal(fields[33]),
            refY: parseDecimal(fields[34]),
            refZ: parseDecimal(fields[35]),
            x: parseDecimal(fields[36]),
            y: parseDecimal(fields[37]),
            z: parseDecimal(fields[38])
        };
    }

    // Ein Messzug ist eine Zeile mit Punkt, echter Länge, bekannter Richtung und unterschiedlichem Referenz-/Zielpunkt
    function isMesszug(row) {
        return row.punkt !== '' && row.laenge !== 0 && (row.richtung === 1 || row.richtung === -1)
            && !(row.refGang === row.gang && row.refPunkt === row.punkt);
    }

    function standardFormula(azimuthBefore, azimuthAfter, azimuth) {
        var spalteE = Math.abs(Math.abs(azimuthBefore - azimuth) - 180);
        var spalteG = Math.abs(Math.abs(normalizeAzimuth(azimuthAfter) - azimuth) - 180);
        var spalteK;
        if (spalteE === 0 || spalteG === 0) {
            spalteK = 0;
        } else if (spalteE / spalteG <= 1) {
            spalteK = spalteE / (spalteE + spalteG);
        } else {
            spalteK = spalteG / (spalteE + spalteG);
        }
        if (spalteE < spalteG) {
            return spalteK * Math.cos(degreeToRadians(azimuthAfter - azimuth))
                + (1 - spalteK) * Math.cos(degreeToRadians(azimuthBefore - azimuth));
        }
        return spalteK * Math.cos(degreeToRadians(azimuthBefore - azimuth))
            + (1 - spalteK) * Math.cos(degreeToRadians(azimuthAfter - azimuth));
    }

    function sonderfallFormula(azimuthBefore, azimuthAfter, azimuth, sonderD) {
        var spalteE = roundToHundredth(Math.abs(Math.abs(azimuthBefore - azimuthAfter) - 180));
        var spalteH = roundToHundredth(Math.abs(Math.abs(azimuthBefore - azimuth) - 180));
        var spalteI = roundToHundredth(Math.abs(Math.abs(Math.abs(azimuthAfter - azimuth) - 180) - 180));
        var spalteF = roundToHundredth(180 - spalteH);
        var spalteG = roundToHundredth(180 - spalteI);
        var spalteHplusI = roundToHundredth(spalteH + spalteI);
        var spalteFplusG = roundToHundredth(spalteF + spalteG);
        var spalteJ = spalteHplusI === spalteE && sonderD === -1 ? 1 : (spalteHplusI === spalteE ? -1 : 0);
        var spalteK = spalteFplusG === spalteE && sonderD === -1 ? -1 : (spalteFplusG === spalteE ? 1 : 0);
        var spalteL = 180 - spalteE;
        var spalteM = 180 / spalteL;
        var spalteN = spalteJ === 0 && spalteK === 0 ? spalteM * Math.min(spalteF, spalteG, spalteH, spalteI) : 0;
        var spalteO = Math.cos(degreeToRadians(spalteN));
        var spalteQraw = Math.min(spalteF, spalteG, spalteH, spalteI);
        var spalteQ = spalteF === spalteQraw || spalteG === spalteQraw ? 1 : 0;
        var spalteP;
        if (sonderD === 1 && spalteQ === 1) {
            spalteP = spalteO;
        } else if (sonderD === 1 && spalteQ === 0) {
            spalteP = -spalteO;
        } else if (sonderD === -1 && spalteQ === 1) {
            spalteP = -spalteO;
        } else {
            spalteP = spalteO;
        }
        var spalteR;
        if (spalteJ === 0 && spalteK === 0) {
            var spalteRraw;
            if (sonderD === 1 && spalteQ === 1) {
                spalteRraw = spalteO;
            } else if (sonderD === 1 && spalteQ === 0) {
                spalteRraw = -spalteO;
            } else if (sonderD === -1 && spalteQ === 1) {
                spalteRraw = -spalteO;
            } else {
                spalteRraw = spalteO;
            }
            spalteR = roundToHundredth(spalteRraw);
        } else if (spalteJ === 0) {
            spalteR = spalteK;
        } else {
            spalteR = spalteJ;
        }
        var spalteS = (180 - spalteE) / 90;
        var spalteT = Math.cos(degreeToRadians(Math.min(spalteH, spalteI)));
        var spalteU = sonderD === 1 ? -spalteT : spalteT;
        var spalteVraw = spalteL < 90 ? spalteS * spalteP + (1 - spalteS) * spalteU : spalteP;
        return roundToHundredth(spalteVraw);
    }

    // Verbindungen (Messzüge), die exakt am Referenzpunkt des Raumschusses hängen
    function findTrueConnections(row, onlyStations) {
        var connections = [];
        for (var i = 0; i < onlyStations.length; i++) {
            var station = onlyStations[i];
            var matchesRef = station.refGang === row.refGang && station.refPunkt === row.refPunkt
                && Math.abs(row.refX - station.refX) < 1
                && Math.abs(row.refY - station.refY) < 1
                && Math.abs(row.refZ - station.refZ) < 1;
            var matchesPunkt = station.gang === row.refGang && station.punkt === row.refPunkt
                && Math.abs(row.refX - station.x) < 1
                && Math.abs(row.refY - station.y) < 1
                && Math.abs(row.refZ - station.z) < 1;
            if (matchesRef || matchesPunkt) connections.push(station);
        }
        return connections;
    }

    function differenceToReference(connection, row) {
        var differenz;
        if (connection.refGang === row.refGang && connection.refPunkt === row.refPunkt) {
            differenz = Math.abs(Math.abs(normalizeAzimuth(connection.azimut) - row.azimut) - 180);
        }
        if (connection.gang === row.refGang && connection.punkt === row.refPunkt) {
            differenz = Math.abs(Math.abs(connection.azimut - row.azimut) - 180);
        }
        return differenz;
    }

    function differenceBetween(connection, previous, row) {
        var differenz;
        if (previous.refGang === row.refGang && previous.refPunkt === row.refPunkt) {
            if (connection.refGang === row.refGang && connection.refPunkt === row.refPunkt) {
                differenz = Math.abs(Math.abs(normalizeAzimuth(connection.azimut) - previous.azimut) - 180);
            }
            if (connection.gang === row.refGang && connection.punkt === row.refPunkt) {
                differenz = Math.abs(Math.abs(previous.azimut - connection.azimut) - 180);
            }
        }
        if (previous.gang === row.refGang && previous.punkt === row.refPunkt) {
            if (connection.refGang === row.refGang && connection.refPunkt === row.refPunkt) {
                differenz = Math.abs(Math.abs(previous.azimut - connection.azimut) - 180);
            }
            if (connection.gang === row.refGang && connection.punkt === row.refPunkt) {
                differenz = Math.abs(Math.abs(normalizeAzimuth(connection.azimut) - previous.azimut) - 180);
            }
        }
        return differenz;
    }

    function directionForSingleConnection(row, connection) {
        var immergerade = Math.cos(degreeToRadians(connection.azimut - row.azimut));
        if (connection.richtung === 1) {
            return roundToHundredth(immergerade);
        }
        if (connection.richtung === -1) {
            return -roundToHundredth(immergerade);
        }
        return undefined;
    }

    // Richtung des Raumschusses aus vorherigem und nachfolgendem Messzug ableiten.
    // Die Fallunterscheidung des Originals lässt sich geschlossen darstellen:
    //   vorSign = Richtung des vorherigen Messzugs, nachSign = Richtung des nachfolgenden
    //   d = +1 wenn (vorheriger referenziert den Raumschuss) == (vorSign === -1), sonst -1
    //   gleiche Vorzeichen -> Standardformel (mit d skaliert), sonst Sonderfall-Formel
    function directionForConnectionPair(row, previous, next) {
        var previousIsRef = previous.refGang === row.refGang && previous.refPunkt === row.refPunkt;
        var previousIsPunkt = previous.gang === row.refGang && previous.punkt === row.refPunkt;
        var nextIsRef = next.refGang === row.refGang && next.refPunkt === row.refPunkt;
        var nextIsPunkt = next.gang === row.refGang && next.punkt === row.refPunkt;
        if (!previousIsRef && !previousIsPunkt) return undefined;
        if (!nextIsRef && !nextIsPunkt) return undefined;

        var previousSign = previous.richtung;
        var nextSign = next.richtung;
        if ((previousSign !== 1 && previousSign !== -1) || (nextSign !== 1 && nextSign !== -1)) {
            return undefined;
        }

        var azimuthBefore = previousIsRef ? normalizeAzimuth(previous.azimut) : previous.azimut;
        var azimuthAfter = nextIsRef ? next.azimut : normalizeAzimuth(next.azimut);
        var d = previousIsRef === (previousSign === -1) ? 1 : -1;

        if (previousSign === nextSign) {
            return d * roundToHundredth(standardFormula(azimuthBefore, azimuthAfter, row.azimut));
        }
        return sonderfallFormula(azimuthBefore, azimuthAfter, row.azimut, d);
    }

    function directionForMultipleConnections(row, connections) {
        var differences = connections.map(function (connection) {
            return differenceToReference(connection, row);
        });
        var previous = connections[differences.indexOf(Math.min.apply(null, differences))];

        var candidates = [];
        var differences2 = [];
        for (var i = 0; i < connections.length; i++) {
            if (connections[i] === previous) continue;
            differences2.push(differenceBetween(connections[i], previous, row));
            candidates.push(connections[i]);
        }
        var next = candidates[differences2.indexOf(Math.max.apply(null, differences2))];
        return directionForConnectionPair(row, previous, next);
    }

    // Kernfunktion: kompletten Export neu berechnen.
    // Ergebnis: { error: true } oder { error: false, output, count, seconds }
    function recalculate(text) {
        var startedAt = new Date().getTime();
        var lines = text.split(/\n/);
        var rows = [];
        for (var r = 0; r < lines.length; r++) {
            rows.push(parseRow(lines[r]));
        }

        var caveReference = rows.length > 1 ? rows[1].cave : (rows[0] ? rows[0].cave : '');

        for (var c = 1; c < rows.length; c++) {
            if (caveReference !== rows[c].cave) {
                return { error: true };
            }
        }

        var onlyStations = rows.filter(isMesszug);
        var newDirections = [];

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (row.punkt !== '') continue;

            var connections = findTrueConnections(row, onlyStations);
            var direction;
            if (connections.length === 1) {
                direction = directionForSingleConnection(row, connections[0]);
            } else if (connections.length > 1) {
                direction = directionForMultipleConnections(row, connections);
            }
            newDirections.push(String(direction).replace('.', ','));
        }

        var counter = 0;
        var newLines = [];
        for (var j = 0; j < rows.length; j++) {
            var current = rows[j];
            var fields = current.fields.slice();
            if (current.punkt === '') {
                fields[20] = newDirections[counter];
                counter++;
            }
            newLines.push(fields.join('\t'));
        }

        return {
            error: false,
            output: newLines.join('\n'),
            count: lines.length - 1,
            seconds: (new Date().getTime() - startedAt) / 1000
        };
    }

    function buttonAdd(parent, label, title, style, clickEvent) {
        var elem = document.createElement('button');
        elem.type = 'button';
        elem.style = style;
        elem.style.zIndex = '99';
        elem.style.right = '15px';
        elem.style.background = 'LightGray';
        elem.style.position = 'absolute';
        elem.title = title;
        elem.innerHTML = label;
        parent.appendChild(elem);
        elem.addEventListener('click', clickEvent);
        return elem;
    }

    var body = document.querySelector('body');
    if (!body) return;

    var isGerman = window.location.href.indexOf('https://www.google.de/') !== -1
        || window.location.href.indexOf('https://www.google.com/?hl=de') !== -1;
    var texts = isGerman ? TEXTS[0] : TEXTS[1];

    var searchText = document.createElement('textarea');
    searchText.style = 'position: absolute; display: none; top:100px; right: 0px; width: 100%; height: 500px; z-index: 99;';
    var resultText = document.createElement('textarea');
    resultText.style = 'position: absolute; display: none; top:100px; right: 0px; width: 100%; height: 500px; z-index: 99;';
    body.appendChild(searchText);
    body.appendChild(resultText);

    function renderResult(result) {
        if (result.error) {
            resultText.value = texts.error;
            searchButton.innerHTML = texts.errorClose;
            return result;
        }
        resultText.value = result.output;
        searchButton.innerHTML = texts.successPrefix + result.count + texts.successMiddle
            + result.seconds + texts.successSuffix;
        return result;
    }

    function runRecalculation(input) {
        return renderResult(recalculate(input));
    }

    var searchButton = buttonAdd(body, texts.title, texts.onhover, 'top:70px; right: 0px', function () {
        if (searchText.style.display === 'none' && resultText.style.display === 'none') {
            searchText.style.display = 'inline-block';
            searchButton.innerHTML = texts.start;
        } else if (searchText.style.display !== 'none' && resultText.style.display === 'none') {
            searchText.style.display = 'none';
            resultText.style.display = 'inline-block';
        } else if (searchText.style.display === 'none' && resultText.style.display !== 'none') {
            resultText.style.display = 'none';
            resultText.innerHTML = '';
            searchText.innerHTML = '';
            searchText.value = '';
            resultText.value = '';
            searchButton.innerHTML = texts.title;
        }
    });

    searchText.addEventListener('change', function () {
        var input = searchText.value.trim();
        if (input === '') return;
        runRecalculation(input);
    });

    function setupPanel() {
        if (!window.XLoadPanel || typeof window.XLoadPanel.open !== 'function') return null;

        var channel;
        try {
            channel = window.XLoadPanel.open(PANEL_URL, PANEL_TASK);
        } catch (e) {
            return null;
        }
        if (!channel) return null;

        channel.send('hello', {});

        channel.on('recalculate', function (data) {
            channel.send('progress', {});
            try {
                var input = data && typeof data.input === 'string' && data.input !== ''
                    ? data.input
                    : searchText.value;
                input = input.trim();
                if (input === '') {
                    channel.send('error', { message: texts.error });
                    return;
                }
                searchText.value = input;
                var result = runRecalculation(input);
                if (result.error) {
                    channel.send('error', { message: texts.error });
                    return;
                }
                channel.send('done', {
                    output: result.output,
                    count: result.count,
                    seconds: result.seconds
                });
            } catch (e) {
                channel.send('error', { message: String(e && e.message ? e.message : e) });
            }
        });

        channel.on('clear', function () {
            searchText.value = '';
            resultText.value = '';
            searchButton.innerHTML = texts.title;
            channel.send('done', { output: '', count: 0, seconds: 0 });
        });

        return channel;
    }

    setupPanel();
}

CRP_Hilfszuege_Fix();
