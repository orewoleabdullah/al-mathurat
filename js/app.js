import { isComplete, nextCount } from "./counter.js";
import { loadProgress, loadSettings, saveProgress, saveSettings } from "./storage.js";
import { renderHomeDate, renderHomeProgress, renderJumpList, renderReader, renderSettings, renderTheme, showToast, showView } from "./ui.js";

const $ = (id) => document.getElementById(id);
const sessions = { morning: [], evening: [] };
let settings = loadSettings();
let progress = loadProgress();
let activeSession = "morning";
let activeIndex = 0;
let toastTimer;

async function initialize() {
  try {
    const response = await fetch("./data/mathurat.json");
    if (!response.ok) throw new Error(`Content request failed (${response.status}).`);
    const content = await response.json();
    if (!Array.isArray(content.items) || content.items.length === 0) throw new Error("The adhkar list is empty.");
    sessions.morning = content.items.filter((item) => item.time === "both" || item.time === "morning").sort(byOrder);
    sessions.evening = content.items.filter((item) => item.time === "both" || item.time === "evening").sort(byOrder);
    for (const session of ["morning", "evening"]) {
      if (!sessions[session].length) throw new Error(`No ${session} adhkar were found.`);
    }
    settings = loadSettings();
    progress = loadProgress();
    renderTheme(settings.theme, "home");
    renderHomeDate();
    renderSettings(settings);
    renderHomeProgress(content.items, progress);
    bindEvents(content.items);
    document.documentElement.classList.add("ready");
  } catch (error) {
    console.error("Al-Ma’thurat could not start.", error);
    $("home-greeting").textContent = "The adhkar could not be loaded.";
    $("home-error").hidden = false;
    $("home-error").textContent = "Please open this app through a local or hosted web server and try again.";
  }
}

function byOrder(a, b) {
  return a.order - b.order;
}

function suggestedSession() {
  const hour = new Date().getHours();
  return hour >= 15 || hour < 5 ? "evening" : "morning";
}

function setSession(session) {
  activeSession = session;
  const counts = progress.sessions[session];
  const firstIncomplete = sessions[session].findIndex((item) => !isComplete(counts[item.id] || 0, item.repeat));
  activeIndex = firstIncomplete < 0 ? sessions[session].length - 1 : firstIncomplete;
  renderJumpList(sessions[session], sessions[session][activeIndex].id, counts);
  showView("reader");
  render(true);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function render(resetScroll = false) {
  renderReader({
    items: sessions[activeSession],
    session: activeSession,
    counts: progress.sessions[activeSession],
    index: activeIndex,
    settings
  });
  if (resetScroll) $("reader-scroll").scrollTop = 0;
}

function persistProgress() {
  try {
    saveProgress(progress);
  } catch (error) {
    console.error("Could not save reading progress.", error);
    showToast("Progress could not be saved on this device.");
  }
  renderHomeProgress([...sessions.morning, ...sessions.evening].filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index), progress);
}

function refreshProgressForNewDay() {
  const latest = loadProgress();
  if (latest.date === progress.date) return;
  progress = latest;
  persistProgress();
  if (!$("reader-view").hidden) render();
}

function nextItem() {
  if (activeIndex < sessions[activeSession].length - 1) {
    activeIndex += 1;
    render(true);
    return;
  }
  const items = sessions[activeSession];
  const done = items.every((item) => isComplete(progress.sessions[activeSession][item.id] || 0, item.repeat));
  if (done) {
    $("complete-session-name").textContent = activeSession === "morning" ? "morning" : "evening";
    showView("complete");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    showToast("Finish the remaining repetitions before completing the session.");
  }
}

function updateSettings() {
  try {
    saveSettings(settings);
  } catch (error) {
    console.error("Could not save reading settings.", error);
    showToast("Settings could not be saved on this device.");
  }
  renderTheme(settings.theme, $("reader-view").hidden ? "home" : activeSession);
  if (! $("reader-view").hidden) render();
}

function showHome(allItems) {
  showView("home");
  renderTheme(settings.theme, "home");
  renderHomeProgress(allItems, progress);
}

function shareCurrent() {
  const item = sessions[activeSession][activeIndex];
  const shareText = `${item.title}\n\n${item.arabic}\n\n${item.transliteration}\n\n${item.translation}\n\n${item.reference}`;
  if (navigator.share) {
    navigator.share({ title: item.title, text: shareText }).catch((error) => {
      if (error.name !== "AbortError") {
        console.error("Could not share this dhikr.", error);
        showToast("Sharing is not available right now.");
      }
    });
    return;
  }
  if (!navigator.clipboard) {
    showToast("Sharing and copying are not available in this browser.");
    return;
  }
  navigator.clipboard.writeText(shareText).then(
    () => showToast("Dhikr copied to clipboard."),
    (error) => {
      console.error("Could not copy this dhikr.", error);
      showToast("Could not copy this dhikr.");
    }
  );
}

