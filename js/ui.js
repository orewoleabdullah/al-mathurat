import { completedItems, isComplete } from "./counter.js";

const byId = (id) => document.getElementById(id);
const ringCircumference = 2 * Math.PI * 22;

export function showView(name) {
  byId("home-view").hidden = name !== "home";
  byId("reader-view").hidden = name !== "reader";
  byId("complete-view").hidden = name !== "complete";
  document.body.classList.toggle("reading", name === "reader");
}

export function renderHomeDate() {
  const now = new Date();
  const hour = now.getHours();
  byId("home-greeting").textContent = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const gregorian = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const hijri = new Intl.DateTimeFormat("en-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" });
  byId("today-date").textContent = gregorian.format(now);
  byId("today-date").dateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  byId("hijri-date").textContent = hijri.format(now);
}

export function renderHomeProgress(items, progress) {
  for (const session of ["morning", "evening"]) {
    const sessionItems = items.filter((item) => item.time === "both" || item.time === session);
    const counts = progress.sessions[session];
    const done = completedItems(sessionItems, counts);
    const percent = sessionItems.length ? Math.round((done / sessionItems.length) * 100) : 0;
    const started = Object.values(counts).some((count) => count > 0);
    const nextIndex = sessionItems.findIndex((item) => !isComplete(counts[item.id] || 0, item.repeat));
    const summary = byId(`${session}-summary`);
    summary.textContent = done === sessionItems.length
      ? "Completed"
      : started
        ? `Continue from #${nextIndex + 1}`
        : "Start";
    byId(`${session}-ring-progress`).style.strokeDasharray = `${ringCircumference}`;
    byId(`${session}-ring-progress`).style.strokeDashoffset = `${ringCircumference * (1 - percent / 100)}`;
    byId(`${session}-ring-label`).textContent = `${percent}%`;
    byId(`${session}-ring`).setAttribute("aria-label", `${done} of ${sessionItems.length} reminders complete`);
  }
}

export function renderReader({ items, session, counts, index, settings }) {
  const item = items[index];
  document.documentElement.dataset.session = session;
  renderTheme(settings.theme, session);
  byId("reader-session-label").textContent = session === "morning" ? "Morning" : "Evening";
  byId("card-order").textContent = `Reminder ${index + 1}`;
  byId("dhikr-title").textContent = item.title;
  byId("dhikr-arabic").textContent = item.arabic;
  byId("dhikr-transliteration").textContent = item.transliteration;
  byId("dhikr-translation").textContent = item.translation;
  byId("dhikr-reference").textContent = item.reference;
  const sourceLink = byId("dhikr-source-link");
  sourceLink.hidden = !item.sourceUrl;
  if (item.sourceUrl) sourceLink.href = item.sourceUrl;
  const grading = byId("dhikr-grading");
  grading.hidden = !item.grading;
  grading.textContent = item.grading ? ` · ${item.grading}` : "";
  const note = byId("dhikr-note");
  note.hidden = !item.note;
  byId("dhikr-note-text").textContent = item.note || "";

  byId("dhikr-arabic").hidden = !settings.showArabic;
  byId("dhikr-transliteration").hidden = !settings.showTransliteration;
  byId("dhikr-translation").hidden = !settings.showTranslation;
  document.documentElement.style.setProperty("--arabic-size", `${settings.arabicSize}px`);
  document.documentElement.style.setProperty("--translation-size", `${settings.translationSize}px`);

  const done = completedItems(items, counts);
  const percent = items.length ? Math.round((done / items.length) * 100) : 0;
  byId("reader-progress-label").textContent = `${index + 1} / ${items.length}`;
  byId("progress-fill").style.width = `${percent}%`;
  byId("progress-bar").setAttribute("aria-valuenow", String(percent));
  byId("item-position").textContent = `${item.title}, ${index + 1} of ${items.length}`;
  byId("previous-item").disabled = index === 0;
  const willFinish = index === items.length - 1
    && items.every((entry) => entry.id === item.id || isComplete(counts[entry.id] || 0, entry.repeat));
  byId("next-label").textContent = willFinish ? "Finish" : "Next";
  byId("next-icon").innerHTML = willFinish
    ? '<path d="m5 12 4.5 4.5L19 7"/>'
    : '<path d="M4 12h13m-6-7 7 7-7 7"/>';
  byId("next-item").setAttribute(
    "aria-label",
    willFinish ? "Complete this dhikr and finish session" : "Complete this dhikr and continue"
  );
  byId("jump-list").querySelectorAll("[data-jump-id]").forEach((button, jumpIndex) => {
    const active = button.dataset.jumpId === item.id;
    button.setAttribute("aria-current", active ? "true" : "false");
    const jumpItem = items[jumpIndex];
    button.querySelector(".jump-check").hidden = !isComplete(counts[jumpItem.id] || 0, jumpItem.repeat);
  });
}

export function renderJumpList(items, selectedId, counts = {}) {
  const list = byId("jump-list");
  list.replaceChildren();
  for (const [index, item] of items.entries()) {
    const listItem = document.createElement("div");
    const button = document.createElement("button");
    const complete = isComplete(counts[item.id] || 0, item.repeat);
    button.className = "jump-item";
    button.type = "button";
    button.dataset.jumpId = item.id;
    button.setAttribute("aria-current", item.id === selectedId ? "true" : "false");
    button.setAttribute("aria-label", `${index + 1}. ${item.title}${complete ? ", completed" : ""}`);
    button.innerHTML = `<span class="jump-number">${String(index + 1).padStart(2, "0")}</span><span class="jump-title"></span><svg class="jump-check" viewBox="0 0 24 24" aria-hidden="true"${complete ? "" : " hidden"}><path d="m5 12 4.5 4.5L19 7"/></svg>`;
    button.querySelector(".jump-title").textContent = item.title;
    listItem.setAttribute("role", "listitem");
    listItem.append(button);
    list.append(listItem);
  }
}

export function renderSettings(settings) {
  byId("show-arabic").checked = settings.showArabic;
  byId("show-transliteration").checked = settings.showTransliteration;
  byId("show-translation").checked = settings.showTranslation;
  byId("arabic-size").value = settings.arabicSize;
  byId("translation-size").value = settings.translationSize;
  byId("arabic-size-value").value = `${settings.arabicSize}px`;
  byId("translation-size-value").value = `${settings.translationSize}px`;
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.checked = input.value === settings.theme;
  });
  byId("haptics-toggle").checked = settings.haptics;
}

export function showToast(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.hidden = true;
  }, 2400);
}

export function renderTheme(theme, session = "home") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.session = session;
  const mediaDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const color = theme === "dark"
    ? "#171827"
    : theme === "sepia"
      ? "#eee5d6"
      : theme === "light"
        ? "#f3efe6"
        : session === "evening" || (session === "home" && mediaDark)
          ? "#171827"
          : "#f3efe6";
  document.querySelector('meta[name="theme-color"]').content = color;
}
