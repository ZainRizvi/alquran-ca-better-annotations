(function() {
  'use strict';

  const PROCESSED_ATTR = 'data-bracket-processed';
  const BRACKET_OPEN = 'data-bracket-open';
  const BRACKET_CLOSE = 'data-bracket-close';

  // Check if text contains only whitespace and punctuation (no word characters)
  function hasWordCharacters(text) {
    return /\p{L}/u.test(text);
  }

  // Check if an element is an italic annotation (not Arabic title styling)
  function isItalicAnnotation(element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName !== 'i' && tagName !== 'em') return false;
    if (element.hasAttribute(PROCESSED_ATTR)) return false;
    if (element.classList.contains('MuiTypography-titleArabic')) return false;
    if (!element.textContent.trim()) return false;
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
  function createBracketSpan(type, char) {
    const span = document.createElement('span');
    span.setAttribute(type, 'true');
    span.textContent = char;
    return span;
  }

  // Add brackets around a group of italic elements
  function addBracketsToGroup(group) {
    if (group.length === 0) return;

    const firstElement = group[0];
    const lastElement = group[group.length - 1];

    group.forEach(el => el.setAttribute(PROCESSED_ATTR, 'true'));

    const openBracket = createBracketSpan(BRACKET_OPEN, '[');
    firstElement.parentNode.insertBefore(openBracket, firstElement);

    const closeBracket = createBracketSpan(BRACKET_CLOSE, ']');
    if (lastElement.nextSibling) {
      lastElement.parentNode.insertBefore(closeBracket, lastElement.nextSibling);
    } else {
      lastElement.parentNode.appendChild(closeBracket);
    }
  }

  // Get text content between two elements by traversing DOM
  function getTextBetweenElements(startEl, endEl) {
    let text = '';
    const treeWalker = document.createTreeWalker(
      document.body,
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
        // Skip text inside bracket spans
        if (!node.parentElement?.hasAttribute(BRACKET_OPEN) &&
            !node.parentElement?.hasAttribute(BRACKET_CLOSE)) {
          text += node.textContent;
        }
      }
      node = treeWalker.nextNode();
    }

    return text;
  }

  // Merge brackets across container boundaries
  function mergeCrossContainerBrackets() {
    const closeBrackets = Array.from(document.querySelectorAll('[' + BRACKET_CLOSE + ']'));
    const openBrackets = Array.from(document.querySelectorAll('[' + BRACKET_OPEN + ']'));

    if (closeBrackets.length === 0 || openBrackets.length === 0) return;

    // Sort by document position
    const allBrackets = [...closeBrackets, ...openBrackets].sort((a, b) => {
      const pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });

    // Find ]...[ pairs and check if they should merge
    const toRemove = [];

    for (let i = 0; i < allBrackets.length - 1; i++) {
      const current = allBrackets[i];
      const next = allBrackets[i + 1];

      // Looking for ] followed by [
      if (current.hasAttribute(BRACKET_CLOSE) && next.hasAttribute(BRACKET_OPEN)) {
        const textBetween = getTextBetweenElements(current, next);

        if (!hasWordCharacters(textBetween)) {
          // Can merge - mark both for removal
          toRemove.push(current, next);
          i++; // Skip the open bracket we just processed
        }
      }
    }

    // Remove the bracket pairs
    toRemove.forEach(el => el.remove());
  }

  // Process all unprocessed italic elements
  function processItalics() {
    const italicElements = document.querySelectorAll('i:not([' + PROCESSED_ATTR + ']), em:not([' + PROCESSED_ATTR + '])');

    for (const element of italicElements) {
      if (!isItalicAnnotation(element)) {
        element.setAttribute(PROCESSED_ATTR, 'true');
        continue;
      }

      const group = findItalicGroupInParent(element);
      addBracketsToGroup(group);
    }

    // Second pass: merge across container boundaries
    mergeCrossContainerBrackets();
  }

  // Initial processing
  processItalics();

  // Watch for dynamic content changes
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
      observer.timeout = setTimeout(processItalics, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
