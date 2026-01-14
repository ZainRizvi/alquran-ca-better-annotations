import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Import the module
const BracketLogic = require('./content.js');

// ============================================
// PURE FUNCTION TESTS
// ============================================

describe('hasWordCharacters', () => {
  const { hasWordCharacters } = BracketLogic;

  it('returns true for English text', () => {
    expect(hasWordCharacters('hello')).toBe(true);
  });

  it('returns true for Arabic text', () => {
    expect(hasWordCharacters('مرحبا')).toBe(true);
  });

  it('returns false for only whitespace', () => {
    expect(hasWordCharacters('   ')).toBe(false);
  });

  it('returns false for only punctuation', () => {
    expect(hasWordCharacters('.,!?')).toBe(false);
  });

  it('returns true for text with numbers', () => {
    expect(hasWordCharacters('test123')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(hasWordCharacters('')).toBe(false);
  });

  it('returns false for only numbers', () => {
    expect(hasWordCharacters('123')).toBe(false);
  });

  it('returns true for mixed punctuation and letters', () => {
    expect(hasWordCharacters('...hello...')).toBe(true);
  });
});

describe('isOnlyWhitespaceOrPunctuation', () => {
  const { isOnlyWhitespaceOrPunctuation } = BracketLogic;

  it('returns true for empty string', () => {
    expect(isOnlyWhitespaceOrPunctuation('')).toBe(true);
  });

  it('returns true for only whitespace', () => {
    expect(isOnlyWhitespaceOrPunctuation('   ')).toBe(true);
  });

  it('returns true for only sentence punctuation', () => {
    expect(isOnlyWhitespaceOrPunctuation('.!?')).toBe(true);
  });

  it('returns true for mixed whitespace and punctuation', () => {
    expect(isOnlyWhitespaceOrPunctuation(' . ')).toBe(true);
  });

  it('returns false for text with letters', () => {
    expect(isOnlyWhitespaceOrPunctuation('hello')).toBe(false);
  });

  it('returns false for comma (not sentence-ending)', () => {
    expect(isOnlyWhitespaceOrPunctuation(',')).toBe(false);
  });
});

describe('extractTrailing', () => {
  const { extractTrailing } = BracketLogic;

  it('extracts trailing period', () => {
    expect(extractTrailing('text.')).toEqual({ trimmed: 'text', trailing: '.' });
  });

  it('extracts trailing period and space', () => {
    expect(extractTrailing('text. ')).toEqual({ trimmed: 'text', trailing: '. ' });
  });

  it('extracts trailing space only', () => {
    expect(extractTrailing('text ')).toEqual({ trimmed: 'text', trailing: ' ' });
  });

  it('extracts all trailing punctuation for multiple dots', () => {
    // Based on regex /^(.*?)([\s.!?]*)$/s - this is greedy on trailing
    expect(extractTrailing('text...')).toEqual({ trimmed: 'text', trailing: '...' });
  });

  it('returns empty trailing for no trailing chars', () => {
    expect(extractTrailing('text')).toEqual({ trimmed: 'text', trailing: '' });
  });

  it('extracts trailing exclamation and question marks', () => {
    expect(extractTrailing('text?!')).toEqual({ trimmed: 'text', trailing: '?!' });
  });

  it('handles empty string', () => {
    expect(extractTrailing('')).toEqual({ trimmed: '', trailing: '' });
  });

  it('extracts multiple trailing spaces', () => {
    expect(extractTrailing('text   ')).toEqual({ trimmed: 'text', trailing: '   ' });
  });
});

describe('extractLeading', () => {
  const { extractLeading } = BracketLogic;

  it('extracts single leading space', () => {
    expect(extractLeading(' text')).toEqual({ leading: ' ', trimmed: 'text' });
  });

  it('extracts multiple leading spaces', () => {
    expect(extractLeading('  text')).toEqual({ leading: '  ', trimmed: 'text' });
  });

  it('returns empty leading for no leading whitespace', () => {
    expect(extractLeading('text')).toEqual({ leading: '', trimmed: 'text' });
  });

  it('handles empty string', () => {
    expect(extractLeading('')).toEqual({ leading: '', trimmed: '' });
  });

  it('handles only whitespace', () => {
    expect(extractLeading('   ')).toEqual({ leading: '   ', trimmed: '' });
  });

  it('extracts tabs as leading whitespace', () => {
    expect(extractLeading('\ttext')).toEqual({ leading: '\t', trimmed: 'text' });
  });
});

// ============================================
// DOM FUNCTION TESTS
// ============================================

describe('isItalicAnnotation', () => {
  const { isItalicAnnotation, PROCESSED_ATTR } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('returns true for <i> element with content', () => {
    const el = document.createElement('i');
    el.textContent = 'annotation';
    expect(isItalicAnnotation(el)).toBe(true);
  });

  it('returns true for <em> element with content', () => {
    const el = document.createElement('em');
    el.textContent = 'annotation';
    expect(isItalicAnnotation(el)).toBe(true);
  });

  it('returns false for non-italic element', () => {
    const el = document.createElement('span');
    el.textContent = 'text';
    expect(isItalicAnnotation(el)).toBe(false);
  });

  it('returns false for already processed element', () => {
    const el = document.createElement('i');
    el.textContent = 'annotation';
    el.setAttribute(PROCESSED_ATTR, 'true');
    expect(isItalicAnnotation(el)).toBe(false);
  });

  it('returns false for MuiTypography-titleArabic class', () => {
    const el = document.createElement('i');
    el.textContent = 'annotation';
    el.classList.add('MuiTypography-titleArabic');
    expect(isItalicAnnotation(el)).toBe(false);
  });

  it('returns false for empty italic', () => {
    const el = document.createElement('i');
    expect(isItalicAnnotation(el)).toBe(false);
  });

  it('returns false for whitespace-only italic', () => {
    const el = document.createElement('i');
    el.textContent = '   ';
    expect(isItalicAnnotation(el)).toBe(false);
  });

  it('returns false for null element', () => {
    expect(isItalicAnnotation(null)).toBe(false);
  });

  it('returns false for undefined element', () => {
    expect(isItalicAnnotation(undefined)).toBe(false);
  });
});

describe('processItalics - single element', () => {
  const { processItalics, BRACKET_OPEN, BRACKET_CLOSE } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('adds brackets around single italic element', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = 'annotation';
    div.appendChild(italic);
    div.appendChild(document.createTextNode(' normal text'));
    document.body.appendChild(div);

    processItalics(document);

    const openBracket = document.querySelector(`[${BRACKET_OPEN}]`);
    const closeBracket = document.querySelector(`[${BRACKET_CLOSE}]`);

    expect(openBracket).not.toBeNull();
    expect(closeBracket).not.toBeNull();
    expect(openBracket.textContent).toBe('[');
    expect(closeBracket.textContent).toBe(']');
  });

  it('adds brackets around single em element', () => {
    const div = document.createElement('div');
    const em = document.createElement('em');
    em.textContent = 'annotation';
    div.appendChild(em);
    document.body.appendChild(div);

    processItalics(document);

    const openBracket = document.querySelector(`[${BRACKET_OPEN}]`);
    const closeBracket = document.querySelector(`[${BRACKET_CLOSE}]`);

    expect(openBracket).not.toBeNull();
    expect(closeBracket).not.toBeNull();
  });

  it('skips empty italic element', () => {
    const div = document.createElement('div');
    const emptyItalic = document.createElement('i');
    const realItalic = document.createElement('i');
    realItalic.textContent = 'real';
    div.appendChild(emptyItalic);
    div.appendChild(realItalic);
    document.body.appendChild(div);

    processItalics(document);

    const brackets = document.querySelectorAll(`[${BRACKET_OPEN}], [${BRACKET_CLOSE}]`);
    expect(brackets.length).toBe(2); // Only one pair for "real"

    const text = document.body.textContent;
    expect(text).toContain('[real]');
  });

  it('excludes Arabic title class from bracketing', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = 'عربي';
    italic.classList.add('MuiTypography-titleArabic');
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const openBracket = document.querySelector(`[${BRACKET_OPEN}]`);
    expect(openBracket).toBeNull();
  });
});

