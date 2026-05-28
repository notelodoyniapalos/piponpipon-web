const KEY = 'piponpipon_visit_count_v1';

// Popup appears on every visit (debug/awareness mode). To restore the original
// sparse cadence, replace with: TRIGGER_SEQ.includes(count) where TRIGGER_SEQ = [1,3,7,15,31,63,…]
export function shouldTrigger(_count) {
  return true;
}

export function incrementVisit() {
  try {
    const cur = parseInt(localStorage.getItem(KEY) || '0', 10) || 0;
    const next = cur + 1;
    localStorage.setItem(KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function readVisitCount() {
  try { return parseInt(localStorage.getItem(KEY) || '0', 10) || 0; }
  catch { return 0; }
}
