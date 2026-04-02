// api/scores.js — Vercel Serverless Function
// Uses ESPN Cricinfo's unofficial API — NO API KEY REQUIRED

const IPL_SERIES_ID = 1510719; // IPL 2026 on ESPN Cricinfo
const ESPN = 'https://hs-consumer-api.espncricinfo.com/v1/pages';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://www.espncricinfo.com',
  'Referer': 'https://www.espncricinfo.com/',
};

async function espn(path) {
  const r = await fetch(`${ESPN}${path}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`ESPN ${r.status} — ${path}`);
  return r.json();
}

function norm(n) { return (n || '').toLowerCase().replace(/[^a-z]/g, ''); }

// ── Dream11 Points ─────────────────────────────────────────────────
function fantasyPts(bat, bowl, inXI) {
  let p = inXI ? 4 : 0;
  const r = bat.r || 0, b = bat.b || 0;
  p += r;
  p += (bat['4s'] || 0);
  p += (bat['6s'] || 0) * 2;
  if (r >= 100) p += 16; else if (r >= 50) p += 8; else if (r >= 30) p += 4;
  const dismissed = bat.dismissal && !/not out/i.test(bat.dismissal);
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

// ── Parse ESPN scorecard innings to player points ─────────────────
function extractPts(innings) {
  const pts = {}, seenBat = new Set();
  (innings || []).forEach(inn => {
    // Batting — ESPN uses batters[] or battingPerformances[]
    const batters = inn.batters || inn.battingPerformances || inn.batting || [];
    batters.forEach(b => {
      const name = b.player?.name || b.batter?.name || b.batsman?.name || b.name;
      if (!name) return;
      const k = norm(name);
      const first = !seenBat.has(k); seenBat.add(k);
      const bat = {
        r: b.runs ?? b.runsScored ?? b.r ?? 0,
        b: b.balls ?? b.ballsFaced ?? b.b ?? 0,
        '4s': b.fours ?? b['4s'] ?? 0,
        '6s': b.sixes ?? b['6s'] ?? 0,
        dismissal: b.dismissal ?? b.howDismissed ?? b.how_out ?? ''
      };
      pts[k] = (pts[k] || 0) + fantasyPts(bat, {}, first);
    });
    // Bowling — ESPN uses bowlers[] or bowlingPerformances[]
    const bowlers = inn.bowlers || inn.bowlingPerformances || inn.bowling || [];
    bowlers.forEach(bw => {
      const name = bw.player?.name || bw.bowler?.name || bw.name;
      if (!name) return;
      const k = norm(name);
      const bowl = {
        w: bw.wickets ?? bw.w ?? 0,
        o: bw.overs ?? bw.o ?? 0,
        r: bw.conceded ?? bw.runs ?? bw.r ?? 0,
        maiden: bw.maidens ?? bw.maiden ?? 0
      };
      pts[k] = (pts[k] || 0) + fantasyPts({}, bowl, false);
    });
  });
  return pts;
}

// ── Parse ESPN innings for scorecard display ───────────────────────
function parseScorecard(innings) {
  return (innings || []).map(inn => {
    const batters = inn.batters || inn.battingPerformances || inn.batting || [];
    const bowlers = inn.bowlers || inn.bowlingPerformances || inn.bowling || [];
    const battingTeam = inn.battingTeam?.name || inn.team?.name || inn.inning || '';
    const runs = inn.totalRuns ?? inn.runs ?? inn.totalScore ?? '';
    const wickets = inn.totalWickets ?? inn.wickets ?? '';
    const overs = inn.totalOvers ?? inn.overs ?? '';
    return {
      inning: battingTeam,
      totalRuns: runs,
      totalWickets: wickets,
      totalOvers: overs,
      batting: batters.map(b => ({
        name: b.player?.name || b.batter?.name || b.batsman?.name || b.name || '',
        r: b.runs ?? b.runsScored ?? b.r ?? 0,
        b: b.balls ?? b.ballsFaced ?? b.b ?? 0,
        '4s': b.fours ?? b['4s'] ?? 0,
        '6s': b.sixes ?? b['6s'] ?? 0,
        dismissal: b.dismissal ?? b.howDismissed ?? b.how_out ?? 'not out'
      })),
      bowling: bowlers.map(bw => ({
        name: bw.player?.name || bw.bowler?.name || bw.name || '',
        o: bw.overs ?? bw.o ?? 0,
        r: bw.conceded ?? bw.runs ?? bw.r ?? 0,
        w: bw.wickets ?? bw.w ?? 0,
        maiden: bw.maidens ?? bw.maiden ?? 0
      }))
    };
  });
}

// ── Convert ESPN match object to app format ────────────────────────
function toMatch(m, scorecardData) {
  const teams = m.teams || [];
  const t1 = teams[0]?.team || {};
  const t2 = teams[1]?.team || {};
  const t1name = t1.longName || t1.name || t1.abbreviation || '';
  const t2name = t2.longName || t2.name || t2.abbreviation || '';

  // Scores from inningScores or teams
  const inn1 = teams[0]?.inningScores?.[0] || {};
  const inn2 = teams[1]?.inningScores?.[0] || {};
  const s1 = inn1.runs !== undefined ? `${inn1.runs}/${inn1.wickets ?? ''}` : '';
  const o1 = inn1.overs !== undefined ? String(inn1.overs) : '';
  const s2 = inn2.runs !== undefined ? `${inn2.runs}/${inn2.wickets ?? ''}` : '';
  const o2 = inn2.overs !== undefined ? String(inn2.overs) : '';

  const isLive = !!(m.isCurrentMatch || m.liveScore || m.matchState === 'live');
  const isDone = !!(m.isCompleted || m.matchState === 'complete' || m.matchState === 'result');
  const status = isLive ? 'live' : isDone ? 'completed' : 'upcoming';

  const innings = scorecardData?.content?.scorecard
    || scorecardData?.content?.innings
    || scorecardData?.innings
    || [];

  const tossText = m.tossResults
    ? `${m.tossResults.winnerTeamName} won toss, elected to ${m.tossResults.decision}`
    : '';

  return {
    id: String(m.objectId || m.id),
    espnId: String(m.objectId || m.id),
    t1: t1name, t2: t2name,
    f1: t1name, f2: t2name,
    s1, s2, o1, o2, status,
    date: m.startTime || m.startDate || '',
    venue: m.ground?.longName || m.ground?.name || m.groundDisplayName || '',
    result: m.statusText || m.status || '',
    toss: tossText,
    scorecard: parseScorecard(innings),
    playerPoints: extractPts(innings),
  };
}

// ── Main handler ───────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const debug = req.query?.debug === 'true';

  try {
    // Fetch full IPL 2026 schedule
    const schedData = await espn(`/series/schedule?seriesId=${IPL_SERIES_ID}`);
    const allMatches = schedData?.content?.matches || schedData?.matches || [];

    if (debug) {
      const sample = allMatches[0];
      return res.json({
        debug: true,
        total: allMatches.length,
        firstMatch: sample,
        keys: sample ? Object.keys(sample) : []
      });
    }

    // Sort: live → upcoming → completed
    const order = { live: 0, upcoming: 1, completed: 2 };
    allMatches.sort((a, b) => {
      const getS = m => m.isCurrentMatch ? 'live' : (m.isCompleted ? 'completed' : 'upcoming');
      const diff = order[getS(a)] - order[getS(b)];
      if (diff !== 0) return diff;
      return new Date(a.startTime || 0) - new Date(b.startTime || 0);
    });

    // Enrich started matches with scorecards (max 10 to stay fast)
    const enriched = await Promise.all(
      allMatches.slice(0, 20).map(async m => {
        const matchId = m.objectId || m.id;
        let scData = null;
        if (m.isCompleted || m.isCurrentMatch) {
          try {
            scData = await espn(`/match/scorecard?seriesId=${IPL_SERIES_ID}&matchId=${matchId}`);
          } catch (e) { /* scorecard optional */ }
        }
        return toMatch(m, scData);
      })
    );

    res.json({ matches: enriched, total: allMatches.length, fetchedAt: Date.now() });
  } catch (e) {
    console.error('ESPN handler error:', e);
    res.status(500).json({ error: e.message, matches: [], fetchedAt: Date.now() });
  }
}
