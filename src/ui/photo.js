import { rotateLocal } from '../core/orientation.js';

const $ = (id) => document.getElementById(id);
const DEFAULT_FOV_DEG = 60;

export function createPhoto({ world, canvas, toast, setPaused, isPaused, clearInput, onCaptured }) {
  let active = false;
  let priorPause = false;
  let orientation = [0, 0, 0, 1];

  function setFovDeg(deg) {
    const clamped = Math.max(5, Math.min(95, deg));
    world.setFov((clamped * Math.PI) / 180);
    $('fov').value = clamped;
  }

  function toggle() {
    active = !active;
    clearInput();
    if (active) {
      priorPause = isPaused();
      setPaused(true);
      orientation = [0, 0, 0, 1];
      $('hud').hidden = true;
      $('photoTools').hidden = false;
    } else {
      setPaused(priorPause);
      $('hud').hidden = false;
      $('photoTools').hidden = true;
      setFovDeg(DEFAULT_FOV_DEG);
      $('showHero').checked = true;
    }
  }

  $('fov').addEventListener('input', (e) => setFovDeg(Number(e.target.value)));
  $('exitPhoto').addEventListener('click', toggle);
  $('capture').addEventListener('click', async () => {
    const button = $('capture');
    button.disabled = true;
    // The player may leave photo mode or zoom while the image is being encoded:
    // judge the missions on the view that was on screen when the button was pressed.
    const shot = {
      orientation,
      fov: world.fov(),
      aspect: canvas.width / canvas.height,
      heroVisible: $('showHero').checked,
    };
    try {
      world.render();
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), 'image/png');
      });
      const file = new File([blob], `oddity-${new Date().toISOString().replace(/[:.]/g, '-')}.png`, { type: 'image/png' });
      const touch = document.body.classList.contains('touch');
      if (touch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Oddity' });
        } catch (e) {
          if (e.name !== 'AbortError') throw e;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast.show('화면 표시 없는 우주 사진을 저장했습니다.');
      }
      onCaptured(shot);
    } catch (e) {
      toast.show('사진을 저장하지 못했습니다. 다시 시도해 주세요.');
      console.error(e);
    } finally {
      button.disabled = false;
    }
  });

  return {
    toggle,
    active: () => active,
    orientation: () => (active ? orientation : null),
    heroVisible: () => !active || $('showHero').checked,
    rotate(dx, dy) { orientation = rotateLocal(orientation, dx, dy); },
    zoom(deltaY) { if (active) setFovDeg((world.fov() * 180) / Math.PI + deltaY * 0.03); },
    frame(deg, aim) {
      if (!active) toggle();
      orientation = aim;
      $('showHero').checked = false;
      setFovDeg(deg);
    },
  };
}