describe('processItalics - adjacent element merging', () => {
  const { processItalics, BRACKET_OPEN, BRACKET_CLOSE } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('merges adjacent italics with only space between', () => {
    const div = document.createElement('div');
    const i1 = document.createElement('i');
    i1.textContent = 'one';
    const i2 = document.createElement('i');
    i2.textContent = 'two';
    div.appendChild(i1);
    div.appendChild(document.createTextNode(' '));
    div.appendChild(i2);
    document.body.appendChild(div);

    processItalics(document);

    const openBrackets = document.querySelectorAll(`[${BRACKET_OPEN}]`);
    const closeBrackets = document.querySelectorAll(`[${BRACKET_CLOSE}]`);

    // Should be single bracket pair
    expect(openBrackets.length).toBe(1);
    expect(closeBrackets.length).toBe(1);

    const text = document.body.textContent;
    expect(text).toContain('[one');
    expect(text).toContain('two]');
  });

  it('merges adjacent italics with comma between', () => {
    const div = document.createElement('div');
    const i1 = document.createElement('i');
    i1.textContent = 'one';
    const i2 = document.createElement('i');
    i2.textContent = 'two';
    div.appendChild(i1);
    div.appendChild(document.createTextNode(', '));
    div.appendChild(i2);
    document.body.appendChild(div);

    processItalics(document);

    const openBrackets = document.querySelectorAll(`[${BRACKET_OPEN}]`);
    const closeBrackets = document.querySelectorAll(`[${BRACKET_CLOSE}]`);

    // Should be single bracket pair (comma doesn't have word characters)
    expect(openBrackets.length).toBe(1);
    expect(closeBrackets.length).toBe(1);
  });

  it('does not merge adjacent italics with word between', () => {
    const div = document.createElement('div');
    const i1 = document.createElement('i');
    i1.textContent = 'one';
    const i2 = document.createElement('i');
    i2.textContent = 'two';
    div.appendChild(i1);
    div.appendChild(document.createTextNode(' word '));
    div.appendChild(i2);
    document.body.appendChild(div);

    processItalics(document);

    const openBrackets = document.querySelectorAll(`[${BRACKET_OPEN}]`);
    const closeBrackets = document.querySelectorAll(`[${BRACKET_CLOSE}]`);

    // Should be two separate bracket pairs
    expect(openBrackets.length).toBe(2);
    expect(closeBrackets.length).toBe(2);
  });

  it('merges mixed i and em elements', () => {
    const div = document.createElement('div');
    const i = document.createElement('i');
    i.textContent = 'one';
    const em = document.createElement('em');
    em.textContent = 'two';
    div.appendChild(i);
    div.appendChild(document.createTextNode(' '));
    div.appendChild(em);
    document.body.appendChild(div);

    processItalics(document);

    const openBrackets = document.querySelectorAll(`[${BRACKET_OPEN}]`);
    const closeBrackets = document.querySelectorAll(`[${BRACKET_CLOSE}]`);

    expect(openBrackets.length).toBe(1);
    expect(closeBrackets.length).toBe(1);
  });
});

