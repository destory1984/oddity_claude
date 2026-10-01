import { STORY_DETAILS, storyPhotoFile } from '../core/storyDetails.js';

const $ = (id) => document.getElementById(id);

// The card that opens at a story place: a real photograph where there is one, and the
// longer telling (core/storyDetails.js). The game waits while it is open.
export function createStoryCard({ onOpen, onClose }) {
  const dialog = $('storyCard');
  $('closeStoryCard').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => onClose());

  return {
    isOpen: () => dialog.open,
    // story: an entry of core/stories.js STORIES.
    show(story) {
      const more = STORY_DETAILS[story.id];
      if (!more || dialog.open) return;
      $('storyCardYear').textContent = story.year ? `${story.year}년` : '';
      $('storyCardTitle').textContent = story.name;
      $('storyCardEn').textContent = story.nameEn ?? '';
      $('storyCardText').textContent = more.detail;
      const file = storyPhotoFile(story.id);
      $('storyCardFigure').hidden = !file;
      if (file) {
        $('storyCardPhoto').src = `${import.meta.env.BASE_URL}assets/${file}`;
        $('storyCardPhoto').alt = more.photo.caption;
        $('storyCardCaption').textContent = more.photo.caption;
        $('storyCardCredit').textContent = `사진: ${more.photo.credit}`;
      } else {
        $('storyCardPhoto').removeAttribute('src');
      }
      onOpen();
      dialog.showModal();
    },
  };
}
