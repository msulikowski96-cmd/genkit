/*
 * Spatial navigation for the TV remote (arrow keys) and the Magic Remote pointer.
 *
 * Any element with the `data-focusable` attribute can receive focus. The focused
 * element gets the `focused` CSS class. Dialogs push a new "scope" so focus stays
 * inside them, and popping the scope restores the previous focus.
 *
 * Written in ES5 so it runs on older webOS Chromium builds.
 */
var Nav = (function () {
  'use strict';

  var current = null;
  var scopes = []; // stack of { root, returnTo }

  function root() {
    return scopes.length ? scopes[scopes.length - 1].root : document.body;
  }

  function isVisible(el) {
    if (el.offsetParent === null) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function candidates() {
    var nodes = root().querySelectorAll('[data-focusable]');
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el.disabled && isVisible(el)) out.push(el);
    }
    return out;
  }

  // `keepDomFocus` moves only the highlight, e.g. while an <input> inside the
  // element is being edited and must keep the real DOM focus.
  function focus(el, keepDomFocus) {
    if (!el || el === current) return;
    if (current) current.classList.remove('focused');
    current = el;
    current.classList.add('focused');
    if (keepDomFocus) return;
    // Keep DOM focus in sync for accessibility. Field wrappers are plain divs,
    // so this never opens the on-screen keyboard by itself.
    if (!current.hasAttribute('tabindex') && current.tabIndex < 0) {
      current.setAttribute('tabindex', '-1');
    }
    try {
      current.focus();
    } catch (e) { /* ignore */ }
  }

  // Gap between two ranges on one axis (0 when they overlap).
  function gap(aStart, aEnd, bStart, bEnd) {
    if (bEnd < aStart) return aStart - bEnd;
    if (bStart > aEnd) return bStart - aEnd;
    return 0;
  }

  function findNext(direction) {
    if (!current) return null;
    var from = current.getBoundingClientRect();
    var fx = from.left + from.width / 2;
    var fy = from.top + from.height / 2;
    var list = candidates();
    var best = null;
    var bestScore = Infinity;
    var TOLERANCE = 12;

    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el === current) continue;
      var r = el.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var primary;
      var secondary;
      var offset;

      if (direction === 'left') {
        if (r.right > from.left + TOLERANCE || cx >= fx) continue;
        primary = Math.max(0, from.left - r.right);
        secondary = gap(from.top, from.bottom, r.top, r.bottom);
        offset = Math.abs(cy - fy);
      } else if (direction === 'right') {
        if (r.left < from.right - TOLERANCE || cx <= fx) continue;
        primary = Math.max(0, r.left - from.right);
        secondary = gap(from.top, from.bottom, r.top, r.bottom);
        offset = Math.abs(cy - fy);
      } else if (direction === 'up') {
        if (r.bottom > from.top + TOLERANCE || cy >= fy) continue;
        primary = Math.max(0, from.top - r.bottom);
        secondary = gap(from.left, from.right, r.left, r.right);
        offset = Math.abs(cx - fx);
      } else {
        if (r.top < from.bottom - TOLERANCE || cy <= fy) continue;
        primary = Math.max(0, r.top - from.bottom);
        secondary = gap(from.left, from.right, r.left, r.right);
        offset = Math.abs(cx - fx);
      }

      var score = primary + secondary * 4 + offset * 0.1;
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  function move(direction) {
    if (!current || !root().contains(current)) {
      focusFirst();
      return true;
    }
    var next = findNext(direction);
    if (next) {
      focus(next);
      return true;
    }
    return false;
  }

  function focusFirst() {
    var list = candidates();
    if (list.length) focus(list[0]);
  }

  function pushScope(el, initialFocus) {
    scopes.push({ root: el, returnTo: current });
    if (initialFocus) focus(initialFocus);
    else focusFirst();
  }

  function popScope() {
    var scope = scopes.pop();
    if (scope && scope.returnTo && isVisible(scope.returnTo)) focus(scope.returnTo);
    else focusFirst();
  }

  function inScope() {
    return scopes.length > 0;
  }

  // Magic Remote: hovering an element with the pointer focuses it.
  document.addEventListener('mouseover', function (event) {
    var el = event.target;
    while (el && el !== document.body) {
      if (el.hasAttribute && el.hasAttribute('data-focusable')) {
        if (root().contains(el) && !el.disabled) focus(el);
        return;
      }
      el = el.parentNode;
    }
  });

  return {
    focus: focus,
    move: move,
    focusFirst: focusFirst,
    pushScope: pushScope,
    popScope: popScope,
    inScope: inScope,
    current: function () { return current; }
  };
})();
