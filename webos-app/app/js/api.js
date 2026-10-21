/*
 * Small XHR client for the Genkit server's JSON API.
 * XHR (not fetch) keeps it working on older webOS TVs.
 */
var Api = (function () {
  'use strict';

  function normalizeBase(url) {
    url = (url || '').replace(/^\s+|\s+$/g, '');
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
    return url.replace(/\/+$/, '');
  }

  function request(method, base, path, body, callback) {
    var baseUrl = normalizeBase(base);
    if (!baseUrl) {
      callback({ message: 'Nie ustawiono adresu serwera.' });
      return null;
    }

    var xhr = new XMLHttpRequest();
    var done = false;

    function finish(error, data) {
      if (done) return;
      done = true;
      callback(error, data);
    }

    xhr.open(method, baseUrl + path, true);
    xhr.timeout = APP_CONFIG.requestTimeoutMs;
    if (body) xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function () {
      var data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) { /* not JSON */ }

      if (xhr.status >= 200 && xhr.status < 300 && data) {
        finish(null, data);
      } else {
        finish({
          status: xhr.status,
          message: (data && data.error) || ('Serwer odpowiedział kodem ' + xhr.status + '.')
        });
      }
    };
    xhr.onerror = function () {
      finish({ status: 0, message: 'Brak połączenia z serwerem ' + baseUrl + '.' });
    };
    xhr.ontimeout = function () {
      finish({ status: 0, message: 'Serwer nie odpowiedział na czas.' });
    };

    xhr.send(body ? JSON.stringify(body) : null);
    return xhr;
  }

  return {
    normalizeBase: normalizeBase,

    status: function (base, callback) {
      return request('GET', base, '/api/status', null, callback);
    },

    // messages: [{ role: 'user' | 'model', text: string }]
    chat: function (base, messages, callback) {
      return request('POST', base, '/api/chat', { messages: messages }, callback);
    }
  };
})();
