// The Chinese (simplified) of the game's Korean sentences (core/i18n.js). zh.json is kept
// by build/i18n.py --lang zh: the Korean sentence is the key. Fetched only in Chinese.
import { addWords } from '../core/i18n.js';
import words from './zh.json';

addWords(words, 'zh');
