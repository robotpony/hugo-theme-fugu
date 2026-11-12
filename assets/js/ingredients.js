// Ingredient list decoration + checkbox persistence + recipe scaling/units.
//
// Hugo/Goldmark has no render hook for lists (only headings, links, images,
// etc.), so render-heading.html can only mark where an ingredient section
// *starts* (an h2 with data-ing-heading="true") — it can't reach into the
// <ul>/<li> markup that Goldmark renders underneath it. This script does
// that part: walk forward from each marked heading to the next h2,
// collecting the <ul> it finds, and turn it into the real component
// (checkbox, quantity span, sub-note rows) with checked state persisted
// per-browser via localStorage.
//
// It also injects a config menu (next to the first Ingredients heading)
// that scales quantities and converts them between metric/imperial/Kelvin.
// The same engine drives two surfaces: the ingredient list (<ul>/<li>,
// walked from an "ing" heading) and inline quantities/temperatures inside
// Directions/Method prose (walked from a "method" heading, marked
// data-method-heading="true" by the same render hook).

(function () {
  // The words this script shows, from the page's #fugu-strings block
  // (partials/js-strings.html, i18n's fugu.js keys). Each call carries its
  // English as the fallback, so a page without the block still reads.
  // {name} in a string is filled from vars.
  var STRINGS = (function () {
    try {
      var el = document.getElementById('fugu-strings');
      return el ? JSON.parse(el.textContent) : {};
    } catch (e) { return {}; }
  })();
  function phrase(key, fallback, vars) {
    var s = STRINGS[key] || fallback;
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? vars[k] : m; }) : s;
  }
  // Best-effort leading-quantity matcher, built from Not a Chef's real
  // recipes (not every case in docs/recipe-format.md's grammar — "a pinch of", "to
  // taste" etc. have no leading number and are left unstyled, which is a
  // harmless fallback, not a broken layout).
  //
  // A mixed number's fraction is usually glued to the whole number ("1½",
  // docs/recipe-format.md's house style), but real files sometimes type it with a space
  // ("2 ¼") — the \s? here tolerates that. The unit's leading \s* (not \s?)
  // similarly tolerates a stray double space before the unit word, seen in
  // some migrated recipes.
  // Shared "number, or number-range" source (no capture groups of its own,
  // so it can be embedded in either QTY_RE's anchored form or PROSE_TOKEN_RE's
  // free-floating one below) — a lone value ("2", "¼") or two of them joined
  // by a dash/en-dash ("2-3", "80–100"), same range syntax either context
  // needs to recognize.
  var NUM_OR_RANGE_SRC =
    '\\d+\\s?[¼½¾⅓⅔⅛⅜⅝⅞⅙⅚]?(?:\\.\\d+)?(?:\\s?/\\s?\\d+)?(?:[\\s\\-–—]\\d+\\s?[¼½¾⅓⅔⅛⅜⅝⅞⅙⅚]?(?:\\.\\d+)?(?:\\s?/\\s?\\d+)?)?' +
    '|[¼½¾⅓⅔⅛⅜⅝⅞⅙⅚](?:[\\s\\-–—][¼½¾⅓⅔⅛⅜⅝⅞⅙⅚\\d]+)?';

  var QTY_RE = new RegExp(
    '^\\s*(' + NUM_OR_RANGE_SRC + ')' +
    '(\\s*(?:g|kg|mg|ml|mL|L|l|cups?|tsps?|tbsps?|teaspoons?|tablespoons?|oz|ounces?|lbs?|pounds?|' +
      'cloves?|heads?|cans?|packages?|slices?|pinch(?:es)?|dash(?:es)?|sprigs?|bunch(?:es)?|stalks?|sheets?)\\b)?' +
    '\\.?\\s+',
    'i'
  );

  function firstTextNode(el) {
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    return walker.nextNode();
  }

  // --- Quantity parsing/formatting, for scaling + unit conversion ---------

  var UNICODE_FRAC = {
    '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3,
    '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875, '⅙': 1 / 6, '⅚': 5 / 6
  };

  function parseSimpleNumber(tok) {
    tok = tok.trim();
    if (!tok) return null;
    if (tok.length === 1 && UNICODE_FRAC.hasOwnProperty(tok)) return UNICODE_FRAC[tok];
    var slash = tok.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if (slash) return parseFloat(slash[1]) / parseFloat(slash[2]);
    var m = tok.match(/^(\d+(?:\.\d+)?)\s?([¼½¾⅓⅔⅛⅜⅝⅞⅙⅚])?$/);
    if (m) {
      var n = parseFloat(m[1]);
      if (m[2]) n += UNICODE_FRAC[m[2]];
      return n;
    }
    return null;
  }

  // The regex above treats a plain space and a hyphen/en-dash the same way
  // (it has to, to match both "1 1/2" and "2-3" with one pattern) — so
  // disambiguating a mixed number from a range happens here instead: if the
  // second half is itself a "n/d" fraction, or a single unicode fraction
  // character ("2 ¼"), it's read as the fractional part of a mixed number
  // (added to the first half); otherwise the two halves are a range's
  // endpoints.
  function parseQtyToken(raw) {
    raw = raw.trim();
    var sep = raw.match(/^(.+?)[\s\-–—]+(.+)$/);
    if (sep) {
      var a = parseSimpleNumber(sep[1]);
      var b = sep[2];
      if (a != null) {
        var isFracContinuation = b.indexOf('/') !== -1 || (b.length === 1 && UNICODE_FRAC.hasOwnProperty(b));
        if (isFracContinuation) {
          var frac = parseSimpleNumber(b);
          if (frac != null) return { kind: 'single', value: a + frac };
        } else {
          var hi = parseSimpleNumber(b);
          if (hi != null) return { kind: 'range', lo: a, hi: hi };
        }
      }
    }
    var single = parseSimpleNumber(raw);
    if (single != null) return { kind: 'single', value: single };
    return null;
  }

  var UNIT_ALIASES = {
    g: 'g', kg: 'kg', mg: 'mg',
    ml: 'ml', l: 'l',
    cup: 'cup', cups: 'cup',
    tsp: 'tsp', tsps: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
    tbsp: 'tbsp', tbsps: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
    oz: 'oz', ounce: 'oz', ounces: 'oz',
    lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb'
  };

  function normalizeUnit(raw) {
    if (!raw) return null;
    var key = raw.trim().toLowerCase();
    return UNIT_ALIASES.hasOwnProperty(key) ? UNIT_ALIASES[key] : null;
  }

  // "base" is the unit's size in its family's canonical unit (grams for
  // mass, mL for volume) — approximate, cooking-standard conversions
  // (1 cup = 240 mL, not the precise 236.588): a home cook measures to
  // the nearest line on the cup, so a ballpark number is the honest one.
  var UNIT_INFO = {
    g: { system: 'metric', family: 'mass', base: 1 },
    kg: { system: 'metric', family: 'mass', base: 1000 },
    mg: { system: 'metric', family: 'mass', base: 0.001 },
    ml: { system: 'metric', family: 'volume', base: 1 },
    l: { system: 'metric', family: 'volume', base: 1000 },
    tsp: { system: 'imperial', family: 'volume', base: 5 },
    tbsp: { system: 'imperial', family: 'volume', base: 15 },
    cup: { system: 'imperial', family: 'volume', base: 240 },
    oz: { system: 'imperial', family: 'mass', base: 28.35 },
    lb: { system: 'imperial', family: 'mass', base: 453.6 }
  };

  var UNIT_LABELS = {
    g: ['g', 'g'], kg: ['kg', 'kg'], mg: ['mg', 'mg'],
    ml: ['ml', 'ml'], l: ['L', 'L'],
    cup: ['cup', 'cups'], tsp: ['tsp', 'tsp'], tbsp: ['tbsp', 'tbsp'],
    oz: ['oz', 'oz'], lb: ['lb', 'lb']
  };

  // "1 cup" and "¼ cup" are both singular — only a value genuinely over 1
  // pluralizes ("1½ cups").
  function unitLabel(key, value) {
    var pair = UNIT_LABELS[key];
    if (!pair) return '';
    return value < 1 + 1e-9 ? pair[0] : pair[1];
  }

  function isMetricUnit(key) {
    return key === 'g' || key === 'kg' || key === 'mg' || key === 'ml' || key === 'l';
  }

  // A pinch-sized quantity ("⅛ tsp" = 0.625 mL) shouldn't round down to
  // "0" — the guard keeps any genuinely nonzero input from collapsing to a
  // zero result, and the extra sub-5 step below is fine enough that the
  // guard is mostly just a backstop.
  function roundToNearest(n, step) {
    var r = Math.round(n / step) * step;
    if (r === 0 && n > 0) r = step;
    return r;
  }

  // Converts a value in `fromKey`'s unit to the best-fitting unit in
  // `targetSystem`, or returns null if it's already in that system (the
  // caller then just relabels/re-pluralizes without touching the number).
  function convert(value, fromKey, targetSystem) {
    var info = UNIT_INFO[fromKey];
    if (!info || info.system === targetSystem) return null;
    var base = value * info.base;
    if (info.family === 'mass') {
      if (targetSystem === 'metric') {
        if (base >= 1000) return { value: base / 1000, unit: 'kg' };
        return { value: roundToNearest(base, base < 5 ? 0.5 : base < 20 ? 1 : 5), unit: 'g' };
      }
      var lb = base / UNIT_INFO.lb.base;
      if (lb >= 1) return { value: lb, unit: 'lb' };
      return { value: base / UNIT_INFO.oz.base, unit: 'oz' };
    }
    if (targetSystem === 'metric') {
      if (base >= 1000) return { value: base / 1000, unit: 'l' };
      return { value: roundToNearest(base, base < 5 ? 0.5 : base < 50 ? 5 : 25), unit: 'ml' };
    }
    if (base >= 180) return { value: base / UNIT_INFO.cup.base, unit: 'cup' };
    if (base >= 15) return { value: base / UNIT_INFO.tbsp.base, unit: 'tbsp' };
    return { value: base / UNIT_INFO.tsp.base, unit: 'tsp' };
  }

  var FRACTIONS = [
    [1 / 8, '⅛'], [1 / 6, '⅙'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'],
    [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [5 / 6, '⅚'], [7 / 8, '⅞']
  ];

  // Imperial/unitless quantities read naturally as mixed numbers ("1½
  // tsp"), same style as the source recipes.
  function formatFraction(value) {
    if (value <= 0) return '0';
    var whole = Math.floor(value + 1e-9);
    var frac = value - whole;
    if (frac < 0.03) return String(whole || 0);
    // Same 0.06 tolerance as the fraction match below, applied to "close
    // enough to the next whole number" (e.g. 4.96 -> "5", not "4.96").
    if (frac > 0.94) return String(whole + 1);
    var best = null, bestDiff = 0.06;
    FRACTIONS.forEach(function (pair) {
      var diff = Math.abs(frac - pair[0]);
      if (diff <= bestDiff) { bestDiff = diff; best = pair; }
    });
    if (best) return (whole > 0 ? String(whole) : '') + best[1];
    return String(Math.round(value * 100) / 100);
  }

  // Metric quantities read naturally as decimals ("2.4 L"), not fractions.
  function formatDecimal(value) {
    if (value <= 0) return '0';
    return String(parseFloat(value.toFixed(2)));
  }

  // A scaled amount on a percentage table's page (see findPercentBase). Spices go on
  // a gram scale, so small amounts keep a tenth and 1.77 g reads 1.8; big
  // ones don't need false precision. Never rounds down to nothing.
  function formatTableAmount(value, unit) {
    if (value <= 0) return '0';
    if (unit === 'kg' || unit === 'l') return String(parseFloat(value.toFixed(2)));
    return value < 20 ? String(parseFloat(value.toFixed(1)) || 0.1) : String(Math.round(value));
  }

  // --- Canonical number+unit spacing --------------------------------------
  //
  // The vault's source recipes are inconsistent about this ("50ml" vs
  // "50 ml"; Not a Chef's FORMAT.md examples disagreed too), so
  // rather than echo whichever style a given file happened to use, every
  // rendered quantity — including the untouched "as written" default —
  // goes through one canonical rule. Only a JS-level constant for now, not
  // a UI setting; flip it to 'spaced' to try the alternative.
  //
  // Only applies to metric symbol units (g, kg, mg, ml, l) — imperial units
  // (oz, lb) and spelled-out word units (tsp, tbsp, cup) always keep a
  // space regardless of this setting ("5 oz", "2 tbsp", never "5oz"/
  // "2tbsp"), same as any other carried-over word (cloves, cans, ...):
  // metric symbols read fine compressed, but imperial/standard ones don't.
  // 'glued' ("50ml") by default, or 'spaced' ("50 ml") when the site sets
  // params.fugu.unitSpacing = "spaced" (single.html's data-unit-spacing).
  var UNIT_SPACING = 'glued';
  var SYMBOL_UNITS = { g: true, kg: true, mg: true, ml: true, l: true };

  function spaceUnit(numText, label) {
    if (!label) return numText;
    return numText + (UNIT_SPACING === 'spaced' ? ' ' : '') + label;
  }

  function joinValueLabel(numText, label, unitKey) {
    if (!label) return numText;
    return SYMBOL_UNITS[unitKey] ? spaceUnit(numText, label) : numText + ' ' + label;
  }

  // --- Bracketed alt-unit parsing (ingredient lines + prose) --------------
  //
  // "2 ¼ cups (560 ml) 35% cream" carries two numbers for one quantity: the
  // one as originally typed, and a parenthetical in the other system.
  // Rather than leaving the parenthetical as inert text, it's captured as a
  // linked alt value so the units toggle can promote whichever side matches
  // the requested system and demote the other into parentheses — reusing
  // the literal (value, unit) pair as written, never recomputed/rounded
  // from the other. Only single values are supported (not ranges) —
  // bracketed alt units on a ranged quantity don't appear in this vault.
  var ALT_BRACKET_RE = /^\s*\(([^()]+)\)/;
  var SINGLE_QTY_INNER_RE = new RegExp(
    '^\\s*(\\d+\\s?[¼½¾⅓⅔⅛⅜⅝⅞⅙⅚]?(?:\\.\\d+)?(?:\\s?/\\s?\\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞⅙⅚])' +
    '\\s*(g|kg|mg|ml|mL|L|l|cups?|tsps?|tbsps?|teaspoons?|tablespoons?|oz|ounces?|lbs?|pounds?)\\b'
  );

  // Given the text immediately following a matched primary quantity, checks
  // for "(<number> <recognized unit>)" in the OTHER unit system and, if
  // found, returns { value, unit, consumedLength } (consumedLength covers
  // the whole "(...)" plus any run of trailing whitespace, so the caller
  // can drop it from the surrounding text) — otherwise null.
  function matchAltBracket(text, primaryUnitKey) {
    var outer = text.match(ALT_BRACKET_RE);
    if (!outer) return null;
    var inner = outer[1].match(SINGLE_QTY_INNER_RE);
    if (!inner) return null;
    var value = parseSimpleNumber(inner[1].replace(/\s+/g, ''));
    var unit = normalizeUnit(inner[2]);
    if (value == null || !unit) return null;
    if (isMetricUnit(unit) === isMetricUnit(primaryUnitKey)) return null; // same system, not a real alt
    return { value: value, unit: unit, consumedLength: outer[0].length };
  }

  function matchAltTempBracket(text) {
    var outer = text.match(ALT_BRACKET_RE);
    if (!outer) return null;
    var inner = outer[1].match(/^\s*(\d+(?:\.\d+)?)\s?[°º]\s?([CFKcfk])/);
    if (!inner) return null;
    return { value: parseFloat(inner[1]), unit: inner[2].toLowerCase(), consumedLength: outer[0].length };
  }

  function wrapQty(li) {
    var node = firstTextNode(li);
    if (!node) return;
    var m = node.textContent.match(QTY_RE);
    if (!m) return;
    var qty = document.createElement('span');
    qty.className = 'qty mono';
    var text = m[0].replace(/\s+$/, '');
    qty.textContent = text;

    var parsed = parseQtyToken(m[1]);
    var unitKey = null;
    if (parsed) {
      qty.dataset.qtyKind = parsed.kind;
      if (parsed.kind === 'single') {
        qty.dataset.qtyValue = String(parsed.value);
      } else {
        qty.dataset.qtyLo = String(parsed.lo);
        qty.dataset.qtyHi = String(parsed.hi);
      }
      unitKey = normalizeUnit(m[2]);
      if (unitKey) qty.dataset.qtyUnit = unitKey;
      if (m[2]) qty.dataset.qtyUnitRaw = m[2].trim();
    }

    var restText = node.textContent.slice(m[0].length);

    // A bracketed alt-unit right after a single-valued, unit-bearing
    // quantity is captured as a linked alt rather than left as static text.
    if (parsed && parsed.kind === 'single' && unitKey) {
      var alt = matchAltBracket(restText, unitKey);
      if (alt) {
        qty.dataset.qtyAltValue = String(alt.value);
        qty.dataset.qtyAltUnit = alt.unit;
        restText = restText.slice(alt.consumedLength);
      }
    }

    // A real space still has to survive between the span and the rest of
    // the text — otherwise "200g" and "red lentils" render jammed together
    // as "200gred lentils". Always exactly one space, regardless of how
    // much whitespace (if any) separated the bracket from what follows it.
    var rest = document.createTextNode(' ' + restText.replace(/^\s+/, ''));
    node.parentNode.insertBefore(qty, node);
    node.parentNode.insertBefore(rest, node);
    node.parentNode.removeChild(node);
  }

  // Re-renders one qty span for a given scale factor + unit system
  // ('original' | 'metric' | 'imperial' | 'kelvin'). Always reformats to
  // the canonical spacing/number style, even at 1x/original — the source
  // recipes' own "as written" spacing is inconsistent, so the default view
  // is a cleaned-up rendering rather than a verbatim echo. `tableRounding`
  // uses formatTableAmount for metric values, on a page a percentage table
  // has scaled.
  function renderQty(qty, scale, unitSystem, tableRounding) {
    var kind = qty.dataset.qtyKind;
    if (!kind) return;

    var unitKey = qty.dataset.qtyUnit || '';
    var rawUnit = qty.dataset.qtyUnitRaw || '';
    var altUnit = qty.dataset.qtyAltUnit || '';
    var altValue = qty.dataset.qtyAltValue !== undefined ? parseFloat(qty.dataset.qtyAltValue) : null;

    // Picks the natural size for a metric value at its own (unrounded)
    // magnitude — scaling up crosses the 1000 line for real ("1000g" reads
    // as "1kg", "1500g" as "1.5kg"), whether or not the units toggle is
    // actively converting between systems.
    function renormalizeMetric(value, key) {
      var info = UNIT_INFO[key];
      var base = value * info.base;
      if (info.family === 'mass') {
        return base >= 1000 ? { value: base / 1000, unit: 'kg' } : { value: base, unit: 'g' };
      }
      return base >= 1000 ? { value: base / 1000, unit: 'l' } : { value: base, unit: 'ml' };
    }

    function relabelNative(key, value) {
      if (isMetricUnit(key)) {
        var r = renormalizeMetric(value, key);
        return { value: r.value, unit: r.unit, label: unitLabel(r.unit, r.value) };
      }
      return { value: value, unit: key, label: unitLabel(key, value) };
    }

    // Scales a recognized-unit value and relabels it in its own unit
    // (never cross-system converted) — used for both sides of an alt pair,
    // which are each already in the system they'll be shown as.
    function nativeUnit(key, rawValue) {
      var r = relabelNative(key, rawValue * scale);
      return { value: r.value, unit: r.unit, label: r.label, metric: isMetricUnit(r.unit) };
    }

    // `forceUnit`, when given, expresses the result directly in that unit
    // instead of picking one — used to keep both ends of a range in the
    // same unit (never "800–1.2 kg").
    function transform(raw, forceUnit) {
      var value = raw * scale;
      var label = '';
      var finalUnit = unitKey || null;
      if (unitKey) {
        if (forceUnit) {
          value = (value * UNIT_INFO[unitKey].base) / UNIT_INFO[forceUnit].base;
          finalUnit = forceUnit;
          label = unitLabel(forceUnit, value);
        } else if (unitSystem === 'metric' || unitSystem === 'imperial') {
          var converted = convert(value, unitKey, unitSystem);
          if (converted) {
            value = converted.value; finalUnit = converted.unit; label = unitLabel(converted.unit, value);
          } else {
            var native = relabelNative(unitKey, value);
            value = native.value; finalUnit = native.unit; label = native.label;
          }
        } else {
          // 'original' or 'kelvin' — Kelvin has no applicable ingredient
          // unit (nothing in an ingredient list is a temperature), so it's
          // inert here: scaled and relabelled like 'original', not
          // converted between systems.
          var native2 = relabelNative(unitKey, value);
          value = native2.value; finalUnit = native2.unit; label = native2.label;
        }
      } else if (rawUnit) {
        // A count unit not in UNIT_ALIASES (cloves, cans, pinches, ...) —
        // no conversion table and re-pluralizing it correctly isn't worth
        // the risk (bunch/bunches, pinch/pinches don't just take "+s"), so
        // the original word is carried over as-is. Same tolerance this
        // file already has for a "harmless fallback, not a broken layout."
        label = rawUnit;
      }
      return { value: value, label: label, unit: finalUnit, metric: isMetricUnit(finalUnit) };
    }

    // Single-valued quantities with a linked alt-unit bracket: pick
    // whichever side (primary or alt) matches the requested system as the
    // main figure, demoting the other into parentheses.
    function transformWithAlt(raw) {
      var altMatchesTarget = (unitSystem === 'metric' || unitSystem === 'imperial') &&
        isMetricUnit(altUnit) === (unitSystem === 'metric');
      if (altMatchesTarget) {
        return { main: nativeUnit(altUnit, altValue), bracket: nativeUnit(unitKey, raw) };
      }
      return { main: nativeUnit(unitKey, raw), bracket: nativeUnit(altUnit, altValue) };
    }

    function number(value, metric, unit) {
      if (!metric) return formatFraction(value);
      return tableRounding ? formatTableAmount(value, unit) : formatDecimal(value);
    }

    function render(r) {
      return joinValueLabel(number(r.value, r.metric, r.unit), r.label, r.unit);
    }

    if (kind === 'single') {
      if (altUnit) {
        var res = transformWithAlt(parseFloat(qty.dataset.qtyValue));
        qty.textContent = render(res.main) + ' (' + render(res.bracket) + ')';
      } else {
        qty.textContent = render(transform(parseFloat(qty.dataset.qtyValue)));
      }
    } else {
      var hi = transform(parseFloat(qty.dataset.qtyHi));
      var lo = transform(parseFloat(qty.dataset.qtyLo), hi.unit);
      qty.textContent = number(lo.value, hi.metric, hi.unit) + '–' +
        joinValueLabel(number(hi.value, hi.metric, hi.unit), hi.label, hi.unit);
    }
  }

  // --- Temperature parsing/conversion (Directions/Method prose) ----------
  //
  // Nothing in an ingredient list is a temperature, so this only ever
  // shows up in prose. Unlike ingredient units, C/F stay glued to the
  // degree sign regardless of UNIT_SPACING (matches every existing recipe:
  // "180°C", never "180 °C") — Kelvin gets a space before its symbol
  // instead, per SI convention for a named unit ("300 K", not "300K").

  function toCelsius(value, unit) {
    if (unit === 'c') return value;
    if (unit === 'f') return (value - 32) * 5 / 9;
    return value - 273.15; // k
  }
  function fromCelsius(c, unit) {
    if (unit === 'c') return c;
    if (unit === 'f') return c * 9 / 5 + 32;
    return c + 273.15; // k
  }
  function formatTemp(value, unit) {
    var rounded = Math.round(value);
    return unit === 'k' ? rounded + ' K' : rounded + '°' + unit.toUpperCase();
  }

  function renderTemp(el, unitSystem) {
    var value = parseFloat(el.dataset.tempValue);
    var unit = el.dataset.tempUnit;
    var altUnit = el.dataset.tempAltUnit || '';
    var altValue = el.dataset.tempAltValue !== undefined ? parseFloat(el.dataset.tempAltValue) : null;

    var targetUnit = unitSystem === 'metric' ? 'c' : unitSystem === 'imperial' ? 'f' : unitSystem === 'kelvin' ? 'k' : unit;

    if (targetUnit === unit) {
      el.textContent = formatTemp(value, unit) + (altUnit ? ' (' + formatTemp(altValue, altUnit) + ')' : '');
      return;
    }
    if (altUnit && targetUnit === altUnit) {
      el.textContent = formatTemp(altValue, altUnit) + ' (' + formatTemp(value, unit) + ')';
      return;
    }
    // Target system has no literal value in the source (always true for
    // Kelvin) — compute it, keeping the original value as a reference.
    var computed = fromCelsius(toCelsius(value, unit), targetUnit);
    el.textContent = formatTemp(computed, targetUnit) + ' (' + formatTemp(value, unit) + ')';
  }

  // --- Directions/Method prose: inline quantity + temperature detection --
  //
  // Method text isn't a <ul> of parsed ingredient lines — it's paragraphs
  // (or a numbered list) of prose — so quantities and temperatures have to
  // be found anywhere in the running text, not just at the start of a
  // line. Only a mention with a RECOGNIZED unit (g/ml/tbsp/...) is scaled
  // and converted; bare numbers — cook times, day counts, step repetitions
  // — don't carry a unit from this table, so they never match and are
  // never touched. Ranges ("200–250 ml") are supported the same way a
  // leading ingredient-line quantity is (NUM_OR_RANGE_SRC, shared with
  // QTY_RE) — this scanner also runs over a %-based ingredient table's
  // Weight column (enhanceTable calls enhanceProseText(table) directly,
  // rather than going through this prose branch of the init() walk), and
  // those columns write ranges just like ingredient lines do.

  var PROSE_UNIT_WORDS = 'g|kg|mg|ml|mL|L|l|cups?|tsps?|tbsps?|teaspoons?|tablespoons?|oz|ounces?|lbs?|pounds?';
  var PROSE_TOKEN_RE = new RegExp(
    '(\\d+(?:\\.\\d+)?)\\s?[°º]\\s?([CFKcfk])\\b' +
    '|' +
    '(' + NUM_OR_RANGE_SRC + ')\\s?(' + PROSE_UNIT_WORDS + ')\\b',
    'g'
  );

  function buildProseQtySpan(rawText, numToken, unitWord) {
    var parsed = parseQtyToken(numToken);
    if (!parsed) return null;
    var unitKey = normalizeUnit(unitWord);
    if (!unitKey) return null;
    var span = document.createElement('span');
    span.className = 'qty mono';
    span.textContent = rawText;
    span.dataset.qtyKind = parsed.kind;
    if (parsed.kind === 'single') {
      span.dataset.qtyValue = String(parsed.value);
    } else {
      span.dataset.qtyLo = String(parsed.lo);
      span.dataset.qtyHi = String(parsed.hi);
    }
    span.dataset.qtyUnit = unitKey;
    return span;
  }

  function buildTempSpan(rawText, numToken) {
    var value = parseFloat(numToken);
    if (isNaN(value)) return null;
    var span = document.createElement('span');
    span.className = 'temp mono';
    span.textContent = rawText;
    return span;
  }

  function enhanceProseText(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentNode;
        if (p && (p.classList.contains('qty') || p.classList.contains('temp'))) return NodeFilter.FILTER_REJECT;
        // Photo markers and captions (automagic-sidebar.js) aren't method text.
        if (p && p.closest('.photo-marker, figure')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(function (node) {
      var text = node.textContent;
      PROSE_TOKEN_RE.lastIndex = 0;
      if (!PROSE_TOKEN_RE.test(text)) return;
      PROSE_TOKEN_RE.lastIndex = 0;

      var frag = document.createDocumentFragment();
      var pos = 0;
      var m = PROSE_TOKEN_RE.exec(text);
      while (m) {
        var span = null;
        var matchEnd = PROSE_TOKEN_RE.lastIndex;
        if (m[1] !== undefined) {
          span = buildTempSpan(m[0], m[1]);
          if (span) {
            span.dataset.tempValue = String(parseFloat(m[1]));
            span.dataset.tempUnit = m[2].toLowerCase();
            var altT = matchAltTempBracket(text.slice(matchEnd));
            if (altT) {
              span.dataset.tempAltValue = String(altT.value);
              span.dataset.tempAltUnit = altT.unit;
              matchEnd += altT.consumedLength;
            }
          }
        } else {
          span = buildProseQtySpan(m[0], m[3], m[4]);
          // Alt-bracket pairing only applies to single-valued quantities
          // (matchAltBracket/renderQty were never taught to carry a second
          // linked value through a range) — same restriction wrapQty
          // already applies to ingredient lines.
          if (span && span.dataset.qtyKind === 'single') {
            var altQ = matchAltBracket(text.slice(matchEnd), span.dataset.qtyUnit);
            if (altQ) {
              span.dataset.qtyAltValue = String(altQ.value);
              span.dataset.qtyAltUnit = altQ.unit;
              matchEnd += altQ.consumedLength;
            }
          }
        }

        if (span) {
          frag.appendChild(document.createTextNode(text.slice(pos, m.index)));
          frag.appendChild(span);
          pos = matchEnd;
        }
        PROSE_TOKEN_RE.lastIndex = Math.max(matchEnd, PROSE_TOKEN_RE.lastIndex);
        m = PROSE_TOKEN_RE.exec(text);
      }
      if (pos === 0) return; // nothing actually wrapped
      frag.appendChild(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  // --- Checkbox rows --------------------------------------------------

  // Each row's saved check-off is keyed by its text; a line repeated on
  // the page (the same "1 tsp salt" in two components) gets "#2", "#3" in
  // order, so ticking one doesn't tick the other. The first keeps the
  // plain key, so ticks saved before this still load.
  var keyCounts = {};
  function rowKey(base) {
    var n = (keyCounts[base] || 0) + 1;
    keyCounts[base] = n;
    return n === 1 ? base : base + '#' + n;
  }
  var rowIds = 0;

  function enhanceRow(li, pageKey) {
    li.classList.add('ing');
    wrapQty(li);

    // Weight/volume annotations after the leading quantity — "15 onions
    // (about 1kg)", "7½ carrots (about 150g)" — aren't a system-pair alt
    // for the primary (that's a bare count, "large onions" isn't a unit)
    // so wrapQty's own bracket-pairing never sees them; a qualifier word
    // like "about" also sits before the number, which a same-system pair
    // match wouldn't tolerate anyway. Scanning the rest of the line the
    // same way Directions prose is scanned catches these — and anything
    // else recognized-unit-bearing in an ingredient line's trailing
    // text — wrapping just the number+unit and leaving "about"/commas/
    // everything else as-is.
    enhanceProseText(li);

    var label = document.createElement('label');
    while (li.firstChild) label.appendChild(li.firstChild);

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    // The label names the checkbox and ticks it when tapped.
    checkbox.id = 'ing-' + (++rowIds);
    label.htmlFor = checkbox.id;

    li.appendChild(checkbox);
    li.appendChild(label);

    // A glossary term in the line (beef stew's "MSG") brings its popover
    // into the label: the definition would be read as part of the
    // checkbox's name, and a tap on the open popover would tick the box.
    // The name leaves the popover out; a tap on the term follows the link
    // as before, and one on the popover does nothing. The storage key below
    // keeps the full text, so lines ticked before this stay ticked.
    if (label.querySelector('.pop')) {
      var named = label.cloneNode(true);
      named.querySelectorAll('.pop').forEach(function (pop) { pop.remove(); });
      checkbox.setAttribute('aria-label', named.textContent.replace(/\s+/g, ' ').trim());
      label.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('.pop')) e.preventDefault();
      });
    }

    var key = rowKey('ing:' + pageKey + ':' + label.textContent.trim());
    try {
      if (localStorage.getItem(key) === '1') checkbox.checked = true;
    } catch (e) {}

    checkbox.addEventListener('change', function () {
      try {
        if (checkbox.checked) localStorage.setItem(key, '1');
        else localStorage.removeItem(key);
      } catch (e) {}
    });
  }

  function enhanceSubRow(li) {
    li.classList.add('ing', 'sub');
  }

  function enhanceList(ul, pageKey) {
    ul.classList.add('ing-list');
    var items = Array.prototype.slice.call(ul.children).filter(function (el) {
      return el.tagName === 'LI';
    });
    items.forEach(function (li) {
      var nested = li.querySelector(':scope > ul');
      var subItems = [];
      if (nested) {
        subItems = Array.prototype.slice.call(nested.children).filter(function (el) {
          return el.tagName === 'LI';
        });
        nested.parentNode.removeChild(nested);
      }
      enhanceRow(li, pageKey);
      subItems.forEach(function (sub) {
        enhanceSubRow(sub);
        li.parentNode.insertBefore(sub, li.nextSibling);
        li = sub; // keep inserting subsequent sub-items in order after this one
      });
    });
  }

  // A %-based ingredient table (baker's percentage — docs/recipe-format.md,
  // "Percentage tables", covers the convention, e.g. lazy-pizza-dough-2022's flour/
  // water/salt breakdown) is still an ingredient list, just laid out as a
  // <table> instead of a <ul> — Goldmark's table extension renders a plain
  // <table>/<thead>/<tbody>, so this gives each body row the same
  // checkbox + localStorage persistence enhanceRow gives an <li>. Weight/
  // quantity cells ("600g") already get scaled/unit-converted without this
  // — the init() walk's non-UL branch already ran enhanceProseText(el) over
  // the whole table before TABLE got its own branch — enhanceProseText(table)
  // below just keeps that behaviour now that this function owns the walk.
  // Returns the table's percentage base (findPercentBase), or null.
  function enhanceTable(table, pageKey) {
    table.classList.add('ing-table');
    enhanceProseText(table);
    var percentBase = findPercentBase(table);

    var headRow = table.querySelector(':scope > thead > tr');
    if (headRow) {
      var headCell = document.createElement('th');
      headCell.className = 'ing-check-cell';
      headRow.insertBefore(headCell, headRow.firstChild);
    }

    var rows = Array.prototype.slice.call(table.querySelectorAll(':scope > tbody > tr'));
    rows.forEach(function (tr) {
      // Captured before the checkbox cell is inserted, from the row's
      // existing cells (ingredient name, %, weight, notes) — same idea as
      // enhanceRow's key (the full <li> text), just joined across columns
      // instead of read from one label.
      var keyText = Array.prototype.map.call(tr.children, function (td) {
        return td.textContent.trim();
      }).filter(Boolean).join(' ');

      tr.classList.add('ing', 'ing-row');
      var checkCell = document.createElement('td');
      checkCell.className = 'ing-check-cell';
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      // Named by the row's first cell, the ingredient, less any glossary
      // popover's definition (see enhanceRow).
      var nameCell = tr.children[0] && tr.children[0].cloneNode(true);
      if (nameCell) nameCell.querySelectorAll('.pop').forEach(function (pop) { pop.remove(); });
      var name = nameCell && nameCell.textContent.replace(/\s+/g, ' ').trim();
      if (name) checkbox.setAttribute('aria-label', name);
      checkCell.appendChild(checkbox);
      tr.insertBefore(checkCell, tr.firstChild);

      var key = rowKey('ing:' + pageKey + ':' + keyText);
      try {
        if (localStorage.getItem(key) === '1') checkbox.checked = true;
      } catch (e) {}

      checkbox.addEventListener('change', function () {
        try {
          if (checkbox.checked) localStorage.setItem(key, '1');
          else localStorage.removeItem(key);
        } catch (e) {}
      });
    });
    return percentBase;
  }

  // A percentage table scales from what the cook has, so it needs no new
  // syntax: a column headed "%" or "% of ...", and a row whose cell there is
  // exactly 100%. That row is the base. Its amount, the first filled cell
  // after the %, has to be a single mass or volume, or there's nothing to
  // type against, and the table scales with the slider like any other. Runs
  // before the checkbox cell goes in, and marks the table and the amount
  // column's heading for createScaleUnitsController.
  function findPercentBase(table) {
    var headRow = table.querySelector(':scope > thead > tr');
    if (!headRow) return null;
    var heads = Array.prototype.slice.call(headRow.children);
    var pctCol = heads.findIndex(function (th) { return th.textContent.trim().charAt(0) === '%'; });
    if (pctCol < 1) return null;
    var row = Array.prototype.find.call(table.querySelectorAll(':scope > tbody > tr'), function (tr) {
      var cell = tr.children[pctCol];
      return cell && cell.textContent.trim() === '100%';
    });
    if (!row) return null;

    var col = pctCol + 1;
    while (row.children[col] && !row.children[col].textContent.trim()) col++;
    var qty = row.children[col] && row.children[col].querySelector('.qty');
    if (!qty || qty.dataset.qtyKind !== 'single' || !UNIT_INFO[qty.dataset.qtyUnit]) return null;

    // A glossary term's popover is in the cell's text, and isn't its name.
    var nameCell = row.children[0].cloneNode(true);
    nameCell.querySelectorAll('.pop').forEach(function (pop) { pop.remove(); });
    var name = nameCell.textContent.trim().replace(/\s+/g, ' ');
    // "Shoyu" reads "Scale based on shoyu"; "AP flour" keeps its capitals.
    if (!/^.[A-Z]/.test(name)) name = name.charAt(0).toLowerCase() + name.slice(1);

    table.classList.add('ing-table--percent');
    return { table: table, qty: qty, name: name, pctCol: pctCol, amountCol: col, head: percentHead(heads[col]) };
  }

  // The amount column's heading, when it names an amount ("Per 1 kg",
  // "Example: 250 ml shoyu"; "Weight" doesn't, and stays as it is). Kept out
  // of apply()'s .qty walk by .ing-pct-head, so at the written amount it's
  // back to its own words instead of the canonical "Per 1kg".
  function percentHead(th) {
    var qty = th && th.querySelector(':scope > .qty');
    if (!qty) return null;
    th.classList.add('ing-pct-head');
    var after = document.createElement('div');
    for (var n = qty.nextSibling; n; n = n.nextSibling) after.appendChild(n.cloneNode(true));
    return { th: th, written: th.innerHTML, qty: qty, after: after.innerHTML };
  }

  // --- Config menu: scale recipe / change units ------------------------

  var SCALE_MIN = 1;
  var SCALE_MAX = 5;
  var SCALE_STEP = 0.5;
  // Kelvin conversion is fully implemented (toCelsius/fromCelsius above)
  // but is more of a joke than a real option for a home-cooking site — off
  // by default, flipped by single.html's data-enable-kelvin attribute
  // (the site's params.recipe.enableKelvin), read in init().
  var ENABLE_KELVIN = false;
  var GEAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="3"></circle>' +
    '<path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z"></path>' +
    '</svg>';

  function buildUnitButton(text, value) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ing-btn';
    btn.textContent = text;
    btn.dataset.units = value;
    btn.setAttribute('aria-pressed', 'false');
    return btn;
  }

  function formatScaleValue(n) {
    return (Number.isInteger(n) ? String(n) : n.toFixed(1)) + '×';
  }

  // Scales a servings/portions frontmatter value for the yield line and
  // the sidebar's Serves row: a bare number ("4", "⅓"), a range ("3–4"),
  // or either one leading some words ("8 individual pizzas", "about 1.5 L").
  // A range widens outward (low end down, high end up), so 3–4 at 1.5×
  // reads 4–6 rather than claiming a precision the recipe doesn't have.
  // Anything else ("makes ~750 ml", "scales to bird size") returns null:
  // it can't be scaled honestly, so callers leave it out or as written.
  //
  // After the lead, a list of alternatives scales too ("6 burger buns, 8
  // hot dog buns, or 9 dinner buns"), as does a parenthesis that restates
  // the whole yield ("about 1 cup (250 ml)", "4 (makes ~300ml)", "(30–35
  // meatballs)"). A parenthesis about one piece doesn't: one with "each",
  // "per", "portion", "serving", "×" or "/" in it ("(200 g each)", "(23×33
  // cm / 9×13 in)") is left as written. In English, the word after a count
  // follows it: "1 drink" at 2× is "2 drinks", "1 pan of buns" "2 pans of
  // buns", and back again when a typed amount scales below 1.
  var YIELD_FRACTION_CHARS = FRACTIONS.map(function (pair) { return pair[1]; }).join('');
  var YIELD_NUM = '(?:\\d+(?:\\.\\d+)?[' + YIELD_FRACTION_CHARS + ']?|[' + YIELD_FRACTION_CHARS + '])';
  // Words a count doesn't change: units, and nouns the same in both forms.
  var SAME_PLURAL = /^(?:g|kg|mg|ml|l|oz|lbs?|qt|pt|tbsp|tsp|cm|mm|in|ft|dozen|naan|sushi|fish|sheep|deer|bread|dough|rice)$/i;
  var IRREGULAR = { loaf: 'loaves', half: 'halves', leaf: 'leaves', knife: 'knives', shelf: 'shelves', potato: 'potatoes', tomato: 'tomatoes', person: 'people' };

  // "2¼" is 2.25; FRACTIONS has the characters.
  function yieldValue(t) {
    var whole = parseFloat(t) || 0, ch = t.charAt(t.length - 1);
    FRACTIONS.forEach(function (pair) { if (pair[1] === ch) whole += pair[0]; });
    return whole;
  }
  // A scaled amount, rounded by what it measures. Cups and the other
  // imperial units take a mixed number ("1 cup" at 1.5× is "1½ cups",
  // formatFraction), L and kg one decimal place, ml and g a whole number.
  // A count (drinks, buns) stays whole if it was ("1 drink" at 1.5× is "2
  // drinks"). So does one that restates a measured amount (exact), as in
  // "about ⅓ cup (1 pizza)": the cups take a fraction and the count rounds
  // ("about ½ cup (2 pizzas)"), since nobody makes half a pizza or buys
  // half a tub.
  var IMPERIAL_UNIT = /^(?:cups?|qts?|quarts?|pts?|pints?|oz|lbs?|tbsp|tsp|gal)$/i;
  function yieldUnit(after) {
    var m = /^\s*([a-z]+)\b/i.exec(after || '');
    return m ? m[1] : '';
  }
  function isMeasured(after) {
    return IMPERIAL_UNIT.test(yieldUnit(after)) || /^(?:l|kg|ml|g|mg)$/i.test(yieldUnit(after));
  }
  // Cups and spoons come in eighths and thirds, so a yield snaps to the
  // nearest of those, never a sixth ("⅓ cup" at 2.5× is "⅞ cup").
  var KITCHEN_STEPS = [0, 1 / 8, 1 / 4, 1 / 3, 3 / 8, 1 / 2, 5 / 8, 2 / 3, 3 / 4, 7 / 8, 1];
  function kitchenFraction(v) {
    var whole = Math.floor(v), frac = v - whole, best = 0;
    KITCHEN_STEPS.forEach(function (step) { if (Math.abs(frac - step) < Math.abs(frac - best)) best = step; });
    return formatFraction(whole + best);
  }
  function yieldFormat(written, v, after, exact) {
    var unit = yieldUnit(after);
    if (IMPERIAL_UNIT.test(unit)) return kitchenFraction(v);
    if (/^(?:l|kg)$/i.test(unit)) return String(Math.round(v * 10) / 10);
    if (/^(?:ml|g|mg)$/i.test(unit)) return String(Math.max(1, Math.round(v)));
    if (exact) return String(Math.max(1, Math.round(v)));
    if (/\D$/.test(written)) return kitchenFraction(v);
    if (/^\d+$/.test(written)) return String(Math.max(1, Math.round(v)));
    return String(Math.round(v * 10) / 10);
  }
  function englishPage() {
    var lang = (document.documentElement.lang || 'en').toLowerCase();
    return lang === 'en' || lang.indexOf('en-') === 0;
  }
  function pluralWord(w) {
    if (IRREGULAR[w]) return IRREGULAR[w];
    if (/(?:s|x|z|ch|sh)$/.test(w)) return w + 'es';
    if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
    return w + 's';
  }
  function singularWord(w) {
    for (var k in IRREGULAR) if (IRREGULAR[k] === w) return k;
    if (/[^aeiou]ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (/(?:ss|x|z|ch|sh)es$/.test(w)) return w.slice(0, -2);
    if (/[^s]s$/.test(w)) return w.slice(0, -1);
    return w;
  }
  // The words after a count, made to agree with its new value: plural
  // over 1, singular at 1 or under ("¾ cup", "1½ cups"). The noun is the
  // last word before "of", "for" and the like ("1 cherry pie", "1 pan of
  // buns"); a unit ("1 L", "1 kg potatoes") or "dozen" leaves it alone.
  var NOUN_END = /^(?:of|for|to|with|per|each|depending|or|and)$/;
  function agree(text, was, now) {
    if (!englishPage() || (was > 1) === (now > 1)) return text;
    var m = /^(\s+)([^(,]*)/.exec(text);
    if (!m) return text;
    var words = m[2].split(/(\s+)/), last = -1;
    for (var i = 0; i < words.length; i += 2) {
      if (NOUN_END.test(words[i])) break;
      if (words[i]) last = i;
    }
    if (last < 0 || !/^[a-z]+$/.test(words[last]) || SAME_PLURAL.test(words[0]) || /\bdozen\b/.test(m[2])) return text;
    words[last] = now > 1 ? pluralWord(words[last]) : singularWord(words[last]);
    return m[1] + words.join('') + text.slice(m[0].length);
  }
  // Past 1000, millilitres and grams read as litres and kilograms.
  function biggerUnit(out, after) {
    var m = /^(\s*)(ml|g)\b/i.exec(after), v = parseFloat(out);
    if (!m || !(v >= 1000) || !/^[\d.]+$/.test(out)) return null;
    return String(Math.round(v / 100) / 10) + m[1] + (m[2].toLowerCase() === 'ml' ? 'L' : 'kg') + after.slice(m[0].length);
  }
  // One amount, or a range, followed by its words: "8 hot dog buns".
  function scaleAmount(lo, hi, after, scale, exact) {
    var out;
    if (hi !== undefined) {
      var low = Math.max(1, Math.floor(yieldValue(lo) * scale)), high = Math.ceil(yieldValue(hi) * scale);
      // A range that closes up at a small scale ("1–2" at ½×) is one number.
      if (low < high) return low + '–' + high + after;
      lo = hi;
      out = String(Math.max(1, high));
    } else {
      out = yieldFormat(lo, yieldValue(lo) * scale, after, exact);
    }
    return biggerUnit(out, after) || out + agree(after, yieldValue(lo), yieldValue(out));
  }

  function scaleYield(raw, scale) {
    var m = new RegExp('^((?:about|~)\\s*)?(' + YIELD_NUM + ')(?:\\s*[–-]\\s*(' + YIELD_NUM + '))?(\\s+\\S.*)?$').exec((raw || '').trim());
    if (!m) return null;
    var prefix = m[1] || '', rest = m[4] || '';
    var paren = rest.indexOf('(');
    var words = paren < 0 ? rest : rest.slice(0, paren), tail = paren < 0 ? '' : rest.slice(paren);
    // The lead's own words run to the first alternative.
    var alt = /,\s*(?:(?:or|and)\s+)?(?=(?:about\s+|~)?\d)|\s+(?:or|and)\s+(?=(?:about\s+|~)?\d)/.exec(words);
    var own = alt ? words.slice(0, alt.index) : words, more = alt ? words.slice(alt.index) : '';
    var measured = isMeasured(own);
    more = more.replace(new RegExp('(,\\s*(?:(?:or|and)\\s+)?|\\s+(?:or|and)\\s+)((?:about\\s+|~)?)(' + YIELD_NUM + ')(?:\\s*[–-]\\s*(' + YIELD_NUM + '))?([^,]*?)(?=,|\\s+(?:or|and)\\s+|$)', 'g'),
      function (all, sep, pre, lo, hi, after) { return sep + pre + scaleAmount(lo, hi, after, scale); });
    tail = tail.replace(/\(([^()]*)\)/g, function (all, inner) {
      if (/\beach\b|\bper\b|portion|serving|×|\d\s*x\s*\d|\//i.test(inner)) return all;
      return '(' + inner.replace(new RegExp('^((?:makes\\s+)?(?:about\\s+|~)?)(' + YIELD_NUM + ')(?:\\s*[–-]\\s*(' + YIELD_NUM + '))?(.*)$'),
        function (a, pre, lo, hi, after) { return pre + scaleAmount(lo, hi, after, scale, measured); }) + ')';
    });
    return prefix + scaleAmount(m[2], m[3], own, scale) + more + tail;
  }

  // Scale and units both live with the ingredient list now (buildPopupMenu
  // below) — the sidebar tried Units on its own for a round, but with
  // Scale already gone it didn't earn a separate box, so it left too. One
  // combined surface again, same as before that split existed.
  function buildControlSurface() {
    var frag = document.createDocumentFragment();

    // Scale: label and current value on one row, the slider, a label
    // under each whole step, then the yield line ("Serves 4–6 · 9
    // patties"), which only shows when the recipe's servings or portions
    // can be scaled (scaleYield).
    var scaleGroup = document.createElement('div');
    scaleGroup.className = 'ing-config-group';
    var scaleHead = document.createElement('div');
    scaleHead.className = 'ing-config-head';
    var scaleLabel = document.createElement('label');
    scaleLabel.className = 'ing-config-label';
    scaleLabel.textContent = phrase('scale', 'Scale');
    var scaleValue = document.createElement('span');
    scaleValue.className = 'ing-scale-value mono';
    scaleHead.appendChild(scaleLabel);
    scaleHead.appendChild(scaleValue);
    scaleGroup.appendChild(scaleHead);

    var scaleSlider = document.createElement('input');
    scaleSlider.type = 'range';
    scaleSlider.className = 'ing-scale-range';
    scaleSlider.id = 'ing-scale-range';
    scaleLabel.htmlFor = scaleSlider.id;
    scaleSlider.min = String(SCALE_MIN);
    scaleSlider.max = String(SCALE_MAX);
    scaleSlider.step = String(SCALE_STEP);
    scaleGroup.appendChild(scaleSlider);

    var ticks = document.createElement('div');
    ticks.className = 'ing-scale-ticks mono';
    ticks.setAttribute('aria-hidden', 'true');
    var scaleTicks = [];
    for (var t = SCALE_MIN; t <= SCALE_MAX; t++) {
      var tick = document.createElement('span');
      tick.textContent = String(t);
      tick.dataset.step = String(t);
      ticks.appendChild(tick);
      scaleTicks.push(tick);
    }
    scaleGroup.appendChild(ticks);

    var yieldLine = document.createElement('p');
    yieldLine.className = 'ing-yield';
    yieldLine.hidden = true;
    scaleGroup.appendChild(yieldLine);
    frag.appendChild(scaleGroup);

    var unitsGroup = document.createElement('div');
    unitsGroup.className = 'ing-config-group ing-config-group--units';
    var unitsLabel = document.createElement('div');
    unitsLabel.className = 'ing-config-label';
    unitsLabel.id = 'ing-units-label';
    unitsLabel.textContent = phrase('units', 'Units');
    unitsGroup.appendChild(unitsLabel);
    // A segmented control: every option on one row, one tap to switch.
    var unitsRow = document.createElement('div');
    unitsRow.className = 'ing-units';
    unitsRow.setAttribute('role', 'group');
    unitsRow.setAttribute('aria-labelledby', unitsLabel.id);
    var unitOptions = [
      ['original', phrase('as_written', 'As written')], ['metric', phrase('metric', 'Metric')], ['imperial', phrase('imperial', 'Imperial')]
    ];
    if (ENABLE_KELVIN) unitOptions.push(['kelvin', phrase('kelvin', 'Kelvin')]);
    var unitButtons = unitOptions.map(function (pair) {
      var btn = buildUnitButton(pair[1], pair[0]);
      unitsRow.appendChild(btn);
      return btn;
    });
    unitsGroup.appendChild(unitsRow);
    frag.appendChild(unitsGroup);

    return {
      frag: frag, scaleSlider: scaleSlider, scaleValue: scaleValue,
      scaleTicks: scaleTicks, yieldLine: yieldLine, unitButtons: unitButtons
    };
  }

  // Which units the row offers, by the base's family. The written unit is
  // added if it's something else ("2 tbsp shoyu"), so the field can start in it.
  var PERCENT_UNITS = { mass: ['g', 'kg', 'lb'], volume: ['ml', 'l', 'cup'] };

  function percentUnits(base) {
    var units = PERCENT_UNITS[base.family];
    return units.indexOf(base.unit) === -1 ? [base.unit].concat(units) : units;
  }

  // Empty, zero, a range or a word gives null, and the table holds its last
  // good amounts. "1,5" and ".5" are numbers; so is the "1." of a "1.36"
  // still being typed.
  function parseFieldAmount(text) {
    var t = text.trim().replace(',', '.').replace(/\.$/, '').replace(/^\./, '0.');
    var parsed = parseQtyToken(t);
    return parsed && parsed.kind === 'single' && parsed.value > 0 ? parsed.value : null;
  }

  // Below this, the units stack under the amount: beside it, they'd run off
  // a phone's edge. They're in another cell then, so CSS alone can't do it.
  var PERCENT_STACK_QUERY = '(max-width: 680px)';
  var REVERT_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path></svg>';

  // "Scale based on ground pork [amount] [g kg lb]", the last row of the table's
  // <thead>, under the headings, so each part lines up with its column at any width: the name
  // over the names, the multiplier over the %, the amount over the amounts,
  // the units over the Notes, or beside the amount if there are none. A <td>
  // row, so the <th>s are still just the table's headings. Print hides it;
  // the table prints at the amount shown. Added after enhanceTable has put in
  // the checkbox column, whose cell here stays empty. `t` is findPercentBase's.
  function buildPercentRow(base, t) {
    function element(tag, className) {
      var el = document.createElement(tag);
      el.className = className;
      return el;
    }
    var headRow = t.table.tHead.rows[0];
    var tr = element('tr', 'ing-pct-row');
    var cells = Array.prototype.map.call(headRow.children, function () {
      return tr.appendChild(document.createElement('td'));
    });
    // The columns findPercentBase counted, plus the checkbox column.
    var nameCell = cells[1], multCell = cells[t.pctCol + 1], amountCell = cells[t.amountCol + 1];
    var notesCell = cells[t.amountCol + 2] || null;
    cells[0].className = 'ing-check-cell';

    nameCell.className = 'ing-pct-name';
    nameCell.textContent = phrase('scale_based_on', 'Scale based on {name}', { name: base.name });

    var mult = element('span', 'ing-pct-mult mono');
    mult.hidden = true;
    multCell.appendChild(mult);

    var input = element('input', 'ing-pct-input mono');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', phrase('amount_of', 'Amount of {name}', { name: base.name }));
    var stack = element('div', 'ing-pct-stack');
    stack.appendChild(input);
    amountCell.className = 'ing-pct-amount';
    amountCell.appendChild(stack);

    var controls = element('div', 'ing-pct-controls');
    var unitsRow = element('span', 'ing-units ing-pct-units');
    unitsRow.setAttribute('role', 'group');
    unitsRow.setAttribute('aria-label', phrase('unit_of', 'Unit of {name}', { name: base.name }));
    var unitButtons = percentUnits(base).map(function (key) {
      var btn = buildUnitButton(UNIT_LABELS[key][0], key);
      delete btn.dataset.units;
      btn.dataset.baseUnit = key;
      unitsRow.appendChild(btn);
      return btn;
    });
    controls.appendChild(unitsRow);

    var reset = element('button', 'ing-pct-reset');
    reset.type = 'button';
    reset.innerHTML = REVERT_ICON;
    reset.title = phrase('back_to', 'Back to {amount}', { amount: base.written });
    reset.setAttribute('aria-label', reset.title);
    controls.appendChild(reset);

    var narrow = window.matchMedia(PERCENT_STACK_QUERY);
    function place() {
      tr.classList.toggle('is-stacked', narrow.matches);
      (notesCell && !narrow.matches ? notesCell : stack).appendChild(controls);
    }
    narrow.addEventListener('change', place);
    place();

    headRow.parentNode.appendChild(tr);
    return { input: input, unitButtons: unitButtons, mult: mult, reset: reset };
  }

  // Owns the scale/units state for the whole page (a multi-component
  // recipe, e.g. dal-tadka's "## Dal" / "## Tadka", has several ingredient
  // headings, but scaling/units is a whole-recipe operation) and
  // re-renders every .qty/.temp in the document on change. One control
  // surface (buildPopupMenu, next to the first Ingredients heading) —
  // an earlier round of this branch also mounted a second, chrome-free
  // surface in the sidebar, which is why this is still a small
  // attach/apply object rather than a single closure.
  //
  // `percent` is the page's percentage tables (findPercentBase), or empty.
  // With any, the first one's base sets the scale: amount typed / amount
  // written, with no floor or cap. It's the written amounts that scale, not
  // the % column (yeast is 1.7% of 600 g, or 10.2 g, and the recipe says 10
  // g), so the written batch reads exactly as written. Their amounts ignore
  // Units, which only picks the field's starting unit: imperial would turn
  // 1.3 g of white pepper into 0.05 oz.
  // A polite status line, visually hidden, for changes made away from
  // where they show: scaling or switching units rewrites amounts all over
  // the page, which a screen reader otherwise doesn't hear. Debounced, so
  // dragging the slider reads only where it stops.
  var liveRegion = null;
  var liveTimer = null;
  function announce(text) {
    if (!liveRegion) {
      liveRegion = document.createElement('p');
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);
    }
    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () { liveRegion.textContent = text; }, 500);
  }

  function createScaleUnitsController(pageKey, percent) {
    // Units are a general taste, kept site-wide (like the theme toggle);
    // scale is specific to this recipe's yield, kept per-page.
    var scaleKey = 'ing:scale:' + pageKey;
    var unitsKey = 'ing:units';

    function readScale() {
      try {
        var v = parseFloat(localStorage.getItem(scaleKey));
        return Math.min(SCALE_MAX, Math.max(SCALE_MIN, v || SCALE_MIN));
      } catch (e) { return SCALE_MIN; }
    }
    function readUnits() {
      try {
        var v = localStorage.getItem(unitsKey);
        if (v === 'kelvin' && !ENABLE_KELVIN) return 'original';
        return (v === 'metric' || v === 'imperial' || v === 'kelvin') ? v : 'original';
      } catch (e) { return 'original'; }
    }

    var state = { scale: percent.length ? 1 : readScale(), units: readUnits() };
    var surface = null;
    var row = null;

    // The base, in its family's canonical unit (grams or ml), and the
    // cook's amount: remembered as an amount, not a scale, so it still means
    // what they have if the written recipe changes.
    var amountKey = 'ing:amount:' + pageKey;
    var base = null;
    if (percent.length) {
      var baseQty = percent[0].qty;
      var written = baseQty.cloneNode(true);
      renderQty(written, 1, 'original');
      base = {
        name: percent[0].name,
        unit: baseQty.dataset.qtyUnit,
        family: UNIT_INFO[baseQty.dataset.qtyUnit].family,
        amount: parseFloat(baseQty.dataset.qtyValue) * UNIT_INFO[baseQty.dataset.qtyUnit].base,
        written: written.textContent
      };
      state.amount = base.amount;
      state.fieldUnit = startUnit();
      try {
        var saved = JSON.parse(localStorage.getItem(amountKey));
        if (saved && saved.amount > 0 && percentUnits(base).indexOf(saved.unit) !== -1) {
          state.amount = saved.amount;
          state.fieldUnit = saved.unit;
          state.scale = scaleFor(saved.amount);
        }
      } catch (e) {}
    }

    function startUnit() {
      if (state.units === 'imperial') return base.family === 'mass' ? 'lb' : 'cup';
      return base.unit;
    }
    // Exactly 1 at the written amount, which is what turns everything back
    // to its written form.
    function scaleFor(amount) {
      return Math.abs(amount - base.amount) < base.amount * 1e-6 ? 1 : amount / base.amount;
    }
    function saveAmount() {
      try {
        if (state.scale === 1 && state.fieldUnit === startUnit()) localStorage.removeItem(amountKey);
        else localStorage.setItem(amountKey, JSON.stringify({ amount: state.amount, unit: state.fieldUnit }));
      } catch (e) {}
    }
    function fieldValue() {
      var value = state.amount / UNIT_INFO[state.fieldUnit].base;
      var fine = state.fieldUnit === 'g' || state.fieldUnit === 'ml';
      return String(parseFloat(value.toFixed(fine ? 1 : 2)));
    }

    function syncRow() {
      if (!row) return;
      // Touches values only: the field being typed in keeps its text and caret.
      if (document.activeElement !== row.input) {
        row.input.value = fieldValue();
        row.input.removeAttribute('aria-invalid');
      }
      row.unitButtons.forEach(function (btn) {
        var on = btn.dataset.baseUnit === state.fieldUnit;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', String(on));
      });
      var changed = state.scale !== 1;
      row.mult.textContent = parseFloat(state.scale.toFixed(2)) + '×';
      row.mult.hidden = !changed;
      // Its space stays, so the units don't move as an amount is typed.
      row.reset.style.visibility = changed ? '' : 'hidden';
    }

    // "Per 1 kg" becomes "For 1.36kg"; "Example: 250 ml shoyu", "For 400ml
    // shoyu". Each table's own heading amount scales, so a page's second
    // table reads right too.
    function renderPercentHeads() {
      percent.forEach(function (t) {
        var head = t.head;
        if (!head) return;
        if (state.scale === 1) {
          head.th.innerHTML = head.written;
          return;
        }
        renderQty(head.qty, state.scale, 'original', true);
        head.th.innerHTML = phrase('for_amount', 'For {amount}', { amount: head.qty.outerHTML }) + head.after;
      });
    }

    // The recipe's yield, from the sidebar's meta rows (single.html).
    function metaBase(id, attr) {
      var el = document.getElementById(id);
      return el ? el.getAttribute(attr) : null;
    }
    var servingsBase = metaBase('recipe-meta-servings', 'data-servings-base');
    var portionsBase = metaBase('recipe-meta-portions', 'data-portions-base');

    function yieldText() {
      var parts = [];
      var serves = scaleYield(servingsBase, state.scale);
      var makes = scaleYield(portionsBase, state.scale);
      if (serves) parts.push(phrase('serves', 'Serves {n}', { n: serves }));
      if (makes) parts.push(makes);
      return parts.join(' · ');
    }

    function syncControls() {
      syncRow();
      if (!surface) return;
      var s = surface.scaleSlider;
      s.value = String(state.scale);
      s.setAttribute('aria-valuetext', formatScaleValue(state.scale));
      // Filled track up to the thumb (fugu.css reads --fill).
      s.style.setProperty('--fill', ((state.scale - SCALE_MIN) / (SCALE_MAX - SCALE_MIN) * 100) + '%');
      surface.scaleValue.textContent = formatScaleValue(state.scale);
      surface.scaleTicks.forEach(function (tick) {
        tick.classList.toggle('is-current', Number(tick.dataset.step) === state.scale);
      });
      var y = yieldText();
      surface.yieldLine.textContent = y;
      surface.yieldLine.hidden = !y;
      surface.unitButtons.forEach(function (btn) {
        var on = btn.dataset.units === state.units;
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', String(on));
      });
    }

    function apply() {
      document.querySelectorAll('.qty').forEach(function (qty) {
        if (qty.closest('.ing-pct-head')) return;
        var inPercent = qty.closest('.ing-table--percent');
        // Rounded everywhere once a typed amount scales the page: 1.67× would
        // otherwise leave "583.33g" in the Method.
        renderQty(qty, state.scale, inPercent ? 'original' : state.units, base && state.scale !== 1);
      });
      renderPercentHeads();
      document.querySelectorAll('.temp').forEach(function (temp) {
        renderTemp(temp, state.units);
      });
      // The sidebar's Serves row listens for this (automagic-sidebar.js).
      document.dispatchEvent(new CustomEvent('recipe:scale', {
        detail: {
          scale: state.scale,
          servings: scaleYield(servingsBase, state.scale),
          portions: scaleYield(portionsBase, state.scale)
        }
      }));
      syncControls();
    }

    // "Scaled to 2×", with the yield when there is one ("Serves 8").
    function announceScale() {
      var y = yieldText();
      announce(phrase('scale_now', 'Scaled to {n}', { n: formatScaleValue(state.scale) }) + (y ? '. ' + y.replace(/ · /g, ', ') : ''));
    }

    function attachSurface(s) {
      surface = s;
      surface.scaleSlider.addEventListener('input', function () {
        state.scale = parseFloat(surface.scaleSlider.value);
        try { localStorage.setItem(scaleKey, String(state.scale)); } catch (e) {}
        apply();
        announceScale();
      });
      surface.unitButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.units = btn.dataset.units;
          try { localStorage.setItem(unitsKey, state.units); } catch (e) {}
          apply();
          announce(phrase('units_now', 'Units: {name}', { name: btn.textContent }));
        });
      });
    }

    function attachRow(r) {
      row = r;
      row.input.addEventListener('input', function () {
        var value = parseFieldAmount(row.input.value);
        if (value === null) {
          row.input.setAttribute('aria-invalid', 'true');
          return;
        }
        row.input.removeAttribute('aria-invalid');
        state.amount = value * UNIT_INFO[state.fieldUnit].base;
        state.scale = scaleFor(state.amount);
        saveAmount();
        apply();
        announceScale();
      });
      // Leaving the field shows the amount in force, tidied or restored.
      row.input.addEventListener('blur', syncRow);
      // The same amount in another unit: nothing else on the page changes.
      row.unitButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.fieldUnit = btn.dataset.baseUnit;
          saveAmount();
          syncRow();
        });
      });
      row.reset.addEventListener('click', function () {
        state.amount = base.amount;
        state.scale = 1;
        state.fieldUnit = startUnit();
        saveAmount();
        apply();
        row.input.focus();
      });
    }

    return { attachSurface: attachSurface, attachRow: attachRow, base: base, apply: apply };
  }

  // The gear-icon disclosure, anchored next to the first Ingredients
  // heading — the only place Scale/Units live (see createScaleUnitsController).
  function buildPopupMenu(controller) {
    var details = document.createElement('details');
    details.className = 'ing-config';

    var summary = document.createElement('summary');
    summary.className = 'ing-config-btn';
    summary.setAttribute('aria-label', phrase('ingredient_options', 'Ingredient options: scale recipe or change units'));
    summary.innerHTML = GEAR_ICON;
    details.appendChild(summary);

    var panel = document.createElement('div');
    panel.className = 'ing-config-panel';
    var surface = buildControlSurface();
    panel.appendChild(surface.frag);
    details.appendChild(panel);

    // Escape closes the callout and hands focus back to the gear.
    details.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !details.open) return;
      details.open = false;
      summary.focus();
    });

    // A click anywhere outside the open callout closes it, as a menu would;
    // <details> alone stays open. Clicks inside are left to the browser.
    document.addEventListener('click', function (e) {
      if (details.open && !details.contains(e.target)) details.open = false;
    });
    // So does tabbing out of it, or it stays open over the ingredients.
    details.addEventListener('focusout', function (e) {
      if (details.open && e.relatedTarget && !details.contains(e.relatedTarget)) details.open = false;
    });

    controller.attachSurface(surface);
    return details;
  }

  // --- Keep the screen awake -----------------------------------------------
  //
  // A small switch beside the gear (.ing-awake, aria-pressed) that holds a
  // screen Wake Lock while it's on, so the phone doesn't dim mid-recipe.
  // The browser drops the lock whenever the page is hidden, so it's taken
  // again when the page comes back, while the switch is still on. Not
  // remembered: each visit starts off. Only where the API exists; without
  // it (or without JS) there's no switch. Cook mode (PLAN.md, Features) is the large
  // version of this.
  var AWAKE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"></circle>' +
    '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>' +
    '</svg>';

  function buildAwakeSwitch() {
    if (!('wakeLock' in navigator)) return null;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'ing-awake';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', phrase('keep_awake', 'Keep screen awake'));
    button.title = button.getAttribute('aria-label');
    button.innerHTML = AWAKE_ICON;
    var lock = null;
    var on = false;

    function acquire() {
      navigator.wakeLock.request('screen').then(function (l) {
        // Off by now, or a quicker on/off/on already holds one: let it go.
        if (!on || lock) { l.release(); return; }
        lock = l;
        lock.addEventListener('release', function () { lock = null; });
      }).catch(function () {
        // Refused (battery saver, or the page isn't visible): show it off.
        on = false;
        button.setAttribute('aria-pressed', 'false');
      });
    }

    button.addEventListener('click', function () {
      on = !on;
      button.setAttribute('aria-pressed', String(on));
      if (on) acquire();
      else if (lock) { lock.release(); lock = null; }
    });
    document.addEventListener('visibilitychange', function () {
      if (on && !lock && document.visibilityState === 'visible') acquire();
    });
    return button;
  }

  // --- Personal notes ----------------------------------------------------
  //
  // A blockquote in a recipe's intro (the prose before the first H2 —
  // Ingredients, or a multi-component recipe's first "## ComponentName")
  // holds personal notes, like family history, that a site may not want in
  // front of every reader. They're hidden here, client-side, unless the
  // site sets params.fugu.hideIntroQuotes = false (single.html then adds
  // data-show-intro-quotes). This only hides them: the text is still in
  // the HTML, the search index, and the RSS feed, so it isn't private.
  // `.hidden`, not a CSS class, matches how the sidebar slots are
  // hidden/shown (automagic-sidebar.js).
  function hideIntroQuotes(article) {
    if (article.dataset.showIntroQuotes === 'true') return;
    var el = article.firstElementChild;
    while (el && el.tagName !== 'H2') {
      if (el.tagName === 'BLOCKQUOTE') el.hidden = true;
      el = el.nextElementSibling;
    }
  }

  // A top-level section whose title is in params.fugu.headings.hidden
  // ("## History" by default; render-heading.html flags its H2 with
  // data-hide-heading) is the same kind of personal note as the intro
  // blockquotes above, just further down the page — hidden the same way,
  // by walking forward to the next H2 rather than relocating it anywhere.
  function hideHiddenSections(article) {
    article.querySelectorAll('h2[data-hide-heading="true"]').forEach(function (h2) {
      h2.hidden = true;
      var el = h2.nextElementSibling;
      while (el && el.tagName !== 'H2') {
        el.hidden = true;
        el = el.nextElementSibling;
      }
    });
  }

  function init() {
    var root = document.querySelector('.article-content[data-page-key]');
    if (!root) return;
    var pageKey = root.dataset.pageKey;
    ENABLE_KELVIN = root.dataset.enableKelvin === 'true';
    if (root.dataset.unitSpacing === 'spaced') UNIT_SPACING = 'spaced';

    hideIntroQuotes(root);
    hideHiddenSections(root);

    var percent = [];
    function addTable(table) {
      var base = enhanceTable(table, pageKey);
      if (base) percent.push(base);
    }

    var headings = root.querySelectorAll('h2[data-ing-heading="true"]');
    headings.forEach(function (h2) {
      var el = h2.nextElementSibling;
      while (el && el.tagName !== 'H2') {
        if (el.tagName === 'UL') {
          enhanceList(el, pageKey);
        } else if (el.tagName === 'TABLE') {
          addTable(el);
        } else if (el.classList.contains('table-scroll') && el.querySelector(':scope > table')) {
          // render-table.html wraps every table in a scroll container.
          addTable(el.querySelector(':scope > table'));
        } else if (!/^H[1-6]$/.test(el.tagName)) {
          // A multi-component recipe (docs/recipe-format.md) has no separate "Method"
          // heading — the component's own heading ("## Cake", "## Icing")
          // covers both its ingredients list and its prose method, so any
          // non-list, non-heading content here (the method paragraphs) needs
          // the same temp/qty scanning a data-method-heading section gets
          // below, or its temperatures/quantities never become convertible.
          enhanceProseText(el);
        }
        el = el.nextElementSibling;
      }
    });

    // Unlike the ingredient walk above, this doesn't stop only at the next
    // H2 — docs/recipe-format.md's optional sections ("## Variations", "## Notes")
    // are meant to be H2 siblings, but real recipes sometimes use a lower
    // heading level for them (H3 "### Variations"), and Method has no
    // documented convention for sub-headings the way an ingredient
    // component grouping does. So any heading at all ends the section here
    // — converting units into a stray "Variations" paragraph would be a
    // real content bug, not just a harmless stray style.
    var methodHeadings = root.querySelectorAll('h2[data-method-heading="true"]');
    methodHeadings.forEach(function (h2) {
      var el = h2.nextElementSibling;
      while (el && !/^H[1-6]$/.test(el.tagName)) {
        enhanceProseText(el);
        el = el.nextElementSibling;
      }
    });

    // Always run the scale/units pipeline (a Method section needs its
    // quantities/temperatures rendered even on the rare recipe with no
    // Ingredients heading to anchor the popup to); the popup itself only
    // mounts when there's a heading to attach it to.
    var controller = createScaleUnitsController(pageKey, percent);
    // The gear and the awake switch sit beside the first ingredients
    // heading, not in it: a heading can't hold a <details>, and their
    // labels would be read as part of its name. The heading and its
    // controls share a .ing-heading wrapper, made only now, after the walks
    // above (and automagic-sidebar.js's), which step from heading to
    // heading through its siblings. The CSS places the controls as before.
    var tools = null;
    function headingTools() {
      if (tools) return tools;
      var h2 = headings[0];
      tools = document.createElement('div');
      tools.className = 'ing-heading';
      h2.parentNode.insertBefore(tools, h2);
      tools.appendChild(h2);
      return tools;
    }
    // A percentage page has one row in its first table and no menu: the row
    // sets the scale, and a saved Units setting still applies. Scale is
    // page-wide, so a second table follows from its own written amounts.
    if (controller.base) {
      controller.attachRow(buildPercentRow(controller.base, percent[0]));
    } else if (headings.length) {
      headingTools().appendChild(buildPopupMenu(controller));
    }
    // The awake switch sits beside the gear, or alone in its place on a
    // percentage page, which has no gear.
    var awake = headings.length && buildAwakeSwitch();
    if (awake) {
      if (controller.base) awake.classList.add('ing-awake--alone');
      headingTools().appendChild(awake);
    }
    controller.apply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
