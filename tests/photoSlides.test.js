import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { photoSlides, CRAFT_SHOTS } from '../src/core/photoSlides.js';
import { FAMOUS } from '../src/core/famous.js';
import { STORIES } from '../src/core/stories.js';
import { STORY_DETAILS } from '../src/core/storyDetails.js';
import { CRAFT } from '../src/core/craft.js';
import { CRAFT_PHOTOS } from '../src/core/craftPhotos.js';
import { OBJECT_PHOTOS } from '../src/core/objectPhotos.js';
import { BODIES } from '../src/core/bodies.js';

describe('the "사진 보기" key', () => {
  it('shows a place its card photo, and a body its own', () => {
    const slides = photoSlides({ id: 'alpineValley', kind: 'site', name: '알프스 계곡' });
    expect(slides).toHaveLength(1);
    expect(slides[0].file).toBe('stories/alpineValley.jpg');
    expect(slides[0].credit).toMatch(/^사진: /);
    expect(photoSlides({ id: 'mars', kind: 'planet', name: '화성' }).map((s) => s.file)).toEqual(['objectPhotos/mars.jpg']);
  });

  it('shows a craft the photos it took, each a file that is there', () => {
    for (const [id, keys] of Object.entries(CRAFT_SHOTS)) {
      expect(CRAFT.some((c) => c.id === id), id).toBe(true);
      for (const key of keys) expect(key.story ? STORY_DETAILS[key.story]?.photo : FAMOUS[key], JSON.stringify(key)).toBeTruthy();
      for (const slide of photoSlides({ id, kind: 'craft', name: id })) expect(existsSync(`public/assets/${slide.file}`), slide.file).toBe(true);
    }
    expect(photoSlides({ id: 'voyager1', kind: 'craft', name: '보이저 1호' }).map((s) => s.title)).toEqual(['보이저 1호', '창백한 푸른 점', '태양계 가족사진', '한 장에 담긴 지구와 달']);
  });

  it('has a real photo file for every craft photo, and one for every craft', () => {
    for (const [id, { craft, shots = [] }] of Object.entries(CRAFT_PHOTOS)) {
      expect(CRAFT.some((c) => c.id === id), id).toBe(true);
      for (const photo of [...(craft ? [craft] : []), ...shots]) expect(existsSync(`public/assets/craftPhotos/${photo.file}`), photo.file).toBe(true);
    }
    for (const { id } of CRAFT) expect(photoSlides({ id, kind: 'craft', name: id }).length, id).toBeGreaterThan(0);
  });

  it('has a photo on disk for every body and the golden record', () => {
    for (const { id } of BODIES) expect(OBJECT_PHOTOS[id], id).toBeTruthy();
    for (const { file } of Object.values(OBJECT_PHOTOS)) expect(existsSync(`public/assets/objectPhotos/${file}`), file).toBe(true);
    expect(photoSlides({ id: 'goldenRecord', kind: 'curio', name: 'x' })).toHaveLength(1);
  });

  it('shows a body or a place its own photo first, then the more it has, each titled', () => {
    const bennu = photoSlides({ id: 'bennu', kind: 'asteroid', name: '베누' });
    expect(bennu.map((s) => s.file)).toEqual(['objectPhotos/bennu.jpg', 'objectPhotos/bennu-shot1.jpg', 'objectPhotos/bennu-shot2.jpg']);
    expect(bennu.map((s) => s.title)).toEqual(['베누', '베누에 닿는 순간', '베누에서 가져온 흙']);
    for (const slide of bennu) expect(slide.credit).toMatch(/^사진: /);
    for (const { id } of BODIES) {
      for (const slide of photoSlides({ id, kind: 'body', name: id })) expect(existsSync(`public/assets/${slide.file}`), slide.file).toBe(true);
    }
    const stonehenge = photoSlides({ id: 'stonehenge', kind: 'site', name: '스톤헨지' });
    expect(stonehenge.map((s) => s.file)).toEqual(['stories/stonehenge.jpg', 'placePhotos/stonehenge-2.jpg']);
    expect(stonehenge[1].title).toBe('하늘에서 본 스톤헨지');
  });

  it("finds every place's photo on disk", () => {
    for (const story of STORIES) {
      for (const slide of photoSlides({ id: story.id, kind: 'site', name: story.name })) expect(existsSync(`public/assets/${slide.file}`), slide.file).toBe(true);
    }
  });
});
