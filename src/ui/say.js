// Seora's speech bubble: one short line above her head for a few seconds.
export function createSay(el) {
  let timer = null;
  return {
    show(text, seconds = 5) {
      el.textContent = text;
      el.classList.add('on');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
    },
    // card: world.update's heroCard (the sprite on screen), or null for the paper model,
    // which stands a little under the middle of the view.
    place(card) {
      const top = card
        ? innerHeight / 2 - card.up * innerHeight - (card.height * innerHeight) / 2
        : innerHeight * 0.42;
      el.style.top = `${Math.max(70, top).toFixed(0)}px`;
    },
  };
}
