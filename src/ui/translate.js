// In another language than Korean, every Korean text put on the page is replaced by its
// sentence in that language as it appears (core/i18n.js englishOf): the words in
// index.html, and whatever the game writes later (a button's name, a notice, what Sora
// says). A text not in the dictionary yet stays as it is. Sentences made with names or
// numbers in them are put into the language where they are made (t`…`), not here.
import { language, pageLanguage, englishOf } from '../core/i18n.js';

const ATTRIBUTES = ['title', 'aria-label', 'alt', 'placeholder', 'data-label'];
const KOREAN = /[가-힣]/;

function textNode(node) {
  const value = node.nodeValue;
  if (!value || !KOREAN.test(value)) return;
  const key = value.trim();
  const en = englishOf(key);
  if (en !== null) node.nodeValue = value.replace(key, en);
}

function attribute(el, name) {
  const value = el.getAttribute(name);
  if (!value || !KOREAN.test(value)) return;
  const en = englishOf(value);
  if (en !== null) el.setAttribute(name, en);
}

function tree(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    textNode(root);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) textNode(walker.currentNode);
  for (const el of [root, ...root.querySelectorAll('[title],[aria-label],[alt],[placeholder],[data-label]')]) {
    for (const name of ATTRIBUTES) attribute(el, name);
  }
}

export function startTranslating() {
  if (language() === 'ko') return;
  document.documentElement.lang = pageLanguage();
  const title = englishOf(document.title);
  if (title) document.title = title;
  tree(document.body);
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') textNode(record.target);
      else if (record.type === 'attributes') attribute(record.target, record.attributeName);
      else for (const node of record.addedNodes) tree(node);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTES });
}
