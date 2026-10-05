// The words first: the English dictionary is part of the page, the Japanese or Chinese one
// is fetched only when that language is in use. Everything else (start.js) loads after
// them, because sentences are made as the code loads.
import './i18n/en.js';
import { language } from './core/i18n.js';

const words = { ja: () => import('./i18n/ja.js'), zh: () => import('./i18n/zh.js') }[language()];
(words ? words() : Promise.resolve()).then(() => import('./start.js'));
