import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

const BracketLogic = require('./content.js');

// ============================================
// PURE FUNCTION TESTS (minimal, focused)
// ============================================

describe('hasWordCharacters', () => {
  const { hasWordCharacters } = BracketLogic;

  it('returns true for English text', () => {
    expect(hasWordCharacters('hello')).toBe(true);
  });

  it('returns true for Arabic text', () => {
    expect(hasWordCharacters('مرحبا')).toBe(true);
  });

  it('returns false for whitespace and punctuation', () => {
    expect(hasWordCharacters('   ')).toBe(false);
    expect(hasWordCharacters('.,!?')).toBe(false);
    expect(hasWordCharacters(', ')).toBe(false);
    expect(hasWordCharacters('')).toBe(false);
  });
});

describe('extractTrailing', () => {
  const { extractTrailing } = BracketLogic;

  it('extracts sentence-ending punctuation (. ! ?)', () => {
    expect(extractTrailing('text.')).toEqual({ trimmed: 'text', trailing: '.' });
    expect(extractTrailing('text!')).toEqual({ trimmed: 'text', trailing: '!' });
    expect(extractTrailing('text?')).toEqual({ trimmed: 'text', trailing: '?' });
  });

  it('extracts trailing whitespace', () => {
    expect(extractTrailing('text ')).toEqual({ trimmed: 'text', trailing: ' ' });
    expect(extractTrailing('text  ')).toEqual({ trimmed: 'text', trailing: '  ' });
  });

  it('extracts combined whitespace and punctuation', () => {
    expect(extractTrailing('text. ')).toEqual({ trimmed: 'text', trailing: '. ' });
  });

  it('does NOT extract commas (they stay inside)', () => {
    expect(extractTrailing('text,')).toEqual({ trimmed: 'text,', trailing: '' });
  });

  it('returns empty trailing when nothing to extract', () => {
    expect(extractTrailing('text')).toEqual({ trimmed: 'text', trailing: '' });
  });
});

describe('extractLeading', () => {
  const { extractLeading } = BracketLogic;

  it('extracts leading whitespace', () => {
    expect(extractLeading(' text')).toEqual({ leading: ' ', trimmed: 'text' });
    expect(extractLeading('  text')).toEqual({ leading: '  ', trimmed: 'text' });
  });

  it('returns empty leading when no whitespace', () => {
    expect(extractLeading('text')).toEqual({ leading: '', trimmed: 'text' });
  });
});

// ============================================
// REQUIREMENT-BASED TESTS
// ============================================

describe('REQUIREMENT: Brackets around italic annotations', () => {
  const { processItalics, BRACKET_OPEN } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('adds brackets around <i> elements', () => {
    document.body.innerHTML = '<div><i>annotation</i> normal text</div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[annotation\]/);
  });

  it('adds brackets around <em> elements', () => {
    document.body.innerHTML = '<div><em>annotation</em> normal text</div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[annotation\]/);
  });

  it('skips empty italic elements', () => {
    document.body.innerHTML = '<div><i></i><i>real</i></div>';
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(1);
  });

  it('skips whitespace-only italic elements', () => {
    document.body.innerHTML = '<div><i>   </i><i>real</i></div>';
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(1);
  });
});

describe('REQUIREMENT: Arabic title class excluded', () => {
  const { processItalics, BRACKET_OPEN } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('does NOT bracket elements with MuiTypography-titleArabic class', () => {
    document.body.innerHTML = '<div><i class="MuiTypography-titleArabic">عربي</i></div>';
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(0);
  });
});

describe('REQUIREMENT: Adjacent italics merge when only whitespace/punctuation between', () => {
  const { processItalics, BRACKET_OPEN } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('merges when only space between', () => {
    document.body.innerHTML = '<div><i>one</i> <i>two</i></div>';
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(1);
    expect(document.body.textContent).toMatch(/\[one two\]/);
  });

  it('merges when only comma between', () => {
    document.body.innerHTML = '<div><i>one</i>, <i>two</i></div>';
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(1);
    expect(document.body.textContent).toMatch(/\[one, two\]/);
  });

  it('does NOT merge when word between', () => {
    document.body.innerHTML = '<div><i>one</i> word <i>two</i></div>';
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(2);
    expect(document.body.textContent).toMatch(/\[one\] word \[two\]/);
  });

  it('merges mixed <i> and <em> elements', () => {
    document.body.innerHTML = '<div><i>one</i> <em>two</em></div>';
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(1);
  });

  it('merges three consecutive italic elements', () => {
    document.body.innerHTML = '<div><i>one</i> <i>two</i> <i>three</i></div>';
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(1);
    expect(document.body.textContent).toMatch(/\[one two three\]/);
  });
});

