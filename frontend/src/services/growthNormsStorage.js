const STORAGE_KEY = 'growthNorms:v1';

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function getAllGrowthNorms() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? safeParseJson(raw) : null;
  return parsed && typeof parsed === 'object' ? parsed : {};
}

export function getGrowthNormsForControlPoint(controlPointId) {
  if (!controlPointId) return null;
  const all = getAllGrowthNorms();
  return all[String(controlPointId)] || null;
}

export function upsertGrowthNormsForControlPoint(controlPointId, norms) {
  if (!controlPointId) throw new Error('controlPointId is required');
  if (!norms || typeof norms !== 'object') throw new Error('norms object is required');

  const all = getAllGrowthNorms();
  all[String(controlPointId)] = {
    ...norms,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function clearGrowthNormsForControlPoint(controlPointId) {
  if (!controlPointId) return;
  const all = getAllGrowthNorms();
  delete all[String(controlPointId)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function downloadGrowthNormsAsJson(controlPointId) {
  const norms = getGrowthNormsForControlPoint(controlPointId);
  if (!norms) throw new Error('No growth norms to download');

  const blob = new Blob([JSON.stringify(norms, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `growth-norms-control-point-${controlPointId}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