describe('normalizeBracketBoundaries - trailing normalization', () => {
  const { processItalics, BRACKET_CLOSE } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('moves trailing period outside bracket', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = 'text.';
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const closeBracket = document.querySelector(`[${BRACKET_CLOSE}]`);
    const nextText = closeBracket.nextSibling;

    expect(nextText).not.toBeNull();
    expect(nextText.textContent).toContain('.');
  });

  it('moves trailing space outside bracket', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = 'text ';
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const closeBracket = document.querySelector(`[${BRACKET_CLOSE}]`);
    const nextText = closeBracket.nextSibling;

    // Trailing space should be moved outside
    expect(nextText).not.toBeNull();
    expect(nextText.textContent).toContain(' ');
  });

  it('moves trailing question mark outside bracket', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = 'really?';
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const closeBracket = document.querySelector(`[${BRACKET_CLOSE}]`);
    const nextText = closeBracket.nextSibling;

    expect(nextText).not.toBeNull();
    expect(nextText.textContent).toContain('?');
  });

  it('moves trailing exclamation outside bracket', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = 'wow!';
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const closeBracket = document.querySelector(`[${BRACKET_CLOSE}]`);
    const nextText = closeBracket.nextSibling;

    expect(nextText).not.toBeNull();
    expect(nextText.textContent).toContain('!');
  });

  it('handles multiple trailing punctuation', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = 'text...';
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const closeBracket = document.querySelector(`[${BRACKET_CLOSE}]`);
    const nextText = closeBracket.nextSibling;

    // All trailing punctuation should be moved outside
    expect(nextText).not.toBeNull();
    expect(nextText.textContent).toContain('...');
  });
});

