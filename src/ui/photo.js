import { rotateLocal } from '../core/orientation.js';
import { thumbSize } from '../core/album.js';

const $ = (id) => document.getElementById(id);
const DEFAULT_FOV_DEG = 60;
// How far the view swings round a target for a drag, against how far it turns in plain photo mode.
const ORBIT_RATE = 1.6;

export function createPhoto({ world, canvas, toast, setPaused, isPaused, clearInput, onCaptured }) {
  let active = false;
  let priorPause = false;
  let orientation = [0, 0, 0, 1];
  // Looking round a target ("확대 관찰"): { id, distanceKm, orientation }. The view
  // circles the target, which stays in the middle; null in plain photo mode.
  let orbit = null;
  const HINTS = { look: '드래그로 구도 조절 · 휠로 확대', orbit: '드래그로 둘레를 돌아보기 · 휠로 확대' };

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
      orbit = null;
      $('photoHint').textContent = HINTS.look;
      $('hud').hidden = true;
      $('photoTools').hidden = false;
    } else {
      setPaused(priorPause);
      orbit = null;
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
      orbit,
    };
    try {
      world.render();
      // A small copy for the album, taken from the same frame as the saved photo.
      try {
        const { width, height } = thumbSize(canvas.width, canvas.height);
        const small = document.createElement('canvas');
        small.width = width;
        small.height = height;
        small.getContext('2d').drawImage(canvas, 0, 0, width, height);
        shot.thumb = small.toDataURL('image/jpeg', 0.8);
      } catch {
        shot.thumb = null;
      }
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), 'image/png');
      });
      const file = new File([blob], `oddity-${new Date().toISOString().replace(/[:.]/g, '-')}.png`, { type: 'image/png' });
      const touch = document.body.classList.contains('touch');
      if (touch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Space Oddity' });
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
    rotate(dx, dy) {
      // Circling a target, the drag pulls its surface along with the pointer.
      if (orbit) orbit = { ...orbit, orientation: rotateLocal(orbit.orientation, dx * ORBIT_RATE, dy * ORBIT_RATE) };
      else orientation = rotateLocal(orientation, dx, dy);
    },
    zoom(deltaY) { if (active) setFovDeg((world.fov() * 180) / Math.PI + deltaY * 0.03); },
    orbit: () => (active ? orbit : null),
    // Look round a target from distanceKm away, starting with the view `facing` it.
    orbitAround({ id, distanceKm, facing, fovDeg }) {
      if (!active) toggle();
      orbit = { id, distanceKm, orientation: facing };
      $('photoHint').textContent = HINTS.orbit;
      $('showHero').checked = false;
      setFovDeg(fovDeg);
    },
  };
}
