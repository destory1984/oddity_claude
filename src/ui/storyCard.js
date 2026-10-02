import { STORY_DETAILS, storyPhotoFile } from '../core/storyDetails.js';
import { quizFor } from '../core/storyQuiz.js';

const $ = (id) => document.getElementById(id);

// The card that opens at a story place: a real photograph where there is one, and the
// longer telling (core/storyDetails.js), and under it one question whose answer is in
// the telling (core/storyQuiz.js). The game waits while it is open.
// onSolve(id): the question was answered right. isSolved(id): it was, before.
export function createStoryCard({ onOpen, onClose, onSolve = () => {}, isSolved = () => false }) {
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
      // Three choices; a wrong one shows the answer, and it can be tried again next time.
      const quiz = quizFor(story.id);
      $('storyQuiz').hidden = !quiz;
      if (quiz) {
        const solved = isSolved(story.id);
        $('storyQuizQuestion').textContent = `맞혀 보렴. ${quiz.question}`;
        $('storyQuizResult').textContent = solved ? '전에 맞힌 문제란다.' : '';
        const buttons = quiz.choices.map((choice, i) => {
          const button = document.createElement('button');
          button.textContent = choice;
          button.addEventListener('click', () => {
            const right = i === quiz.right;
            buttons[quiz.right].classList.add('right');
            if (!right) button.classList.add('wrong');
            for (const b of buttons) b.disabled = true;
            $('storyQuizResult').textContent = right ? '맞았다. 꼼꼼히 읽었구나.' : `답은 "${quiz.choices[quiz.right]}". 다음에 또 맞혀 보렴.`;
            if (right) onSolve(story.id);
          });
          return button;
        });
        if (solved) buttons[quiz.right].classList.add('right');
        $('storyQuizChoices').replaceChildren(...buttons);
      }
      onOpen();
      dialog.showModal();
    },
  };
}
