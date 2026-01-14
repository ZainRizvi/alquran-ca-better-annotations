// UMD pattern - works in browser and Node.js for testing
(function(root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    // Node.js / test environment
    module.exports = factory();
  } else {
    // Browser environment
    root.BracketLogic = factory();
    // Auto-run in browser
    if (typeof document !== 'undefined') {
      root.BracketLogic.init();
    }
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const PROCESSED_ATTR = 'data-bracket-processed';
  const BRACKET_OPEN = 'data-bracket-open';
  const BRACKET_CLOSE = 'data-bracket-close';

  // --- Pure functions (no DOM dependency) ---

  // Check if text contains any word characters (letters from any language)
  function hasWordCharacters(text) {
    return /\p{L}/u.test(text);
  }

  // Check if text is only whitespace and/or sentence-ending punctuation
  function isOnlyWhitespaceOrPunctuation(text) {
    return /^[\s.!?]*$/.test(text);
  }

  // Extract trailing whitespace and sentence punctuation from text
  // Returns { trimmed: string, trailing: string }
  function extractTrailing(text) {
    const match = text.match(/^(.*?)([\s.!?]*)$/s);
    if (match) {
      return { trimmed: match[1], trailing: match[2] };
    }
    return { trimmed: text, trailing: '' };
  }

  // Extract leading whitespace from text
  // Returns { leading: string, trimmed: string }
  function extractLeading(text) {
    const match = text.match(/^(\s*)(.*?)$/s);
    if (match) {
      return { leading: match[1], trimmed: match[2] };
    }
    return { leading: '', trimmed: text };
  }

  // --- DOM-dependent functions ---

  // Check if an element is an italic annotation (not Arabic title styling)
  function isItalicAnnotation(element) {
    if (!element || !element.tagName) return false;
    const tagName = element.tagName.toLowerCase();
    if (tagName !== 'i' && tagName !== 'em') return false;
    if (element.hasAttribute(PROCESSED_ATTR)) return false;
    if (element.classList && element.classList.contains('MuiTypography-titleArabic')) return false;
    if (!element.textContent || !element.textContent.trim()) return false;
    return true;
  }

  // Check if nodes between two italic elements contain only whitespace/punctuation
  function canMergeNodes(nodesBetween) {
    for (const node of nodesBetween) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (hasWordCharacters(node.textContent)) {
          return false;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        if (tagName !== 'i' && tagName !== 'em') {
          if (hasWordCharacters(node.textContent)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Find a group of consecutive italic elements within same parent
  function findItalicGroupInParent(startElement) {
    const group = [startElement];
    let current = startElement;

    while (true) {
      let nextItalic = null;
      let sibling = current.nextSibling;
      const nodesBetween = [];

      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE) {
          const tagName = sibling.tagName.toLowerCase();
          if ((tagName === 'i' || tagName === 'em') && isItalicAnnotation(sibling)) {
            nextItalic = sibling;
            break;
          } else if (tagName === 'i' || tagName === 'em') {
            break;
          } else {
            nodesBetween.push(sibling);
          }
        } else if (sibling.nodeType === Node.TEXT_NODE) {
          nodesBetween.push(sibling);
        }
        sibling = sibling.nextSibling;
      }

      if (nextItalic && canMergeNodes(nodesBetween)) {
        group.push(nextItalic);
        current = nextItalic;
      } else {
        break;
      }
    }

    return group;
  }

  // Create a bracket span element
  function createBracketSpan(doc, type, char) {
    const span = doc.createElement('span');
    span.setAttribute(type, 'true');
    span.textContent = char;
    return span;
  }

  // Add brackets around a group of italic elements
  function addBracketsToGroup(group, doc) {
    if (group.length === 0) return;
    doc = doc || document;

    const firstElement = group[0];
    const lastElement = group[group.length - 1];

    group.forEach(el => el.setAttribute(PROCESSED_ATTR, 'true'));

    const openBracket = createBracketSpan(doc, BRACKET_OPEN, '[');
    firstElement.parentNode.insertBefore(openBracket, firstElement);

    const closeBracket = createBracketSpan(doc, BRACKET_CLOSE, ']');
    if (lastElement.nextSibling) {
      lastElement.parentNode.insertBefore(closeBracket, lastElement.nextSibling);
    } else {
      lastElement.parentNode.appendChild(closeBracket);
    }
  }

  // Get text content between two elements by traversing DOM
  function getTextBetweenElements(startEl, endEl, doc) {
    doc = doc || document;
    let text = '';
    const treeWalker = doc.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      null,
      false
    );

    let foundStart = false;
    let node = treeWalker.currentNode;

    while (node) {
      if (node === startEl) {
        foundStart = true;
        node = treeWalker.nextNode();
        continue;
      }
      if (node === endEl) {
        break;
      }
      if (foundStart && node.nodeType === Node.TEXT_NODE) {
        if (!node.parentElement?.hasAttribute(BRACKET_OPEN) &&
            !node.parentElement?.hasAttribute(BRACKET_CLOSE)) {
          text += node.textContent;
        }
      }
      node = treeWalker.nextNode();
    }

    return text;
  }

  // Normalize text boundaries - move whitespace and punctuation outside brackets
  function normalizeBracketBoundaries(doc) {
    doc = doc || document;

    // Process closing brackets - move trailing whitespace and sentence punctuation outside
    const closeBrackets = doc.querySelectorAll('[' + BRACKET_CLOSE + ']');

    closeBrackets.forEach(closeBracket => {
      const prevSibling = closeBracket.previousSibling;
      if (!prevSibling) return;

      let textNode = null;

      if (prevSibling.nodeType === Node.TEXT_NODE) {
        textNode = prevSibling;
      } else if (prevSibling.nodeType === Node.ELEMENT_NODE) {
        const walker = doc.createTreeWalker(prevSibling, NodeFilter.SHOW_TEXT, null, false);
        let lastText = null;
        while (walker.nextNode()) {
          lastText = walker.currentNode;
        }
        textNode = lastText;
      }

      if (textNode && textNode.textContent) {
        const { trimmed, trailing } = extractTrailing(textNode.textContent);
        if (trailing && trailing.length > 0) {
          textNode.textContent = trimmed;
          const textAfter = doc.createTextNode(trailing);
          closeBracket.parentNode.insertBefore(textAfter, closeBracket.nextSibling);
        }
      }
    });

    // Process opening brackets - move leading whitespace outside
    const openBrackets = doc.querySelectorAll('[' + BRACKET_OPEN + ']');

    openBrackets.forEach(openBracket => {
      const nextSibling = openBracket.nextSibling;
      if (!nextSibling) return;

      let textNode = null;

      if (nextSibling.nodeType === Node.TEXT_NODE) {
        textNode = nextSibling;
      } else if (nextSibling.nodeType === Node.ELEMENT_NODE) {
        const walker = doc.createTreeWalker(nextSibling, NodeFilter.SHOW_TEXT, null, false);
        if (walker.nextNode()) {
          textNode = walker.currentNode;
        }
      }

      if (textNode && textNode.textContent) {
        const { leading, trimmed } = extractLeading(textNode.textContent);
        if (leading && leading.length > 0) {
          textNode.textContent = trimmed;
          const textBefore = doc.createTextNode(leading);
          openBracket.parentNode.insertBefore(textBefore, openBracket);
        }
      }
    });
  }

  // Merge brackets across container boundaries
  function mergeCrossContainerBrackets(doc) {
    doc = doc || document;

    const closeBrackets = Array.from(doc.querySelectorAll('[' + BRACKET_CLOSE + ']'));
    const openBrackets = Array.from(doc.querySelectorAll('[' + BRACKET_OPEN + ']'));

    if (closeBrackets.length === 0 || openBrackets.length === 0) return;

    const allBrackets = [...closeBrackets, ...openBrackets].sort((a, b) => {
      const pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    const toRemove = [];

    for (let i = 0; i < allBrackets.length - 1; i++) {
      const current = allBrackets[i];
      const next = allBrackets[i + 1];

      if (current.hasAttribute(BRACKET_CLOSE) && next.hasAttribute(BRACKET_OPEN)) {
        const textBetween = getTextBetweenElements(current, next, doc);

        if (!hasWordCharacters(textBetween)) {
          toRemove.push(current, next);
          i++;
        }
      }
    }

    toRemove.forEach(el => el.remove());
  }

  // Process all unprocessed italic elements
  function processItalics(doc) {
    doc = doc || document;

    const italicElements = doc.querySelectorAll('i:not([' + PROCESSED_ATTR + ']), em:not([' + PROCESSED_ATTR + '])');

    for (const element of italicElements) {
      if (!isItalicAnnotation(element)) {
        element.setAttribute(PROCESSED_ATTR, 'true');
        continue;
      }

      const group = findItalicGroupInParent(element);
      addBracketsToGroup(group, doc);
    }

    normalizeBracketBoundaries(doc);
    mergeCrossContainerBrackets(doc);
  }

  // Initialize - set up observer and run initial processing
  function init() {
    if (typeof document === 'undefined') return;

    processItalics(document);

    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName && (node.tagName.toLowerCase() === 'i' || node.tagName.toLowerCase() === 'em')) {
                shouldProcess = true;
                break;
              }
              if (node.querySelector && node.querySelector('i, em')) {
                shouldProcess = true;
                break;
              }
            }
          }
        }
        if (shouldProcess) break;
      }

      if (shouldProcess) {
        clearTimeout(observer.timeout);
        observer.timeout = setTimeout(() => processItalics(document), 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Export public API
  return {
    // Constants
    PROCESSED_ATTR,
    BRACKET_OPEN,
    BRACKET_CLOSE,

    // Pure functions
    hasWordCharacters,
    isOnlyWhitespaceOrPunctuation,
    extractTrailing,
    extractLeading,

    // DOM functions
    isItalicAnnotation,
    canMergeNodes,
    findItalicGroupInParent,
    createBracketSpan,
    addBracketsToGroup,
    getTextBetweenElements,
    normalizeBracketBoundaries,
    mergeCrossContainerBrackets,
    processItalics,
    init
  };
});
