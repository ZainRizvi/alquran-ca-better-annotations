(function() {
  'use strict';

  const PROCESSED_ATTR = 'data-bracket-processed';

  // Check if text contains only whitespace and punctuation (no word characters)
  // This regex matches if there are any word characters (letters, including Unicode)
  function hasWordCharacters(text) {
    // Match any letter from any language
    return /\p{L}/u.test(text);
  }

  // Check if an element is an italic annotation (not Arabic title styling)
  function isItalicAnnotation(element) {
    const tagName = element.tagName.toLowerCase();
    if (tagName !== 'i' && tagName !== 'em') return false;

    // Skip if already processed
    if (element.hasAttribute(PROCESSED_ATTR)) return false;

    // Skip if it's part of the Arabic title (has MuiTypography class with titleArabic)
    if (element.classList.contains('MuiTypography-titleArabic')) return false;

    // Skip if empty
    if (!element.textContent.trim()) return false;

    return true;
  }

  // Get all sibling nodes between two elements (exclusive)
  function getNodesBetween(startNode, endNode) {
    const nodes = [];
    let current = startNode.nextSibling;
    while (current && current !== endNode) {
      nodes.push(current);
      current = current.nextSibling;
    }
    return nodes;
  }

  // Check if nodes between two italic elements contain only whitespace/punctuation
  function canMerge(nodesBetween) {
    for (const node of nodesBetween) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (hasWordCharacters(node.textContent)) {
          return false;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // If there's another element between them, check if it's also italic
        const tagName = node.tagName.toLowerCase();
        if (tagName !== 'i' && tagName !== 'em') {
          // Non-italic element - check its text content
          if (hasWordCharacters(node.textContent)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Find a group of consecutive italic elements that should be merged
  function findItalicGroup(startElement) {
    const group = [startElement];
    let current = startElement;

    while (true) {
      // Look for next italic sibling
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
            // Already processed italic, stop
            break;
          } else {
            // Other element, check if we can merge through it
            nodesBetween.push(sibling);
          }
        } else if (sibling.nodeType === Node.TEXT_NODE) {
          nodesBetween.push(sibling);
        }
        sibling = sibling.nextSibling;
      }

      if (nextItalic && canMerge(nodesBetween)) {
        group.push(nextItalic);
        current = nextItalic;
      } else {
        break;
      }
    }

    return group;
  }

  // Add brackets around a group of italic elements
  function addBracketsToGroup(group) {
    if (group.length === 0) return;

    const firstElement = group[0];
    const lastElement = group[group.length - 1];

    // Mark all elements as processed
    group.forEach(el => el.setAttribute(PROCESSED_ATTR, 'true'));

    // Insert opening bracket before first element
    const openBracket = document.createTextNode('[');
    firstElement.parentNode.insertBefore(openBracket, firstElement);

    // Insert closing bracket after last element
    const closeBracket = document.createTextNode(']');
    if (lastElement.nextSibling) {
      lastElement.parentNode.insertBefore(closeBracket, lastElement.nextSibling);
    } else {
      lastElement.parentNode.appendChild(closeBracket);
    }
  }

  // Process all unprocessed italic elements on the page
  function processItalics() {
    const italicElements = document.querySelectorAll('i:not([' + PROCESSED_ATTR + ']), em:not([' + PROCESSED_ATTR + '])');

    for (const element of italicElements) {
      if (!isItalicAnnotation(element)) {
        // Mark as processed even if we skip it
        element.setAttribute(PROCESSED_ATTR, 'true');
        continue;
      }

      const group = findItalicGroup(element);
      addBracketsToGroup(group);
    }
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
            // Check if the added node contains italic elements
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
      // Debounce processing
      clearTimeout(observer.timeout);
      observer.timeout = setTimeout(processItalics, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
