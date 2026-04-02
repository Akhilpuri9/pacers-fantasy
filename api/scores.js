// api/scores.js  — Vercel Serverless Function
// Requires: CRIC_API_KEY set in Vercel Environment Variables
// Sign up free at https://cricapi.com (100 req/day on free tier)

const KEY  = process.env.CRICAPI_KEY;
const BASE = 'https://api.cricapi.com/v1';
const IPL  = /ipl|indian premier/i;

async function get(path) {
  const r = await fetch(`${BASE}${path}&apikey=${KEY}`);
  if (!r.ok) throw new Error(`CricAPI ${r.status}: ${path}`);
  return r.json();
}

function norm(n) { return (n || '').toLowerCase().replace(/[^a-z]/g, ''); }

// ── Dream11 Fantasy Points ────────────────────────────────────────
function fantasyPts(bat, bowl, inXI) {
  let p = inXI ? 4 : 0;

  // Batting
  const r = bat.r || 0, b = bat.b || 0;
  p += r;
  p += (bat['4s'] || 0);        // 1 extra per boundary
  p += (bat['6s'] || 0) * 2;    // 2 extra per six
  if (r >= 100) p += 16;
  else if (r >= 50) p += 8;
  else if (r >= 30) p += 4;
  const dismissed = bat.dismissal && !bat.dismissal.toLowerCase().includes('not out');
  if (r === 0 && dismissed) p -= 2; // duck
  if (b >= 10) {
    const sr = (r / b) * 100;
    if      (sr > 170) p += 6;
    else if (sr > 150) p += 4;
    else if (sr > 130) p += 2;
    else if (sr <  50) p -= 6;
    else if (sr <  60) p -= 4;
    else if (sr <  70) p -= 2;
  }

  // Bowling
  const w = bowl.w || 0, o = parseFloat(bowl.o) || 0, br = bowl.r || 0;
  p += w * 25;
  p += (bowl.maiden || 0) * 8;
  if      (w >= 5) p += 8;
  else if (w >= 4) p += 4;
  else if (w >= 3) p += 4;
  if (o >= 2) {
    const eco = br / o;
    if      (eco < 5)  p += 6;
    else if (eco < 6)  p += 4;
    else if (eco < 7)  p += 2;
    else if (eco >= 10) p -= 6;
    else if (eco >= 9)  p -= 4;
    else if (eco >= 8)  p -= 2;
  }

  return Math.round(p);
}

function extractPlayerPts(scorecard) {
  const pts = {}, seen = new Set();
  (scorecard || []).forEach(inn => {
    (inn.batting || []).forEach(b => {
      const name = b.batsman?.name || b.name; if (!name) return;
      const k = norm(name);
      if (!seen.has(k)) { seen.add(k); pts[k] = (pts[k] || 0) + fantasyPts(b, {}, true); }
      else pts[k] = (pts[k] || 0) + fantasyPts(b, {}, false);
    });
    (inn.bowling || []).forEach(bw => {
      const name = bw.bowler?.name || bw.name; if (!name) return;
      const k = norm(name);
      pts[k] = (pts[k] || 0) + fantasyPts({}, bw, false);
    });
  });
  return pts;
}

function fmtScore(scores, idx) {
  const s = (scores || [])[idx];
  return s ? { s: `${s.r}/${s.w}`, o: String(s.o || '') } : { s: '', o: '' };
}

function toMatch(m, sc) {
  const status = m.matchStarted && !m.matchEnded ? 'live'
               : m.matchEnded ? 'completed' : 'upcoming';
  const teams  = m.teams || [];
  const { s: s1, o: o1 } = fmtScore(m.score, 0);
  const { s: s2, o: o2 } = fmtScore(m.score, 1);
  const toss = m.toss?.winner
    ? `${m.toss.winner} won the toss, elected to ${m.toss.decision}`
    : '';
  const playerPoints = sc ? extractPlayerPts(sc.data?.scorecard) : {};
  return {
    id: m.id, t1: teams[0] || '', t2: teams[1] || '',
    f1: teams[0] || '', f2: teams[1] || '',
    s1, s2, o1, o2, status, toss,
    date:   m.date   || '',
    venue:  m.venue  || '',
    result: m.status || '',
    scorecard:    sc?.data?.scorecard || [],
    playerPoints,
  };
}

// ── Handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache 15 min at Vercel CDN edge — keeps external API calls low
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  if (!KEY) {
    return res.json({
      matches: [],
      fetchedAt: Date.now(),
      error: 'CRICAPI_KEY not set. Add it in Vercel → Settings → Environment Variables.',
    });
  }

  try {
    // 1. Current live/recent matches
    const cur = await get('/currentMatches?offset=0');
    let iplMatches = (cur.data || []).filter(m =>
      IPL.test(m.name || '') || IPL.test(m.seriesName || '')
    );

    // 2. If < 3 matches found, search the series list for IPL schedule
    if (iplMatches.length < 3) {
      try {
        const ser = await get('/series?offset=0');
        const iplSeries = (ser.data || []).find(s => IPL.test(s.name || ''));
        if (iplSeries) {
          const info = await get(`/series_info?id=${iplSeries.id}`);
          const all  = info.data?.matchList || [];
          const existing = new Set(iplMatches.map(m => m.id));
          all.forEach(m => { if (!existing.has(m.id)) iplMatches.push(m); });
        }
      } catch (e) { /* series lookup optional */ }
    }

    // Sort: live → upcoming → completed
    const order = { live: 0, upcoming: 1, completed: 2 };
    iplMatches.sort((a, b) => {
      const sa = a.matchStarted && !a.matchEnded ? 'live' : a.matchEnded ? 'completed' : 'upcoming';
      const sb = b.matchStarted && !b.matchEnded ? 'live' : b.matchEnded ? 'completed' : 'upcoming';
      return (order[sa] ?? 3) - (order[sb] ?? 3);
    });

    // 3. Enrich started matches with scorecard (max 8 to conserve API quota)
    const enriched = await Promise.all(
      iplMatches.slice(0, 12).map(async m => {
        let sc = null;
        if (m.matchStarted) {
          try { sc = await get(`/match_scorecard?id=${m.id}`); } catch (e) { /* ignore */ }
        }
        return toMatch(m, sc);
      })
    );

    res.json({ matches: enriched, fetchedAt: Date.now() });
  } catch (e) {
    console.error('scores handler error:', e);
    res.status(500).json({ error: e.message, matches: [], fetchedAt: Date.now() });
  }
}
