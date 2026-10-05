// The Japanese of the game's Korean sentences (core/i18n.js). ja.json is kept by
// build/i18n.py --lang ja: the Korean sentence is the key. Fetched only in Japanese.
import { addWords } from '../core/i18n.js';
import words from './ja.json';

addWords(words, 'ja');