describe('normalizeBracketBoundaries - leading normalization', () => {
  const { processItalics, BRACKET_OPEN } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('moves leading space outside bracket', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = ' text';
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const openBracket = document.querySelector(`[${BRACKET_OPEN}]`);
    const prevText = openBracket.previousSibling;

    // Leading space should be moved before the bracket
    expect(prevText).not.toBeNull();
    expect(prevText.textContent).toContain(' ');
  });

  it('moves multiple leading spaces outside bracket', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = '  text';
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const openBracket = document.querySelector(`[${BRACKET_OPEN}]`);
    const prevText = openBracket.previousSibling;

    expect(prevText).not.toBeNull();
    expect(prevText.textContent).toContain('  ');
  });
});

describe('processItalics - cross-container merging', () => {
  const { processItalics, BRACKET_OPEN, BRACKET_CLOSE } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('merges brackets across containers when only whitespace between', () => {
    const div1 = document.createElement('div');
    div1.className = 'c1';
    const i1 = document.createElement('i');
    i1.textContent = 'one';
    div1.appendChild(i1);

    const div2 = document.createElement('div');
    div2.className = 'c2';
    const i2 = document.createElement('i');
    i2.textContent = 'two';
    div2.appendChild(i2);

    document.body.appendChild(div1);
    document.body.appendChild(document.createTextNode(' '));
    document.body.appendChild(div2);

    processItalics(document);

    const openBrackets = document.querySelectorAll(`[${BRACKET_OPEN}]`);
    const closeBrackets = document.querySelectorAll(`[${BRACKET_CLOSE}]`);

    // Cross-container merge should reduce to single bracket pair
    expect(openBrackets.length).toBe(1);
    expect(closeBrackets.length).toBe(1);
  });

  it('does not merge brackets across containers when word between', () => {
    const div1 = document.createElement('div');
    div1.className = 'c1';
    const i1 = document.createElement('i');
    i1.textContent = 'one';
    div1.appendChild(i1);

    const div2 = document.createElement('div');
    div2.className = 'c2';
    const i2 = document.createElement('i');
    i2.textContent = 'two';
    div2.appendChild(i2);

    document.body.appendChild(div1);
    document.body.appendChild(document.createTextNode(' word '));
    document.body.appendChild(div2);

    processItalics(document);

    const openBrackets = document.querySelectorAll(`[${BRACKET_OPEN}]`);
    const closeBrackets = document.querySelectorAll(`[${BRACKET_CLOSE}]`);

    // Should remain as two separate bracket pairs
    expect(openBrackets.length).toBe(2);
    expect(closeBrackets.length).toBe(2);
  });
});

describe('processItalics - nested elements', () => {
  const { processItalics, BRACKET_OPEN, BRACKET_CLOSE } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('handles nested elements inside italic', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.appendChild(document.createTextNode('text '));
    const bold = document.createElement('b');
    bold.textContent = 'bold';
    italic.appendChild(bold);
    italic.appendChild(document.createTextNode(' more'));
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const openBracket = document.querySelector(`[${BRACKET_OPEN}]`);
    const closeBracket = document.querySelector(`[${BRACKET_CLOSE}]`);

    expect(openBracket).not.toBeNull();
    expect(closeBracket).not.toBeNull();

    // Content should still be inside brackets
    const text = document.body.textContent;
    expect(text).toContain('[text');
    expect(text).toContain('more]');
  });
});

describe('processItalics - Unicode and special characters', () => {
  const { processItalics, BRACKET_OPEN, BRACKET_CLOSE } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('handles Arabic text in annotation', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = 'السلام عليكم';
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const openBracket = document.querySelector(`[${BRACKET_OPEN}]`);
    const closeBracket = document.querySelector(`[${BRACKET_CLOSE}]`);

    expect(openBracket).not.toBeNull();
    expect(closeBracket).not.toBeNull();
  });

  it('handles non-breaking space (char code 160) as trailing', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    // \u00A0 is non-breaking space
    italic.textContent = 'text\u00A0';
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const openBracket = document.querySelector(`[${BRACKET_OPEN}]`);
    const closeBracket = document.querySelector(`[${BRACKET_CLOSE}]`);

    expect(openBracket).not.toBeNull();
    expect(closeBracket).not.toBeNull();

    // The &nbsp; should be handled (moved outside or kept)
    const closeBracketNext = closeBracket.nextSibling;
    // Note: extractTrailing uses \s which includes \u00A0
    expect(closeBracketNext?.textContent).toContain('\u00A0');
  });
});

