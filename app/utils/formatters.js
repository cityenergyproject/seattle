'use strict';

define(['d3'], function ($) {
  var types = {
    'default': function _default(d) {
      return d;
    },
    'integer': d3.format(',.0f'),
    'fixed': function fixed(precision) {
      precision = precision || 0;
      precision = Math.max(precision, 0);

      return d3.format(',.' + precision + 'f');
    }
  };

  var get = function get(t) {
    if (!t) return types.default;

    if (typeof t === 'function') return t;

    if (!t.indexOf) return types.default;

    if (t.indexOf('fixed') === 0) {
      var s = t.split('-');
      var precision = s[1] || 0;

      if (isNaN(precision)) precision = 0;

      return types.fixed(precision);
    }

    if (types[t]) return types[t];

    return types.default;
  };

  return {
    types: types,
    get: get
  };
});