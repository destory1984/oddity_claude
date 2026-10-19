// Sky news from the real calendar, told in the journal under the next eclipse: the
// nights the yearly meteor showers peak, planets standing side by side in the evening
// or morning sky, and Apophis passing Earth (the user, 2026-10-19: "다 넣어"). Days are
// Korean days. The pairings are from astronomy calendars (Venus with Saturn, Jupiter
// and Mars in 2027 and 2028; Mars with Jupiter in 2026).
import { t } from './i18n.js';
import { daysUntil, eclipseDayText } from './eclipses.js';

// [month, day, name]: the peak night, about the same each year.
const SHOWERS = [
  [1, 4, t('사분의자리 유성우가 가장 많은 밤')],
  [4, 22, t('거문고자리 유성우가 가장 많은 밤')],
  [5, 6, t('물병자리 에타 유성우가 가장 많은 밤')],
  [8, 12, t('페르세우스자리 유성우가 가장 많은 밤')],
  [10, 21, t('오리온자리 유성우가 가장 많은 밤')],
  [11, 17, t('사자자리 유성우가 가장 많은 밤')],
  [12, 14, t('쌍둥이자리 유성우가 가장 많은 밤')],
];
const ONCE = [
  ['2026-11-15', t('화성과 목성이 나란히 보이는 날')],
  ['2027-05-08', t('금성과 토성이 나란히 보이는 날')],
  ['2027-11-25', t('금성과 화성이 나란히 보이는 날')],
  ['2028-03-01', t('금성과 토성이 나란히 보이는 날')],
  ['2028-06-14', t('금성과 화성이 나란히 보이는 날')],
  ['2028-11-09', t('금성과 목성이 나란히 보이는 날')],
  ['2029-04-13', t('아포피스가 지구 곁 3만 2천km를 지나가는 날')],
];
const pad = (n) => String(n).padStart(2, '0');
export const SKY_EVENTS = [
  ...ONCE.map(([day, title]) => ({ day, title })),
  ...Array.from({ length: 10 }, (_, k) => 2026 + k).flatMap((year) => SHOWERS.map(([m, d, title]) => ({ day: `${year}-${pad(m)}-${pad(d)}`, title }))),
].sort((a, b) => a.day.localeCompare(b.day));

// The next one from the local day of `date` (today's counts), or null.
export function nextSkyEvent(date) {
  return SKY_EVENTS.find((event) => daysUntil(event, date) >= 0) ?? null;
}

// One line for the journal.
export function skyEventNews(date) {
  const event = nextSkyEvent(date);
  if (!event) return null;
  const days = daysUntil(event, date);
  if (days === 0) return t`${event.title}: 오늘 밤입니다.`;
  return t`다음 하늘 소식: ${eclipseDayText(event)} ${event.title}. ${days}일 남았습니다.`;
}