describe('processItalics - idempotency', () => {
  const { processItalics, BRACKET_OPEN, BRACKET_CLOSE } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('does not double-process already processed elements', () => {
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = 'annotation';
    div.appendChild(italic);
    document.body.appendChild(div);

    // Process twice
    processItalics(document);
    processItalics(document);

    const openBrackets = document.querySelectorAll(`[${BRACKET_OPEN}]`);
    const closeBrackets = document.querySelectorAll(`[${BRACKET_CLOSE}]`);

    // Should still only have one pair of brackets
    expect(openBrackets.length).toBe(1);
    expect(closeBrackets.length).toBe(1);
  });
});

describe('canMergeNodes', () => {
  const { canMergeNodes } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('returns true for empty array', () => {
    expect(canMergeNodes([])).toBe(true);
  });

  it('returns true for whitespace text node', () => {
    const textNode = document.createTextNode('   ');
    expect(canMergeNodes([textNode])).toBe(true);
  });

  it('returns true for punctuation text node', () => {
    const textNode = document.createTextNode(', ');
    expect(canMergeNodes([textNode])).toBe(true);
  });

  it('returns false for text node with word characters', () => {
    const textNode = document.createTextNode('word');
    expect(canMergeNodes([textNode])).toBe(false);
  });

  it('returns false for element with word characters', () => {
    const span = document.createElement('span');
    span.textContent = 'word';
    expect(canMergeNodes([span])).toBe(false);
  });
});

describe('edge cases', () => {
  const { processItalics, BRACKET_OPEN, BRACKET_CLOSE } = BracketLogic;

  let dom;
  let document;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('handles italic immediately followed by another italic (no space)', () => {
    const div = document.createElement('div');
    const i1 = document.createElement('i');
    i1.textContent = 'one';
    const i2 = document.createElement('i');
    i2.textContent = 'two';
    div.appendChild(i1);
    div.appendChild(i2);
    document.body.appendChild(div);

    processItalics(document);

    const openBrackets = document.querySelectorAll(`[${BRACKET_OPEN}]`);
    const closeBrackets = document.querySelectorAll(`[${BRACKET_CLOSE}]`);

    // Should merge since nothing between them
    expect(openBrackets.length).toBe(1);
    expect(closeBrackets.length).toBe(1);
  });

  it('handles multiple spaces between italics', () => {
    const div = document.createElement('div');
    const i1 = document.createElement('i');
    i1.textContent = 'one';
    const i2 = document.createElement('i');
    i2.textContent = 'two';
    div.appendChild(i1);
    div.appendChild(document.createTextNode('    '));
    div.appendChild(i2);
    document.body.appendChild(div);

    processItalics(document);

    const openBrackets = document.querySelectorAll(`[${BRACKET_OPEN}]`);
    const closeBrackets = document.querySelectorAll(`[${BRACKET_CLOSE}]`);

    // Should merge since only whitespace between
    expect(openBrackets.length).toBe(1);
    expect(closeBrackets.length).toBe(1);
  });

  it('handles three consecutive italics', () => {
    const div = document.createElement('div');
    const i1 = document.createElement('i');
    i1.textContent = 'one';
    const i2 = document.createElement('i');
    i2.textContent = 'two';
    const i3 = document.createElement('i');
    i3.textContent = 'three';
    div.appendChild(i1);
    div.appendChild(document.createTextNode(' '));
    div.appendChild(i2);
    div.appendChild(document.createTextNode(' '));
    div.appendChild(i3);
    document.body.appendChild(div);

    processItalics(document);

    const openBrackets = document.querySelectorAll(`[${BRACKET_OPEN}]`);
    const closeBrackets = document.querySelectorAll(`[${BRACKET_CLOSE}]`);

    // Should all merge into one
    expect(openBrackets.length).toBe(1);
    expect(closeBrackets.length).toBe(1);
  });

  it('handles italic with only punctuation content', () => {
    // Based on isItalicAnnotation: checks textContent.trim() is truthy
    // Punctuation isn't empty, so it should get brackets
    const div = document.createElement('div');
    const italic = document.createElement('i');
    italic.textContent = '...';
    div.appendChild(italic);
    document.body.appendChild(div);

    processItalics(document);

    const openBracket = document.querySelector(`[${BRACKET_OPEN}]`);
    expect(openBracket).not.toBeNull();
  });
});
