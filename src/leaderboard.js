// Online leaderboards for the Daily Challenge and Weekly/Live events.
// Backend: a Supabase table (free tier). Configure it in leaderboard.json — see LEADERBOARDS.md.
// With no configuration the game works exactly the same, minus the online boards.

let cfg = null;

export async function loadBoardConfig() {
  try {
    const res = await fetch(`leaderboard.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) cfg = await res.json();
  } catch { cfg = null; }
  return boardsEnabled();
}

export const boardsEnabled = () => !!(cfg && cfg.url && cfg.anonKey);

function headers(extra = {}) {
  return { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}`, 'Content-Type': 'application/json', ...extra };
}

export const cleanName = (n) => String(n || '').replace(/[^\p{L}\p{N} _\-.]/gu, '').trim().slice(0, 16);

export async function submitScore(entry) {
  if (!boardsEnabled()) return false;
  const name = cleanName(entry.name);
  if (!name) return false;
  try {
    const res = await fetch(`${cfg.url}/rest/v1/scores`, {
      method: 'POST',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        board: entry.board, name, score: Math.max(0, Math.round(entry.score)), hero: entry.hero,
        stage: entry.stage, kills: entry.kills, version: entry.version,
      }),
    });
    return res.ok;
  } catch { return false; }
}

// Best score per player for one board.
export async function topScores(board, limit = 20) {
  if (!boardsEnabled()) return null;
  try {
    const q = `board=eq.${encodeURIComponent(board)}&select=name,score,hero,stage,kills,created_at&order=score.desc&limit=200`;
    const res = await fetch(`${cfg.url}/rest/v1/scores?${q}`, { headers: headers() });
    if (!res.ok) return null;
    const rows = await res.json();
    const best = new Map();
    for (const r of rows) if (!best.has(r.name)) best.set(r.name, r);
    return [...best.values()].slice(0, limit);
  } catch { return null; }
}
