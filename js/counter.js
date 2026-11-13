export function nextCount(current, repeat) {
  return Math.min(Math.max(0, current) + 1, repeat);
}

export function isComplete(current, repeat) {
  return current >= repeat;
}

export function completedItems(items, counts) {
  return items.reduce((total, item) => total + (isComplete(counts[item.id] || 0, item.repeat) ? 1 : 0), 0);
}