describe('REQUIREMENT: Sentence punctuation moves OUTSIDE bracket', () => {
  const { processItalics } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('period moves outside: [text]. not [text.]', () => {
    document.body.innerHTML = '<div><i>text.</i></div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[text\]\./);
  });

  it('question mark moves outside: [text]? not [text?]', () => {
    document.body.innerHTML = '<div><i>text?</i></div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[text\]\?/);
  });

  it('exclamation moves outside: [text]! not [text!]', () => {
    document.body.innerHTML = '<div><i>text!</i></div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[text\]!/);
  });
});

describe('REQUIREMENT: Comma stays INSIDE bracket', () => {
  const { processItalics } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('comma at end stays inside: [text,] not [text],', () => {
    document.body.innerHTML = '<div><i>text,</i> more</div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[text,\] more/);
  });

  it('comma mid-annotation stays inside', () => {
    document.body.innerHTML = '<div><i>O Muhammad, as for</i> those</div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[O Muhammad, as for\] those/);
  });
});

describe('REQUIREMENT: Whitespace moves outside brackets', () => {
  const { processItalics } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('trailing space moves outside', () => {
    document.body.innerHTML = '<div><i>text </i>more</div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[text\] more/);
  });

  it('leading space moves outside', () => {
    document.body.innerHTML = '<div>before<i> text</i></div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/before \[text\]/);
  });
});

describe('REQUIREMENT: Cross-container merging', () => {
  const { processItalics, BRACKET_OPEN } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('merges across container boundaries when only whitespace between', () => {
    document.body.innerHTML = `
      <div class="line1"><i>to believers and</i></div>
      <div class="line2"><i>unbelievers</i></div>
    `;
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(1);
  });

  it('does NOT merge across containers when word between', () => {
    document.body.innerHTML = `
      <div class="line1"><i>one</i></div>
      word between
      <div class="line2"><i>two</i></div>
    `;
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(2);
  });
});

describe('REQUIREMENT: Idempotent processing', () => {
  const { processItalics, BRACKET_OPEN } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('running twice does not double-bracket', () => {
    document.body.innerHTML = '<div><i>annotation</i></div>';
    processItalics(document);
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(1);
  });
});

describe('REQUIREMENT: Handles nested elements inside italic', () => {
  const { processItalics } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('brackets annotation with nested <b> element', () => {
    document.body.innerHTML = '<div><i>text <b>bold</b> more</i></div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[text bold more\]/);
  });
});

describe('REQUIREMENT: Unicode support', () => {
  const { processItalics, BRACKET_OPEN } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('brackets Arabic annotation text', () => {
    document.body.innerHTML = '<div><i>السلام عليكم</i></div>';
    processItalics(document);
    expect(document.querySelectorAll(`[${BRACKET_OPEN}]`).length).toBe(1);
  });

  it('handles non-breaking space as trailing whitespace', () => {
    document.body.innerHTML = '<div><i>text\u00A0</i>more</div>';
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[text\]/);
  });
});

// ============================================
// REAL-WORLD HTML STRUCTURE TESTS
// ============================================

describe('Real-world: Site HTML structure', () => {
  const { processItalics } = BracketLogic;
  let document;

  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    document = dom.window.document;
  });

  it('handles itemT class structure from alquran.ca', () => {
    document.body.innerHTML = `
      <div class="itemT1 allITems">This Book, <em>the Qur'ān</em>, <em>is a Book</em> in which</div>
    `;
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[the Qur'ān, is a Book\]/);
  });

  it('handles verse with period at end moving outside', () => {
    document.body.innerHTML = `
      <div class="itemT">guard themselves <i>against displeasing Allāh (i.e., muttaqīn).</i></div>
    `;
    processItalics(document);
    expect(document.body.textContent).toMatch(/\[against displeasing Allāh \(i\.e\., muttaqīn\)\]\./);
  });

  it('handles numbered annotations like (11)', () => {
    document.body.innerHTML = `
      <div class="itemT"><i>(11)</i> And <i>remember</i> when you said</div>
    `;
    processItalics(document);
    const text = document.body.textContent;
    expect(text).toMatch(/\[\(11\)\]/);
    expect(text).toMatch(/\[remember\]/);
  });
});
