// Counting visits (GoatCounter, no cookies). The game sends one request when it is
// opened: the page's path, its title, where the visitor came from and the screen's
// size. Nothing of the save, no name, no id. The code of the site is public (it is in
// every such page's source), not a secret.
export const COUNT_AT = 'https://goacnter.goatcounter.com/count';

// Only the real site is counted: not a dev server, not the game inside its own
// phone-shaped frame (the outer page has counted already), not a browser driven by a
// test tool.
export function shouldCount({ hostname, inFrame = false, webdriver = false }) {
  if (inFrame || webdriver) return false;
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') return false;
  return !hostname.endsWith('.localhost') && !hostname.endsWith('.test');
}

// A referrer without its query and fragment: those may hold what a visitor searched
// for or who they are.
export function plainReferrer(referrer) {
  if (!referrer) return '';
  try {
    const url = new URL(referrer);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin + url.pathname : '';
  } catch {
    return '';
  }
}

// rnd: anything that differs each time, so that no cache answers in the counter's place.
export function countUrl({ path, title = '', referrer = '', screen = null, rnd }) {
  const query = new URLSearchParams({ p: path, t: title, r: plainReferrer(referrer) });
  if (screen) query.set('s', `${screen.width},${screen.height},${screen.scale}`);
  query.set('rnd', String(rnd));
  return `${COUNT_AT}?${query}`;
}
