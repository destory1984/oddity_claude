import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  ALBUM_MAX, THUMB_WIDTH, addPhoto, removePhoto, sanitizeAlbum, photoCaption, thumbSize, photoPlace,
} from '../src/core/album.js';
import { MISSIONS } from '../src/core/missions.js';

const photo = (n, missions = []) => ({
  at: `2026-10-${String((n % 28) + 1).padStart(2, '0')}T12:00:00.000Z`, where: `달 상공 ${n}km`, missions, image: `data:image/jpeg;base64,AAA${n}`,
});

test('the album keeps the newest 24 photos, newest first', () => {
  assert.equal(ALBUM_MAX, 24);
  let album = [];
  for (let n = 0; n < 30; n++) album = addPhoto(album, photo(n));
  assert.equal(album.length, 24);
  assert.equal(album[0].where, '달 상공 29km');
  assert.equal(album[23].where, '달 상공 6km');
  // Adding does not change the list it was given.
  const before = [photo(1)];
  addPhoto(before, photo(2));
  assert.equal(before.length, 1);
});

test('a photo can be taken out of the album', () => {
  const album = [photo(3), photo(2), photo(1)];
  assert.deepEqual(removePhoto(album, 1).map((p) => p.where), ['달 상공 3km', '달 상공 1km']);
  assert.equal(removePhoto(album, 9).length, 3);
});

test('stored albums are cleaned: only whole entries with a JPEG, known missions, at most 24', () => {
  const good = photo(5, ['earthrise', 'earthrise', 'noSuchMission']);
  const cleaned = sanitizeAlbum([
    good, null, 'junk', { ...photo(1), image: 'javascript:alert(1)' }, { ...photo(2), at: 'yesterday' },
    { ...photo(3), where: 7 }, { at: good.at, where: 'x', image: 'data:image/png;base64,AAA' },
  ], MISSIONS);
  assert.equal(cleaned.length, 1);
  assert.deepEqual(cleaned[0].missions, ['earthrise']);
  assert.deepEqual(Object.keys(cleaned[0]).sort(), ['at', 'image', 'missions', 'where']);
  assert.deepEqual(sanitizeAlbum(null), []);
  assert.deepEqual(sanitizeAlbum({ a: 1 }), []);
  assert.equal(sanitizeAlbum(Array.from({ length: 40 }, (_, n) => photo(n)), MISSIONS).length, 24);
  assert.equal(sanitizeAlbum([{ ...photo(1), where: 'x'.repeat(200) }])[0].where.length, 60);
});

test('under a photo: the day and place, then the missions it met with their recipes', () => {
  const earthrise = MISSIONS.find((m) => m.id === 'earthrise');
  assert.ok(earthrise, 'the earthrise mission exists');
  const caption = photoCaption(photo(5, ['earthrise']), MISSIONS);
  assert.equal(caption.title, '2026-10-06 · 달 상공 5km');
  assert.deepEqual(caption.met, [{ name: earthrise.name, hint: earthrise.hint }]);
  assert.deepEqual(photoCaption(photo(5), MISSIONS).met, []);
});

test('the small copy is 480 wide and keeps the shape of the view', () => {
  assert.equal(THUMB_WIDTH, 480);
  assert.deepEqual(thumbSize(1920, 1080), { width: 480, height: 270 });
  assert.deepEqual(thumbSize(390, 844), { width: 390, height: 844 });
  assert.deepEqual(thumbSize(960, 1), { width: 480, height: 1 });
});

test('a postcard waiting for its reply is not pushed out of a full album', () => {
  const photo = (n, more = {}) => ({ at: `2026-10-0${n}T00:00:00.000Z`, where: `p${n}`, missions: [], image: 'data:image/jpeg;base64,AA', ...more });
  const full = [photo(3), photo(2, { sent: '2026-10-02' }), photo(1, { sent: '2026-10-01' })];
  // The oldest that is not waiting goes instead.
  assert.deepEqual(addPhoto(full, photo(4), 3).map((e) => e.where), ['p4', 'p2', 'p1']);
  // Answered postcards go like any other photo.
  const answered = [photo(3), photo(2), photo(1, { sent: '2026-10-01', reply: '고맙다.' })];
  assert.deepEqual(addPhoto(answered, photo(4), 3).map((e) => e.where), ['p4', 'p3', 'p2']);
  // Nothing else can go: the oldest goes after all.
  const waiting = [photo(2, { sent: '2026-10-02' }), photo(1, { sent: '2026-10-01' })];
  assert.deepEqual(addPhoto(waiting, photo(3), 2).map((e) => e.where), ['p3', 'p2']);
});

test('stored postcards keep their stars, the day sent and the reply; junk is dropped', () => {
  const base = { at: '2026-10-02T00:00:00.000Z', where: '달', missions: [], image: 'data:image/jpeg;base64,AA' };
  const [a, b, c] = sanitizeAlbum([
    { ...base, rate: { stars: 3, subject: 'moon' }, sent: '2026-10-02', reply: '별 셋.' },
    { ...base, rate: { stars: 9 }, sent: 'yesterday', reply: '가짜' },
    { ...base },
  ]);
  assert.deepEqual(a, { ...base, rate: { stars: 3, subject: 'moon' }, sent: '2026-10-02', reply: '별 셋.' });
  assert.deepEqual(b, base);
  assert.deepEqual(c, base);
});

test('where a photo was taken: the height, in 만 and 억 far out, or the craft beside her', () => {
  assert.equal(photoPlace('달 상공', 1200.4), '달 상공 1,200km');
  assert.equal(photoPlace('지구 상공', 99999), '지구 상공 99,999km');
  assert.equal(photoPlace('토성 상공', 123456), '토성에서 12만km');
  assert.equal(photoPlace('명왕성 상공', 212468948), '명왕성에서 2.1억km');
  assert.equal(photoPlace('명왕성 상공', 99996000), '명왕성에서 1.0억km');
  assert.equal(photoPlace('명왕성 상공', 99940000), '명왕성에서 9,994만km');
  assert.equal(photoPlace('명왕성 상공', 212468948, '보이저 1호'), '보이저 1호 곁');
});
