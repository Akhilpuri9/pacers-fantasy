// api/scores.js — Vercel Serverless Function
// Uses series endpoint to get full IPL schedule (not just live matches)

const KEY  = process.env.CRICAPI_KEY;
const BASE = 'https://api.cricapi.com/v1';
const IPL  = /ipl|indian premier/i;

async function get(path) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`${BASE}${path}${sep}apikey=${KEY}`);
  if (!r.ok) throw new Error(`CricAPI ${r.status}: ${path}`);
  const d = await r.json();
  if (d.status !== 'success') throw new Error(`CricAPI error: ${d.message || d.status}`);
  return d;
}

function norm(n) { return (n || '').toLowerCase().replace(/[^a-z]/g, ''); }

// ── Dream11 Fantasy Points ────────────────────────────────────────
function fantasyPts(bat, bowl, inXI) {
  let p = inXI ? 4 : 0;
  const r = bat.r || 0, b = bat.b || 0;
  p += r;
  p += (bat['4s'] || 0);
  p += (bat['6s'] || 0) * 2;
  if (r >= 100) p += 16; else if (r >= 50) p += 8; else if (r >= 30) p += 4;
  const dismissed = bat.dismissal && !bat.dismissal.toLowerCase().includes('not out');
  if (r === 0 && dismissed) p -= 2;
  if (b >= 10) {
    const sr = (r / b) * 100;
    if (sr > 170) p += 6; else if (sr > 150) p += 4; else if (sr > 130) p += 2;
    else if (sr < 50) p -= 6; else if (sr < 60) p -= 4; else if (sr < 70) p -= 2;
  }
  const w = bowl.w || 0, o = parseFloat(bowl.o) || 0, br = bowl.r || 0;
  p += w * 25;
  p += (bowl.maiden || 0) * 8;
  if (w >= 5) p += 8; else if (w >= 4) p += 4; else if (w >= 3) p += 4;
  if (o >= 2) {
    const eco = br / o;
    if (eco < 5) p += 6; else if (eco < 6) p += 4; else if (eco < 7) p += 2;
    else if (eco >= 10) p -= 6; else if (eco >= 9) p -= 4; else if (eco >= 8) p -= 2;
  }
  return Math.round(p);
}

function extractPlayerPts(scorecard) {
  const pts = {}, seenBat = new Set();
  (scorecard || []).forEach(inn => {
    (inn.batting || []).forEach(b => {
      const name = b.batsman?.name || b.name; if (!name) return;
      const k = norm(name);
      const isFirst = !seenBat.has(k); seenBat.add(k);
      pts[k] = (pts[k] || 0) + fantasyPts(b, {}, isFirst);
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
  const teams = m.teams || [];
  const { s: s1, o: o1 } = fmtScore(m.score, 0);
  const { s: s2, o: o2 } = fmtScore(m.score, 1);
  const toss = m.toss?.winner
    ? `${m.toss.winner} won the toss, elected to ${m.toss.decision}` : '';
  const playerPoints = sc ? extractPlayerPts(sc.data?.scorecard) : {};
  return {
    id: m.id, t1: teams[0] || '', t2: teams[1] || '',
    f1: teams[0] || '', f2: teams[1] || '',
    s1, s2, o1, o2, status, toss,
    date: m.dateTimeGMT || m.date || '',
    venue: m.venue || '',
    result: m.status || '',
    scorecard: sc?.data?.scorecard || [],
    playerPoints,
  };
}

// ── Handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  if (!KEY) {
    return res.json({ matches: [], fetchedAt: Date.now(), error: 'CRICAPI_KEY not set.' });
  }

  const debug = req.query?.debug === 'true';

  try {
    let iplMatches = [];

    // ── Strategy 1: Find IPL series and get all its matches ───────
    try {
      const serRes = await get('/series?offset=0');
      const allSeries = serRes.data || [];
      if (debug) return res.json({ debug: true, allSeries: allSeries.map(s => ({ id: s.id, name: s.name })) });

      const iplSeries = allSeries.find(s => IPL.test(s.name || ''));
      if (iplSeries) {
        const infoRes = await get(`/series_info?id=${iplSeries.id}`);
        const info = infoRes.data || {};
        // matchList gives all matches in the series
        iplMatches = info.matchList || info.match_list || info.matches || [];
      }
    } catch (e) {
      console.warn('Series fetch failed:', e.message);
    }

    // ── Strategy 2: Fall back to currentMatches + matches ─────────
    if (!iplMatches.length) {
      try {
        const [cur, recent] = await Promise.all([
          get('/currentMatches?offset=0').catch(() => ({ data: [] })),
          get('/matches?offset=0').catch(() => ({ data: [] })),
        ]);
        const all = [...(cur.data || []), ...(recent.data || [])];
        const seen = new Set();
        all.forEach(m => {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            if (IPL.test(m.name || '') || IPL.test(m.seriesName || ''))
              iplMatches.push(m);
          }
        });
      } catch (e) {
        console.warn('Fallback fetch failed:', e.message);
      }
    }

    // Sort: live → upcoming → completed
    const order = { live: 0, upcoming: 1, completed: 2 };
    iplMatches.sort((a, b) => {
      const sa = a.matchStarted && !a.matchEnded ? 'live' : a.matchEnded ? 'completed' : 'upcoming';
      const sb = b.matchStarted && !b.matchEnded ? 'live' : b.matchEnded ? 'completed' : 'upcoming';
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      // within upcoming: sort by date ascending
      if (sa === 'upcoming') return new Date(a.dateTimeGMT || a.date || 0) - new Date(b.dateTimeGMT || b.date || 0);
      // within completed: most recent first
      return new Date(b.dateTimeGMT || b.date || 0) - new Date(a.dateTimeGMT || a.date || 0);
    });

    // Enrich live/completed matches with scorecards
    const enriched = await Promise.all(
      iplMatches.slice(0, 14).map(async m => {
        let sc = null;
        if (m.matchStarted) {
          try { sc = await get(`/match_scorecard?id=${m.id}`); } catch (e) { }
        }
        return toMatch(m, sc);
      })
    );

    res.json({ matches: enriched, total: iplMatches.length, fetchedAt: Date.now() });
  } catch (e) {
    console.error('scores error:', e);
    res.status(500).json({ error: e.message, matches: [], fetchedAt: Date.now() });
  }
}
