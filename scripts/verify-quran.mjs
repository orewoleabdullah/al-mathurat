import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const quranPath = (name) => fileURLToPath(new URL(`source/${name}`, root));
const dataPath = fileURLToPath(new URL("data/mathurat.json", root));

function readVerseMap(contents, file) {
  const verses = new Map();
  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    if (!line || line.startsWith("#")) continue;
    const first = line.indexOf("|");
    const second = line.indexOf("|", first + 1);
    if (first < 1 || second < 0) {
      throw new Error(`${file}:${index + 1}: malformed verse line`);
    }
    verses.set(`${line.slice(0, first)}:${line.slice(first + 1, second)}`, line.slice(second + 1));
  }
  return verses;
}

const [arabicSource, translationSource, contentSource, sourceDocument] = await Promise.all([
  readFile(quranPath("quran-uthmani.txt"), "utf8"),
  readFile(quranPath("en.sahih.txt"), "utf8"),
  readFile(dataPath, "utf8"),
  readFile(fileURLToPath(new URL("REVIEW.md", root)), "utf8")
]);
const arabic = readVerseMap(arabicSource, "quran-uthmani.txt");
const translation = readVerseMap(translationSource, "en.sahih.txt");
const { items } = JSON.parse(contentSource);
if (!Array.isArray(items)) throw new Error("data/mathurat.json must contain an items array");

const sessions = { morning: 0, evening: 0 };
let quranEntries = 0;
let pureQuranEntries = 0;
const failures = [];
const ids = new Set();

for (const item of items) {
  if (!item.id || ids.has(item.id)) failures.push(`missing or duplicate id: ${item.id}`);
  ids.add(item.id);
  if (!Number.isInteger(item.order) || !["morning", "evening", "both"].includes(item.time) ||
      !Number.isInteger(item.repeat) || item.repeat < 1 ||
      !item.title || !item.arabic || !item.transliteration || !item.translation ||
      !item.reference || !item.sourceUrl ||
      item.needsReview !== false || item.transliterationReviewed !== true ||
      (item.note !== undefined && typeof item.note !== "string") ||
      (item.grading !== undefined && typeof item.grading !== "string")) {
    failures.push(`${item.id}: invalid schema or unfinished content flags`);
  }
  if (!sourceDocument.includes(`\`${item.id}\``)) failures.push(`${item.id}: missing from REVIEW.md`);
  if (item.time === "both" || item.time === "morning") sessions.morning++;
  if (item.time === "both" || item.time === "evening") sessions.evening++;

  const match = /(?:^|;\s*)Quran\s+(\d+):(\d+)[–-](\d+)/.exec(item.reference);
  if (!match) continue;

  const [, surahText, startText, endText] = match;
  const surah = Number(surahText);
  const start = Number(startText);
  const end = Number(endText);
  const arabicVerses = [];
  const translatedVerses = [];
  for (let ayah = start; ayah <= end; ayah++) {
    const key = `${surah}:${ayah}`;
    if (!arabic.has(key) || !translation.has(key)) {
      failures.push(`${item.id}: ${key} is missing from a source file`);
      continue;
    }
    arabicVerses.push(arabic.get(key));
    translatedVerses.push(translation.get(key));
  }
  const arabicPassage = arabicVerses.join(" ");
  const translationPassage = translatedVerses.join(" ");
  const isCombinedIstiadhah = item.id === "istiadhah-and-al-fatihah";
  const isCombinedLitany = item.id.startsWith("wird-ar-rabitah-");
  const pureQuran = !isCombinedIstiadhah && !isCombinedLitany;
  quranEntries++;

  if (pureQuran) {
    pureQuranEntries++;
    if (item.arabic !== arabicPassage) failures.push(`${item.id}: Arabic differs from Tanzil`);
    if (item.translation !== translationPassage) failures.push(`${item.id}: translation differs from Sahih International`);
  } else if (isCombinedIstiadhah) {
    if (!item.arabic.endsWith(arabicPassage)) failures.push(`${item.id}: Quran Arabic suffix differs from Tanzil`);
    if (!item.translation.endsWith(translationPassage)) {
      failures.push(`${item.id}: Quran translation suffix differs from Sahih International`);
    }
  } else {
    if (!item.arabic.startsWith(arabicPassage)) failures.push(`${item.id}: Quran Arabic prefix differs from Tanzil`);
    if (!item.translation.startsWith(translationPassage)) {
      failures.push(`${item.id}: Quran translation prefix differs from Sahih International`);
    }
  }
}

if (sessions.morning !== 27 || sessions.evening !== 27) {
  failures.push(`expected 27 items per session; got ${sessions.morning} morning and ${sessions.evening} evening`);
}
if (items.length !== 32 || quranEntries !== 10 || pureQuranEntries !== 7) {
  failures.push(`expected 32 records and 10 Quran-bearing entries (7 pure); got ${items.length} records and ${quranEntries} (${pureQuranEntries} pure)`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Verified ${quranEntries} Quran-bearing entries (${pureQuranEntries} pure); ${items.length} finalized records; session totals: ${sessions.morning} morning, ${sessions.evening} evening; all review flags clear.`);
}
