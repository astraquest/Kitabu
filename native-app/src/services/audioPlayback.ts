import { Platform } from 'react-native';
import type { AudioPlayer } from 'expo-audio';

let webAudioUnlocked = false;
let webUnlockListenersInstalled = false;

function installWebUnlockListeners() {
  if (Platform.OS !== 'web' || webUnlockListenersInstalled || typeof window === 'undefined') {
    return;
  }

  webUnlockListenersInstalled = true;
  const unlock = () => {
    webAudioUnlocked = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  window.addEventListener('touchstart', unlock);
}

export function playAudioPlayerWhenAllowed(player: AudioPlayer) {
  if (Platform.OS !== 'web') {
    player.play();
    return () => undefined;
  }

  installWebUnlockListeners();
  if (webAudioUnlocked || typeof window === 'undefined') {
    player.play();
    return () => undefined;
  }

  let active = true;
  const resume = () => {
    if (!active) return;
    active = false;
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('keydown', resume);
    window.removeEventListener('touchstart', resume);
    player.play();
  };
  window.addEventListener('pointerdown', resume);
  window.addEventListener('keydown', resume);
  window.addEventListener('touchstart', resume);

  return () => {
    if (!active) return;
    active = false;
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('keydown', resume);
    window.removeEventListener('touchstart', resume);
  };
}
