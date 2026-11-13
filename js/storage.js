const SETTINGS_KEY = "almathurat:settings:v1";
const PROGRESS_KEY = "almathurat:progress:v1";

export const DEFAULT_SETTINGS = Object.freeze({
  showArabic: true,
  showTransliteration: true,
  showTranslation: true,
  arabicSize: 32,
  translationSize: 17,
  theme: "auto",
  haptics: false
});

export function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (error) {
    console.error("Could not read saved settings.", error);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function todayKey() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function loadProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    if (stored.date !== todayKey()) return { date: todayKey(), sessions: { morning: {}, evening: {} } };
    return {
      date: stored.date,
      sessions: {
        morning: stored.sessions?.morning || {},
        evening: stored.sessions?.evening || {}
      }
    };
  } catch (error) {
    console.error("Could not read saved progress.", error);
    return { date: todayKey(), sessions: { morning: {}, evening: {} } };
  }
}

export function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}
