// Ingredient list decoration + checkbox persistence + recipe scaling/units.
//
// Hugo/Goldmark has no render hook for lists (only headings, links, images,
// etc.), so render-heading.html can only mark where an ingredient section
// *starts* (an h2 with data-ing-heading="true") — it can't reach into the
// <ul>/<li> markup that Goldmark renders underneath it. This script does
// that part: walk forward from each marked heading to the next h2,
// collecting the <ul> it finds, and turn it into the real component
// (checkbox, quantity span, sub-note rows) with checked state persisted
// per-browser via localStorage. See PLAN.md 6.2b.
//
// It also injects a config menu (next to the first Ingredients heading)
// that scales quantities and converts them between metric/imperial/Kelvin.
// The same engine drives two surfaces: the ingredient list (<ul>/<li>,
// walked from an "ing" heading) and inline quantities/temperatures inside
// Directions/Method prose (walked from a "method" heading, marked
// data-method-heading="true" by the same render hook). See PLAN.md's
// "Ingredient helpers" line under Phase 9.

(function () {
  // Best-effort leading-quantity matcher, built from real recipes in this
  // vault (not every case in FORMAT.md's grammar — "a pinch of", "to
  // taste" etc. have no leading number and are left unstyled, which is a
  // harmless fallback, not a broken layout).
  //
  // A mixed number's fraction is usually glued to the whole number ("1½",
  // FORMAT.md's own style), but real files sometimes type it with a space
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
  // (1 cup = 240 mL, not the precise 236.588), consistent with this
  // project's existing tolerance for ballpark-not-exact numbers (see
  // data/ingredient_prices.yaml in PLAN.md).
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

  // --- Canonical number+unit spacing --------------------------------------
  //
  // The vault's source recipes are inconsistent about this ("50ml" vs
  // "50 ml" — FORMAT.md's own examples disagree with each other too), so
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
  var UNIT_SPACING = 'glued'; // 'glued' ("50ml") | 'spaced' ("50 ml")
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
  // is a cleaned-up rendering rather than a verbatim echo.
  function renderQty(qty, scale, unitSystem) {
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

    function render(r) {
      var fmt = r.metric ? formatDecimal : formatFraction;
      return joinValueLabel(fmt(r.value), r.label, r.unit);
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
      var fmt2 = hi.metric ? formatDecimal : formatFraction;
      qty.textContent = fmt2(lo.value) + '–' + joinValueLabel(fmt2(hi.value), hi.label, hi.unit);
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

    li.appendChild(checkbox);
    li.appendChild(label);

    var key = 'ing:' + pageKey + ':' + label.textContent.trim();
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

  // A %-based ingredient table (baker's percentage — FORMAT.md's Mechanic
  // section covers the convention, e.g. lazy-pizza-dough-2022's flour/
  // water/salt breakdown) is still an ingredient list, just laid out as a
  // <table> instead of a <ul> — Goldmark's table extension renders a plain
  // <table>/<thead>/<tbody>, so this gives each body row the same
  // checkbox + localStorage persistence enhanceRow gives an <li>. Weight/
  // quantity cells ("600g") already get scaled/unit-converted without this
  // — the init() walk's non-UL branch already ran enhanceProseText(el) over
  // the whole table before TABLE got its own branch — enhanceProseText(table)
  // below just keeps that behaviour now that this function owns the walk.
  function enhanceTable(table, pageKey) {
    table.classList.add('ing-table');
    enhanceProseText(table);

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
      checkCell.appendChild(checkbox);
      tr.insertBefore(checkCell, tr.firstChild);

      var key = 'ing:' + pageKey + ':' + keyText;
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
  }

  // --- Config menu: scale recipe / change units ------------------------

  var SCALE_MIN = 1;
  var SCALE_MAX = 5;
  var SCALE_STEP = 0.5;
  // Kelvin conversion is fully implemented (toCelsius/fromCelsius above)
  // but is more of a joke than a real option for a home-cooking site — off
  // by default, flipped by single.html's data-enable-kelvin attribute
  // (config/_default/params.toml's [recipe].enableKelvin), read in init().
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
    return btn;
  }

  function formatScaleValue(n) {
    return (Number.isInteger(n) ? String(n) : n.toFixed(1)) + '×';
  }

  // Scale and units both live with the ingredient list now (buildPopupMenu
  // below) — the sidebar tried Units on its own for a round, but with
  // Scale already gone it didn't earn a separate box, so it left too. One
  // combined surface again, same as before that split existed.
  function buildControlSurface() {
    var frag = document.createDocumentFragment();

    var scaleGroup = document.createElement('div');
    scaleGroup.className = 'ing-config-group';
    var scaleLabel = document.createElement('div');
    scaleLabel.className = 'ing-config-label';
    scaleLabel.textContent = 'Scale recipe';
    scaleGroup.appendChild(scaleLabel);

    var scaleSliderRow = document.createElement('div');
    scaleSliderRow.className = 'ing-scale-slider';
    var scaleSlider = document.createElement('input');
    scaleSlider.type = 'range';
    scaleSlider.min = String(SCALE_MIN);
    scaleSlider.max = String(SCALE_MAX);
    scaleSlider.step = String(SCALE_STEP);
    var scaleValue = document.createElement('span');
    scaleValue.className = 'ing-scale-value mono';
    scaleSliderRow.appendChild(scaleSlider);
    scaleSliderRow.appendChild(scaleValue);
    scaleGroup.appendChild(scaleSliderRow);
    frag.appendChild(scaleGroup);

    var unitsGroup = document.createElement('div');
    unitsGroup.className = 'ing-config-group ing-config-group--units';
    var unitsLabel = document.createElement('div');
    unitsLabel.className = 'ing-config-label';
    unitsLabel.textContent = 'Units';
    unitsGroup.appendChild(unitsLabel);
    var unitsRow = document.createElement('div');
    unitsRow.className = 'ing-config-row';
    var unitOptions = [
      ['original', 'As written'], ['metric', 'Metric'], ['imperial', 'Imperial']
    ];
    if (ENABLE_KELVIN) unitOptions.push(['kelvin', 'Kelvin']);
    var unitButtons = unitOptions.map(function (pair) {
      var btn = buildUnitButton(pair[1], pair[0]);
      unitsRow.appendChild(btn);
      return btn;
    });
    unitsGroup.appendChild(unitsRow);
    frag.appendChild(unitsGroup);

    return { frag: frag, scaleSlider: scaleSlider, scaleValue: scaleValue, unitButtons: unitButtons };
  }

  // Owns the scale/units state for the whole page (a multi-component
  // recipe, e.g. dal-tadka's "## Dal" / "## Tadka", has several ingredient
  // headings, but scaling/units is a whole-recipe operation) and
  // re-renders every .qty/.temp in the document on change. One control
  // surface (buildPopupMenu, next to the first Ingredients heading) —
  // an earlier round of this branch also mounted a second, chrome-free
  // surface in the sidebar, which is why this is still a small
  // attach/apply object rather than a single closure; see PLAN.md/
  // STYLE.md history if that ever needs resurrecting.
  function createScaleUnitsController(pageKey) {
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

    var state = { scale: readScale(), units: readUnits() };
    var surface = null;

    function syncControls() {
      if (!surface) return;
      surface.scaleSlider.value = String(state.scale);
      surface.scaleValue.textContent = formatScaleValue(state.scale);
      surface.unitButtons.forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.units === state.units);
      });
    }

    function apply() {
      document.querySelectorAll('.qty').forEach(function (qty) {
        renderQty(qty, state.scale, state.units);
      });
      document.querySelectorAll('.temp').forEach(function (temp) {
        renderTemp(temp, state.units);
      });
      // The sidebar's Serves row listens for this (automagic-sidebar.js).
      document.dispatchEvent(new CustomEvent('recipe:scale', { detail: { scale: state.scale } }));
      syncControls();
    }

    function attachSurface(s) {
      surface = s;
      surface.scaleSlider.addEventListener('input', function () {
        state.scale = parseFloat(surface.scaleSlider.value);
        try { localStorage.setItem(scaleKey, String(state.scale)); } catch (e) {}
        apply();
      });
      surface.unitButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.units = btn.dataset.units;
          try { localStorage.setItem(unitsKey, state.units); } catch (e) {}
          apply();
        });
      });
    }

    return { attachSurface: attachSurface, apply: apply };
  }

  // The gear-icon disclosure, anchored next to the first Ingredients
  // heading — the only place Scale/Units live (see createScaleUnitsController).
  function buildPopupMenu(controller) {
    var details = document.createElement('details');
    details.className = 'ing-config';

    var summary = document.createElement('summary');
    summary.className = 'ing-config-btn';
    summary.setAttribute('aria-label', 'Ingredient options: scale recipe or change units');
    summary.innerHTML = GEAR_ICON;
    details.appendChild(summary);

    var panel = document.createElement('div');
    panel.className = 'ing-config-panel';
    var surface = buildControlSurface();
    panel.appendChild(surface.frag);
    details.appendChild(panel);

    controller.attachSurface(surface);
    return details;
  }

  // --- Family history blockquotes (intro section only) -------------------
  //
  // A blockquote in a recipe's intro (the prose before the first H2 —
  // Ingredients, or a multi-component recipe's first "## ComponentName")
  // carries family-history/provenance text migrated from the source
  // archive, e.g. content/recipes/bienenstich.md. That's not meant to
  // publish to anonymous visitors — sign-in is a future feature, so for
  // now these are just hidden client-side rather than left server-rendered
  // for anyone to read in the page source. `.hidden`, not a CSS class,
  // matches how the sidebar slots are hidden/shown (automagic-sidebar.js).
  function hideFamilyHistory(article) {
    var el = article.firstElementChild;
    while (el && el.tagName !== 'H2') {
      if (el.tagName === 'BLOCKQUOTE') el.hidden = true;
      el = el.nextElementSibling;
    }
  }

  // A top-level "## History" section (render-heading.html flags its H2 with
  // data-hide-heading) is the same family-provenance content as the intro
  // blockquotes above, just further down the page — hidden the same way,
  // by walking forward to the next H2 rather than relocating it anywhere.
  function hideHistorySections(article) {
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

    hideFamilyHistory(root);
    hideHistorySections(root);

    var headings = root.querySelectorAll('h2[data-ing-heading="true"]');
    headings.forEach(function (h2) {
      var el = h2.nextElementSibling;
      while (el && el.tagName !== 'H2') {
        if (el.tagName === 'UL') {
          enhanceList(el, pageKey);
        } else if (el.tagName === 'TABLE') {
          enhanceTable(el, pageKey);
        } else if (el.classList.contains('table-scroll') && el.querySelector(':scope > table')) {
          // render-table.html wraps every table in a scroll container.
          enhanceTable(el.querySelector(':scope > table'), pageKey);
        } else if (!/^H[1-6]$/.test(el.tagName)) {
          // A multi-component recipe (FORMAT.md) has no separate "Method"
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
    // H2 — FORMAT.md's own optional sections ("## Variations", "## Notes")
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
    var controller = createScaleUnitsController(pageKey);
    if (headings.length) {
      headings[0].appendChild(buildPopupMenu(controller));
    }
    controller.apply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
