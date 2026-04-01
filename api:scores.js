// api/scores.js
// Fetches IPL 2026 live scores + per-player batting/bowling stats
// so the frontend can calculate fantasy points without a second API call.

const KEY = process.env.CRICAPI_KEY;
const IPL_ID = "d5a498c8-7596-4b93-8ab0-e0efc3345312";

let cache = { data: null, ts: 0 };
const TTL = 60_000; // 60 s

async function j(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`CricAPI ${r.status}`);
  return r.json();
}

// Dream11-style fantasy points
function calcPoints(bat, bowl, field) {
  let pts = 0;
  if (bat) {
    pts += (bat.runs || 0);
    pts += (bat.fours || 0) * 1;
    pts += (bat.sixes || 0) * 2;
    if (bat.runs >= 100) pts += 16;
    else if (bat.runs >= 50) pts += 8;
    if (bat.runs === 0 && bat.balls > 0) pts -= 2;
    const sr = bat.balls > 0 ? (bat.runs / bat.balls) * 100 : 0;
    if (bat.balls >= 10) {
      if (sr >= 170) pts += 6;
      else if (sr >= 150) pts += 4;
      else if (sr >= 130) pts += 2;
      else if (sr < 70) pts -= 2;
      else if (sr < 60) pts -= 4;
      else if (sr < 50) pts -= 6;
    }
  }
  if (bowl) {
    pts += (bowl.wickets || 0) * 25;
    if (bowl.wickets >= 5) pts += 16;
    else if (bowl.wickets >= 4) pts += 8;
    else if (bowl.wickets >= 3) pts += 4;
    pts += (bowl.maidens || 0) * 8;
    const eco = bowl.overs > 0 ? bowl.runs / bowl.overs : 99;
    if (bowl.overs >= 2) {
      if (eco < 5) pts += 6;
      else if (eco < 6) pts += 4;
      else if (eco < 7) pts += 2;
      else if (eco >= 10 && eco < 11) pts -= 2;
      else if (eco >= 11 && eco < 12) pts -= 4;
      else if (eco >= 12) pts -= 6;
    }
  }
  if (field) {
    pts += (field.catches || 0) * 8;
    pts += (field.stumpings || 0) * 12;
    pts += (field.runouts || 0) * 6;
    if ((field.catches || 0) >= 3) pts += 4;
  }
  return pts;
}

function normName(n) {
  return (n || "").toLowerCase().replace(/[^a-z]/g, "");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (cache.data && Date.now() - cache.ts < TTL)
    return res.status(200).json({ source: "cache", ...cache.data });

  try {
    const series = await j(`https://api.cricapi.com/v1/series_info?apikey=${KEY}&id=${IPL_ID}`);
    const matchList = series?.data?.matchList ?? [];

    const live     = matchList.filter(m => m.matchStarted && !m.matchEnded);
    const done     = matchList.filter(m => m.matchEnded).slice(-5);
    const upcoming = matchList.filter(m => !m.matchStarted).slice(0, 5);
    const toFetch  = [...live, ...done, ...upcoming];

    const details = await Promise.all(toFetch.map(m =>
      j(`https://api.cricapi.com/v1/match_scorecard?apikey=${KEY}&id=${m.id}`)
        .then(r => r.data)
        .catch(() => null)
    ));

    const matches = details.filter(Boolean).map(d => {
      const playerPts = {};

      (d.scorecard || []).forEach(inn => {
        (inn.batting || []).forEach(b => {
          const key = normName(b.batsman?.name);
          if (!key) return;
          playerPts[key] = (playerPts[key] || 0) + calcPoints(
            { runs: b.r, balls: b.b, fours: b["4s"], sixes: b["6s"] },
            null, null
          );
        });
        (inn.bowling || []).forEach(b => {
          const key = normName(b.bowler?.name);
          if (!key) return;
          const overs = parseFloat(b.o) || 0;
          playerPts[key] = (playerPts[key] || 0) + calcPoints(
            null,
            { wickets: b.w, runs: b.r, overs, maidens: b.m },
            null
          );
        });
      });

      const s = d.score || [];
      return {
        id:          d.id,
        no:          d.name?.match(/\d+/)?.[0] || "",
        t1:          d.teams?.[0] || "",
        t2:          d.teams?.[1] || "",
        f1:          d.teams?.[0] || "",
        f2:          d.teams?.[1] || "",
        s1:          s[0] ? `${s[0].r}/${s[0].w}` : "",
        o1:          s[0]?.o || "",
        s2:          s[1] ? `${s[1].r}/${s[1].w}` : "",
        o2:          s[1]?.o || "",
        status:      d.matchStarted && !d.matchEnded ? "live"
                     : d.matchEnded ? "completed" : "upcoming",
        result:      d.status || "",
        date:        d.dateTimeGMT?.slice(0, 10) || "",
        venue:       d.venue || "",
        toss:        d.tossWinner ? `${d.tossWinner} elected to ${d.tossChoice}` : "",
        xi: {
          announced: !!(d.teamInfo?.[0]?.players?.length),
          t1: d.teamInfo?.[0]?.players?.map(p => p.name) || [],
          t2: d.teamInfo?.[1]?.players?.map(p => p.name) || [],
        },
        playerPoints: playerPts,
        scorecard:   d.scorecard || [],
      };
    });

    const payload = { matches, fetchedAt: new Date().toISOString() };
    cache = { data: payload, ts: Date.now() };
    return res.status(200).json({ source: "live", ...payload });

  } catch (err) {
    console.error(err);
    if (cache.data) return res.status(200).json({ source: "stale", ...cache.data });
    return res.status(500).json({ error: err.message });
  }
}
