import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { photoSlides, CRAFT_SHOTS } from '../src/core/photoSlides.js';
import { FAMOUS } from '../src/core/famous.js';
import { STORIES } from '../src/core/stories.js';
import { STORY_DETAILS } from '../src/core/storyDetails.js';
import { CRAFT } from '../src/core/craft.js';

describe('the "사진 보기" key', () => {
  it('shows a place its card photo, and nothing for a body', () => {
    const slides = photoSlides({ id: 'alpineValley', kind: 'site', name: '알프스 계곡' });
    expect(slides).toHaveLength(1);
    expect(slides[0].file).toBe('stories/alpineValley.jpg');
    expect(slides[0].credit).toMatch(/^사진: /);
    expect(photoSlides({ id: 'mars', kind: 'planet', name: '화성' })).toEqual([]);
  });

  it('shows a craft the photos it took, each a file that is there', () => {
    for (const [id, keys] of Object.entries(CRAFT_SHOTS)) {
      expect(CRAFT.some((c) => c.id === id), id).toBe(true);
      for (const key of keys) expect(key.story ? STORY_DETAILS[key.story]?.photo : FAMOUS[key], JSON.stringify(key)).toBeTruthy();
      expect(photoSlides({ id, kind: 'craft', name: id })).toHaveLength(keys.length);
      for (const slide of photoSlides({ id, kind: 'craft', name: id })) expect(existsSync(`public/assets/${slide.file}`), slide.file).toBe(true);
    }
    expect(photoSlides({ id: 'voyager1', kind: 'craft', name: '보이저 1호' }).map((s) => s.title)).toEqual(['창백한 푸른 점', '태양계 가족사진', '한 장에 담긴 지구와 달']);
  });

  it("finds every place's photo on disk", () => {
    for (const story of STORIES) {
      for (const slide of photoSlides({ id: story.id, kind: 'site', name: story.name })) expect(existsSync(`public/assets/${slide.file}`), slide.file).toBe(true);
    }
  });
});