function bindEvents(allItems) {
  document.querySelectorAll(".session-card[data-session]").forEach((button) => {
    button.addEventListener("click", () => setSession(button.dataset.session));
  });
  const suggestion = suggestedSession();
  document.querySelector(`[data-session="${suggestion}"]`).classList.add("is-suggested");
  document.querySelector(`[data-session="${suggestion}"] .suggested-badge`).hidden = false;
  $("back-home").addEventListener("click", () => showHome(allItems));
  $("return-home").addEventListener("click", () => showHome(allItems));
  $("count-button").addEventListener("click", () => {
    refreshProgressForNewDay();
    const item = sessions[activeSession][activeIndex];
    const counts = progress.sessions[activeSession];
    const before = counts[item.id] || 0;
    const after = nextCount(before, item.repeat);
    counts[item.id] = after;
    persistProgress();
    render();
    if (settings.haptics && navigator.vibrate) navigator.vibrate(after === item.repeat ? [30, 45, 30] : 15);
    if (after === item.repeat) showToast("Dhikr completed.");
  });
  $("previous-item").addEventListener("click", () => {
    if (activeIndex > 0) {
      activeIndex -= 1;
      render(true);
    }
  });
  $("next-item").addEventListener("click", nextItem);
  $("jump-open").addEventListener("click", () => $("jump-dialog").showModal());
  $("jump-close").addEventListener("click", () => $("jump-dialog").close());
  $("jump-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-jump-id]");
    if (!button) return;
    const index = sessions[activeSession].findIndex((item) => item.id === button.dataset.jumpId);
    if (index >= 0) {
      activeIndex = index;
      render(true);
      $("jump-dialog").close();
    }
  });
  $("reset-session").addEventListener("click", () => {
    refreshProgressForNewDay();
    $("reset-dialog").showModal();
  });
  const resetProgress = () => {
    progress.sessions[activeSession] = {};
    persistProgress();
    render();
  };
  $("reset-confirm").addEventListener("click", () => {
    $("reset-dialog").close();
    resetProgress();
  });
  $("reset-cancel").addEventListener("click", () => $("reset-dialog").close());
  $("reset-close").addEventListener("click", () => $("reset-dialog").close());
  $("share-dhikr").addEventListener("click", shareCurrent);
  $("settings-open").addEventListener("click", () => {
    renderSettings(settings);
    $("settings-dialog").showModal();
  });
  $("settings-close").addEventListener("click", () => $("settings-dialog").close());
  $("settings-dialog").addEventListener("click", (event) => {
    if (event.target === $("settings-dialog")) $("settings-dialog").close();
  });
  $("about-open").addEventListener("click", () => $("about-dialog").showModal());
  $("about-close").addEventListener("click", () => $("about-dialog").close());
  $("jump-dialog").addEventListener("click", (event) => {
    if (event.target === $("jump-dialog")) $("jump-dialog").close();
  });
  $("about-dialog").addEventListener("click", (event) => {
    if (event.target === $("about-dialog")) $("about-dialog").close();
  });
  $("reset-dialog").addEventListener("click", (event) => {
    if (event.target === $("reset-dialog")) $("reset-dialog").close();
  });

  for (const [id, key] of [
    ["show-arabic", "showArabic"],
    ["show-transliteration", "showTransliteration"],
    ["show-translation", "showTranslation"],
    ["haptics-toggle", "haptics"]
  ]) {
    $(id).addEventListener("change", (event) => {
      settings[key] = event.target.checked;
      updateSettings();
    });
  }
  $("arabic-size").addEventListener("input", (event) => {
    settings.arabicSize = Number(event.target.value);
    $("arabic-size-value").value = `${settings.arabicSize}px`;
    updateSettings();
  });
  $("translation-size").addEventListener("input", (event) => {
    settings.translationSize = Number(event.target.value);
    $("translation-size-value").value = `${settings.translationSize}px`;
    updateSettings();
  });
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.addEventListener("change", (event) => {
      if (!event.target.checked) return;
      settings.theme = event.target.value;
      updateSettings();
    });
  });
  window.addEventListener("keydown", (event) => {
    if (document.querySelector("dialog[open]") || $("reader-view").hidden || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target.matches("input, select, textarea, button, a")) return;
    if (event.key === "ArrowRight" && activeIndex < sessions[activeSession].length - 1) {
      activeIndex += 1;
      render(true);
    } else if (event.key === "ArrowLeft" && activeIndex > 0) {
      activeIndex -= 1;
      render(true);
    }
  });
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  colorScheme.addEventListener?.("change", () => {
    if (settings.theme === "auto") renderTheme("auto", $("home-view").hidden ? activeSession : "home");
  });
  window.addEventListener("focus", refreshProgressForNewDay);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshProgressForNewDay();
  });

  let swipeStart = null;
  $("dhikr-card").addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || event.target.closest("button, a, summary")) return;
    swipeStart = { x: event.clientX, y: event.clientY };
  });
  $("dhikr-card").addEventListener("pointerup", (event) => {
    if (!swipeStart) return;
    const deltaX = event.clientX - swipeStart.x;
    const deltaY = event.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(deltaX) < 56 || Math.abs(deltaY) > 70) return;
    if (deltaX < 0) nextItem();
    else if (activeIndex > 0) {
      activeIndex -= 1;
      render(true);
    }
  });
  $("dhikr-card").addEventListener("pointercancel", () => {
    swipeStart = null;
  });
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("Offline support could not be enabled.", error);
    });
  });
}

initialize();
