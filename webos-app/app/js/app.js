/*
 * Asystent AI – LG webOS TV app.
 * Chat client for the Genkit server in ../../my-genkit-app (POST /api/chat).
 */
(function () {
  'use strict';

  var KEY = {
    ENTER: 13,
    ESC: 27, // browser preview stand-in for Back
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    BACK: 461,
    RED: 403,
    GREEN: 404
  };

  var DIRECTIONS = {};
  DIRECTIONS[KEY.LEFT] = 'left';
  DIRECTIONS[KEY.UP] = 'up';
  DIRECTIONS[KEY.RIGHT] = 'right';
  DIRECTIONS[KEY.DOWN] = 'down';

  var SUGGESTIONS = [
    'Opowiedz mi krótki dowcip',
    'Co obejrzeć dziś wieczorem?',
    'Szybki przepis na kolację',
    'Podaj ciekawostkę na dziś',
    'Wymyśl grę słowną dla rodziny'
  ];

  var SCROLL_STEP = 240;
  var STORAGE_KEY = 'aiassistant.serverUrl';

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    status: $('status'),
    statusText: $('status-text'),
    log: $('chat-log'),
    promptField: $('prompt-field'),
    promptInput: $('prompt-input'),
    sendBtn: $('send-btn'),
    clearBtn: $('clear-btn'),
    settingsBtn: $('settings-btn'),
    suggestions: $('suggestions'),
    settings: $('settings'),
    serverField: $('server-field'),
    serverInput: $('server-input'),
    testResult: $('test-result'),
    testBtn: $('test-btn'),
    saveBtn: $('save-btn'),
    cancelBtn: $('cancel-btn'),
    exitDialog: $('exit-dialog'),
    exitYes: $('exit-yes'),
    exitNo: $('exit-no')
  };

  var state = {
    serverUrl: loadServerUrl(),
    history: [], // [{ role: 'user' | 'model', text }]
    pending: null, // in-flight XHR
    typingEl: null,
    editing: null // field wrapper whose <input> is being edited
  };

  // ---------- Storage ----------

  function loadServerUrl() {
    var saved = null;
    try {
      saved = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) { /* storage unavailable */ }
    return Api.normalizeBase(saved || APP_CONFIG.defaultServerUrl);
  }

  function saveServerUrl(url) {
    try {
      window.localStorage.setItem(STORAGE_KEY, url);
    } catch (e) { /* storage unavailable */ }
  }

  // ---------- Status pill ----------

  function setStatus(kind, text) {
    els.status.className = 'status ' + kind;
    els.statusText.textContent = text;
  }

  function checkStatus() {
    if (!state.serverUrl) {
      setStatus('warn', 'Ustaw adres serwera');
      return;
    }
    setStatus('', 'Łączenie…');
    Api.status(state.serverUrl, function (err, data) {
      if (err) {
        setStatus('error', 'Brak połączenia');
      } else if (!data.hasGoogleApiKey) {
        setStatus('warn', 'Serwer bez klucza API');
      } else {
        setStatus('ok', 'Połączono · ' + data.model);
      }
    });
  }

  // ---------- Chat log ----------

  function scrollToBottom() {
    els.log.scrollTop = els.log.scrollHeight;
  }

  function addMessage(kind, text) {
    var el = document.createElement('div');
    el.className = 'msg msg-' + kind;

    var author = { user: 'Ty', model: 'Asystent' }[kind];
    if (author) {
      var label = document.createElement('span');
      label.className = 'msg-author';
      label.textContent = author;
      el.appendChild(label);
    }
    el.appendChild(document.createTextNode(text));

    els.log.appendChild(el);
    scrollToBottom();
    return el;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'msg msg-model';
    el.innerHTML = '<span class="msg-author">Asystent</span>' +
      '<span class="typing"><span></span><span></span><span></span></span>';
    els.log.appendChild(el);
    state.typingEl = el;
    scrollToBottom();
  }

  function hideTyping() {
    if (state.typingEl && state.typingEl.parentNode) {
      state.typingEl.parentNode.removeChild(state.typingEl);
    }
    state.typingEl = null;
  }

  function showWelcome() {
    addMessage('system',
      'Cześć! Jestem asystentem AI na Twoim telewizorze.\n' +
      'Wybierz szybkie pytanie po prawej albo przejdź do pola tekstowego, ' +
      'naciśnij OK i wpisz własne pytanie.');
  }

  function clearChat() {
    if (state.pending) {
      state.pending.abort();
      state.pending = null;
    }
    hideTyping();
    state.history = [];
    els.log.innerHTML = '';
    showWelcome();
  }

  function send(text) {
    text = (text || '').replace(/^\s+|\s+$/g, '');
    if (!text || state.pending) return;

    if (!state.serverUrl) {
      addMessage('error', 'Najpierw ustaw adres serwera Genkit.');
      openSettings();
      return;
    }

    state.history.push({ role: 'user', text: text });
    addMessage('user', text);
    els.promptInput.value = '';
    showTyping();

    state.pending = Api.chat(state.serverUrl, state.history, function (err, data) {
      state.pending = null;
      hideTyping();

      if (err) {
        // Drop the unanswered question so the history stays user/model/user...
        state.history.pop();
        addMessage('error', err.message + '\nSprawdź adres serwera w Ustawieniach (zielony przycisk).');
        setStatus('error', 'Brak połączenia');
        return;
      }

      var reply = data.reply || '(pusta odpowiedź)';
      state.history.push({ role: 'model', text: reply });
      addMessage('model', reply);
      setStatus('ok', 'Połączono · ' + data.model);
    });
  }

  // ---------- Text fields ----------
  // Fields are navigated as a wrapper; OK starts editing, which focuses the
  // real <input> and opens the webOS on-screen keyboard.

  function inputOf(field) {
    return $(field.getAttribute('data-input'));
  }

  function startEditing(field) {
    Nav.focus(field, true);
    state.editing = field;
    field.classList.add('editing');
    var input = inputOf(field);
    input.focus();
    var end = input.value.length;
    try {
      input.setSelectionRange(end, end);
    } catch (e) { /* type=url does not support selection */ }
  }

  function stopEditing() {
    var field = state.editing;
    if (!field) return;
    state.editing = null;
    field.classList.remove('editing');
    inputOf(field).blur();
    // Put DOM focus back on the wrapper so key events keep flowing.
    try {
      field.focus();
    } catch (e) { /* ignore */ }
  }

  function bindField(field, onSubmit) {
    var input = inputOf(field);

    field.addEventListener('click', function () {
      if (state.editing !== field) startEditing(field);
    });
    input.addEventListener('focus', function () {
      if (state.editing !== field) {
        state.editing = field;
        field.classList.add('editing');
        Nav.focus(field, true);
      }
    });
    input.addEventListener('blur', function () {
      if (state.editing === field) {
        state.editing = null;
        field.classList.remove('editing');
      }
    });
    field._submit = onSubmit;
  }

  // ---------- Dialogs ----------

  function isOpen(el) {
    return !el.classList.contains('hidden');
  }

  function openSettings() {
    if (isOpen(els.settings)) return;
    stopEditing();
    els.serverInput.value = state.serverUrl;
    els.testResult.textContent = '';
    els.testResult.className = 'test-result';
    els.settings.classList.remove('hidden');
    Nav.pushScope(els.settings, els.serverField);
  }

  function closeSettings() {
    stopEditing();
    els.settings.classList.add('hidden');
    Nav.popScope();
  }

  function saveSettings() {
    state.serverUrl = Api.normalizeBase(els.serverInput.value);
    saveServerUrl(state.serverUrl);
    closeSettings();
    checkStatus();
  }

  function testConnection() {
    var url = Api.normalizeBase(els.serverInput.value);
    els.testResult.className = 'test-result';
    els.testResult.textContent = 'Łączenie z ' + (url || '…') + '…';
    Api.status(url, function (err, data) {
      if (err) {
        els.testResult.className = 'test-result error';
        els.testResult.textContent = err.message;
      } else if (!data.hasGoogleApiKey) {
        els.testResult.className = 'test-result error';
        els.testResult.textContent = 'Serwer działa, ale nie ma ustawionego GOOGLE_API_KEY.';
      } else {
        els.testResult.className = 'test-result ok';
        els.testResult.textContent = 'Działa! Model: ' + data.model;
      }
    });
  }

  function openExitDialog() {
    els.exitDialog.classList.remove('hidden');
    Nav.pushScope(els.exitDialog, els.exitYes);
  }

  function closeExitDialog() {
    els.exitDialog.classList.add('hidden');
    Nav.popScope();
  }

  function exitApp() {
    if (window.webOS && typeof window.webOS.platformBack === 'function') {
      window.webOS.platformBack();
    } else {
      window.close();
    }
  }

  // ---------- Remote control ----------

  function canScroll(el, direction) {
    if (direction === 'up') return el.scrollTop > 0;
    return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
  }

  function handleBack() {
    if (isOpen(els.exitDialog)) closeExitDialog();
    else if (isOpen(els.settings)) closeSettings();
    else openExitDialog();
  }

  function activate(el) {
    if (!el) return;
    if (el.hasAttribute('data-input')) startEditing(el);
    else el.click();
  }

  function onKeyDown(event) {
    var code = event.keyCode;
    var direction = DIRECTIONS[code];

    // While typing, the <input> owns left/right and characters.
    if (state.editing) {
      var field = state.editing;
      if (code === KEY.ENTER) {
        event.preventDefault();
        stopEditing();
        if (field._submit) field._submit();
      } else if (code === KEY.BACK || code === KEY.ESC) {
        event.preventDefault();
        stopEditing();
      } else if (direction === 'up' || direction === 'down') {
        event.preventDefault();
        stopEditing();
        Nav.move(direction);
      }
      return;
    }

    if (direction) {
      event.preventDefault();
      var current = Nav.current();
      if (current && current.hasAttribute('data-scrollable') &&
          (direction === 'up' || direction === 'down') &&
          canScroll(current, direction)) {
        current.scrollTop += direction === 'up' ? -SCROLL_STEP : SCROLL_STEP;
        return;
      }
      Nav.move(direction);
      return;
    }

    switch (code) {
      case KEY.ENTER:
        event.preventDefault();
        activate(Nav.current());
        break;
      case KEY.BACK:
      case KEY.ESC:
        event.preventDefault();
        handleBack();
        break;
      case KEY.RED:
        if (!Nav.inScope()) clearChat();
        break;
      case KEY.GREEN:
        if (!Nav.inScope()) openSettings();
        break;
    }
  }

  // ---------- Setup ----------

  function renderSuggestions() {
    for (var i = 0; i < SUGGESTIONS.length; i++) {
      var btn = document.createElement('button');
      btn.className = 'tile';
      btn.setAttribute('data-focusable', '');
      btn.textContent = SUGGESTIONS[i];
      btn.addEventListener('click', (function (text) {
        return function () { send(text); };
      })(SUGGESTIONS[i]));
      els.suggestions.appendChild(btn);
    }
  }

  function init() {
    renderSuggestions();

    bindField(els.promptField, function () { send(els.promptInput.value); });
    bindField(els.serverField, null);

    els.sendBtn.addEventListener('click', function () { send(els.promptInput.value); });
    els.clearBtn.addEventListener('click', clearChat);
    els.settingsBtn.addEventListener('click', openSettings);
    els.testBtn.addEventListener('click', testConnection);
    els.saveBtn.addEventListener('click', saveSettings);
    els.cancelBtn.addEventListener('click', closeSettings);
    els.exitYes.addEventListener('click', exitApp);
    els.exitNo.addEventListener('click', closeExitDialog);

    document.addEventListener('keydown', onKeyDown, true);

    // Re-check the server when the app comes back to the foreground.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) checkStatus();
    });

    showWelcome();
    Nav.focus(els.suggestions.firstChild);
    checkStatus();

    if (!state.serverUrl) openSettings();
  }

  init();
})();
