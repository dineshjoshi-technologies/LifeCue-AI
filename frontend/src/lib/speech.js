// Lightweight wrapper around Web Speech API for opt-in voice reminders.
// Best-effort: returns false silently on browsers that don't support TTS.

let _voicesCache = null;

function loadVoices() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve([]);
    const existing = window.speechSynthesis.getVoices();
    if (existing && existing.length) {
      _voicesCache = existing;
      return resolve(existing);
    }
    const handler = () => {
      _voicesCache = window.speechSynthesis.getVoices();
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(_voicesCache || []);
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    // Safety timeout
    setTimeout(() => resolve(_voicesCache || []), 1000);
  });
}

function pickCalmVoice(voices) {
  if (!voices || !voices.length) return null;
  // Prefer a soft female English voice
  const prefs = [
    /Samantha/i, /Google US English/i, /Karen/i, /Moira/i, /Serena/i,
    /Microsoft Aria/i, /Microsoft Jenny/i, /en-GB.*Female/i, /en-US.*Female/i,
  ];
  for (const p of prefs) {
    const v = voices.find((x) => p.test(x.name + " " + x.lang));
    if (v) return v;
  }
  return voices.find((v) => /^en/i.test(v.lang)) || voices[0];
}

export async function speakReminder(text) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    // Cancel any in-flight speech to avoid pile-up
    window.speechSynthesis.cancel();
    const voices = await loadVoices();
    const utter = new SpeechSynthesisUtterance(text);
    const v = pickCalmVoice(voices);
    if (v) utter.voice = v;
    utter.rate = 0.95;
    utter.pitch = 1.0;
    utter.volume = 0.9;
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

export function isSpeechSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
