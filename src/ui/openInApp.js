import { SHARE_BASE, APP_PACKAGE, appIntent } from '../core/sharePlace.js';

const $ = (id) => document.getElementById(id);

// A place a friend sent (?p=, core/sharePlace.js) opened in a browser on an Android phone
// that has the game's app: the app takes it (the user, 2026-10-20: "앱이 깔려있는 사람은
// 자동적으로 앱이 띄워지는 방법 있던데", "그렇게 만들어"). The app already owns its
// address (an Android App Link, verified by the site's /.well-known/assetlinks.json), so
// a link tapped in a message or a mail opens it; what is left is a link opened INSIDE a
// browser, where the phone does not ask:
// - KakaoTalk's own browser: sent on at once to the phone (kakaotalk://web/openExternal),
//   which gives it to the app, or, with no app, to the phone's browser.
// - Chrome: when it says the app is there (navigator.getInstalledRelatedApps, from
//   manifest.webmanifest's related_applications), a sheet asks; "앱으로 열기" is an
//   intent:// address for the app, which Chrome follows only from a press.
// (Read as the page loads: main.js puts the address back to the game's own after.)
const query = location.search;

export function offerApp() {
  if (!new URLSearchParams(query).get('p')) return;
  if (!/Android/i.test(navigator.userAgent)) return;
  if (matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) return;
  const link = `${SHARE_BASE}${query}`;
  if (/KAKAOTALK/i.test(navigator.userAgent)) {
    location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(link)}`;
    return;
  }
  const sheet = $('appOffer');
  if (!sheet || !navigator.getInstalledRelatedApps) return;
  $('appOfferGo').addEventListener('click', () => {
    sheet.close();
    location.href = appIntent(link);
  });
  $('appOfferStay').addEventListener('click', () => sheet.close());
  navigator.getInstalledRelatedApps()
    .then((apps) => { if (apps.some((app) => app.id === APP_PACKAGE)) sheet.showModal(); })
    .catch(() => {});
}
