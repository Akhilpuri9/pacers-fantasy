// api/scores.js — Vercel Serverless Function
// NO API KEY NEEDED — hardcoded IPL 2026 schedule + Cricbuzz live HTML scraping

export const config = { maxDuration: 15 };

// ── Full IPL 2026 Schedule ─────────────────────────────────────────
// Dates in IST → converted to UTC (IST = UTC+5:30)
// Evening matches: 7:30 PM IST = 14:00 UTC
// Afternoon matches: 3:30 PM IST = 10:00 UTC
const SCHEDULE = [
  // WEEK 1
  { no:1,  t1:"Sunrisers Hyderabad",     t2:"Royal Challengers Bengaluru", date:"2026-03-28T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru" },
  { no:2,  t1:"Kolkata Knight Riders",   t2:"Mumbai Indians",              date:"2026-03-29T14:00:00Z", venue:"Eden Gardens, Kolkata" },
  { no:3,  t1:"Chennai Super Kings",     t2:"Rajasthan Royals",            date:"2026-03-30T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai" },
  { no:4,  t1:"Gujarat Titans",          t2:"Punjab Kings",                date:"2026-03-31T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad" },
  { no:5,  t1:"Lucknow Super Giants",    t2:"Delhi Capitals",              date:"2026-04-01T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow" },
  // WEEK 2
  { no:6,  t1:"Kolkata Knight Riders",   t2:"Sunrisers Hyderabad",         date:"2026-04-03T14:00:00Z", venue:"Eden Gardens, Kolkata" },
  { no:7,  t1:"Chennai Super Kings",     t2:"Punjab Kings",                date:"2026-04-04T10:00:00Z", venue:"MA Chidambaram Stadium, Chennai" },
  { no:8,  t1:"Delhi Capitals",          t2:"Mumbai Indians",              date:"2026-04-04T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi" },
  { no:9,  t1:"Gujarat Titans",          t2:"Rajasthan Royals",            date:"2026-04-05T10:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad" },
  { no:10, t1:"Sunrisers Hyderabad",     t2:"Lucknow Super Giants",        date:"2026-04-05T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad" },
  // WEEK 3
  { no:11, t1:"Royal Challengers Bengaluru", t2:"Chennai Super Kings",     date:"2026-04-06T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru" },
  { no:12, t1:"Kolkata Knight Riders",   t2:"Punjab Kings",                date:"2026-04-07T14:00:00Z", venue:"Eden Gardens, Kolkata" },
  { no:13, t1:"Rajasthan Royals",        t2:"Mumbai Indians",              date:"2026-04-08T14:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur" },
  { no:14, t1:"Delhi Capitals",          t2:"Gujarat Titans",              date:"2026-04-09T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi" },
  { no:15, t1:"Kolkata Knight Riders",   t2:"Lucknow Super Giants",        date:"2026-04-10T14:00:00Z", venue:"Eden Gardens, Kolkata" },
  { no:16, t1:"Rajasthan Royals",        t2:"Royal Challengers Bengaluru", date:"2026-04-11T10:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur" },
  { no:17, t1:"Punjab Kings",            t2:"Sunrisers Hyderabad",         date:"2026-04-11T14:00:00Z", venue:"HPCA Stadium, Dharamsala" },
  { no:18, t1:"Chennai Super Kings",     t2:"Delhi Capitals",              date:"2026-04-12T10:00:00Z", venue:"MA Chidambaram Stadium, Chennai" },
  { no:19, t1:"Lucknow Super Giants",    t2:"Gujarat Titans",              date:"2026-04-12T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow" },
  // WEEK 4
  { no:20, t1:"Mumbai Indians",          t2:"Royal Challengers Bengaluru", date:"2026-04-13T14:00:00Z", venue:"Wankhede Stadium, Mumbai" },
  { no:21, t1:"Sunrisers Hyderabad",     t2:"Rajasthan Royals",            date:"2026-04-14T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad" },
  { no:22, t1:"Chennai Super Kings",     t2:"Kolkata Knight Riders",       date:"2026-04-15T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai" },
  { no:23, t1:"Royal Challengers Bengaluru", t2:"Lucknow Super Giants",    date:"2026-04-16T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru" },
  { no:24, t1:"Mumbai Indians",          t2:"Punjab Kings",                date:"2026-04-17T14:00:00Z", venue:"Wankhede Stadium, Mumbai" },
  { no:25, t1:"Gujarat Titans",          t2:"Kolkata Knight Riders",       date:"2026-04-18T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad" },
  { no:26, t1:"Royal Challengers Bengaluru", t2:"Delhi Capitals",          date:"2026-04-19T10:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru" },
  { no:27, t1:"Sunrisers Hyderabad",     t2:"Chennai Super Kings",         date:"2026-04-19T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad" },
  { no:28, t1:"Kolkata Knight Riders",   t2:"Rajasthan Royals",            date:"2026-04-20T10:00:00Z", venue:"Eden Gardens, Kolkata" },
  { no:29, t1:"Punjab Kings",            t2:"Lucknow Super Giants",        date:"2026-04-20T14:00:00Z", venue:"HPCA Stadium, Dharamsala" },
  // WEEK 5
  { no:30, t1:"Gujarat Titans",          t2:"Mumbai Indians",              date:"2026-04-21T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad" },
  { no:31, t1:"Sunrisers Hyderabad",     t2:"Delhi Capitals",              date:"2026-04-22T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad" },
  { no:32, t1:"Lucknow Super Giants",    t2:"Rajasthan Royals",            date:"2026-04-23T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow" },
  { no:33, t1:"Mumbai Indians",          t2:"Chennai Super Kings",         date:"2026-04-24T14:00:00Z", venue:"Wankhede Stadium, Mumbai" },
  { no:34, t1:"Royal Challengers Bengaluru", t2:"Gujarat Titans",          date:"2026-04-25T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru" },
  { no:35, t1:"Delhi Capitals",          t2:"Punjab Kings",                date:"2026-04-26T10:00:00Z", venue:"Arun Jaitley Stadium, Delhi" },
  { no:36, t1:"Rajasthan Royals",        t2:"Sunrisers Hyderabad",         date:"2026-04-26T14:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur" },
  { no:37, t1:"Gujarat Titans",          t2:"Chennai Super Kings",         date:"2026-04-27T10:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad" },
  { no:38, t1:"Lucknow Super Giants",    t2:"Kolkata Knight Riders",       date:"2026-04-27T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow" },
  // WEEK 6
  { no:39, t1:"Delhi Capitals",          t2:"Royal Challengers Bengaluru", date:"2026-04-28T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi" },
  { no:40, t1:"Punjab Kings",            t2:"Rajasthan Royals",            date:"2026-04-29T14:00:00Z", venue:"HPCA Stadium, Dharamsala" },
  { no:41, t1:"Mumbai Indians",          t2:"Sunrisers Hyderabad",         date:"2026-04-30T14:00:00Z", venue:"Wankhede Stadium, Mumbai" },
  { no:42, t1:"Gujarat Titans",          t2:"Royal Challengers Bengaluru", date:"2026-05-01T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad" },
  { no:43, t1:"Rajasthan Royals",        t2:"Delhi Capitals",              date:"2026-05-02T10:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur" },
  { no:44, t1:"Chennai Super Kings",     t2:"Mumbai Indians",              date:"2026-05-02T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai" },
  { no:45, t1:"Punjab Kings",            t2:"Kolkata Knight Riders",       date:"2026-05-03T10:00:00Z", venue:"HPCA Stadium, Dharamsala" },
  { no:46, t1:"Lucknow Super Giants",    t2:"Sunrisers Hyderabad",         date:"2026-05-03T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow" },
  // WEEK 7
  { no:47, t1:"Delhi Capitals",          t2:"Rajasthan Royals",            date:"2026-05-04T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi" },
  { no:48, t1:"Royal Challengers Bengaluru", t2:"Punjab Kings",            date:"2026-05-05T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru" },
  { no:49, t1:"Kolkata Knight Riders",   t2:"Gujarat Titans",              date:"2026-05-06T14:00:00Z", venue:"Eden Gardens, Kolkata" },
  { no:50, t1:"Mumbai Indians",          t2:"Lucknow Super Giants",        date:"2026-05-07T14:00:00Z", venue:"Wankhede Stadium, Mumbai" },
  { no:51, t1:"Chennai Super Kings",     t2:"Sunrisers Hyderabad",         date:"2026-05-08T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai" },
  { no:52, t1:"Rajasthan Royals",        t2:"Kolkata Knight Riders",       date:"2026-05-09T10:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur" },
  { no:53, t1:"Punjab Kings",            t2:"Delhi Capitals",              date:"2026-05-09T14:00:00Z", venue:"HPCA Stadium, Dharamsala" },
  { no:54, t1:"Lucknow Super Giants",    t2:"Royal Challengers Bengaluru", date:"2026-05-10T10:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow" },
  { no:55, t1:"Gujarat Titans",          t2:"Sunrisers Hyderabad",         date:"2026-05-10T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad" },
  // WEEK 8
  { no:56, t1:"Mumbai Indians",          t2:"Kolkata Knight Riders",       date:"2026-05-11T14:00:00Z", venue:"Wankhede Stadium, Mumbai" },
  { no:57, t1:"Delhi Capitals",          t2:"Chennai Super Kings",         date:"2026-05-12T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi" },
  { no:58, t1:"Royal Challengers Bengaluru", t2:"Rajasthan Royals",        date:"2026-05-13T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru" },
  { no:59, t1:"Sunrisers Hyderabad",     t2:"Punjab Kings",                date:"2026-05-14T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad" },
  { no:60, t1:"Kolkata Knight Riders",   t2:"Delhi Capitals",              date:"2026-05-15T14:00:00Z", venue:"Eden Gardens, Kolkata" },
  { no:61, t1:"Mumbai Indians",          t2:"Gujarat Titans",              date:"2026-05-16T10:00:00Z", venue:"Wankhede Stadium, Mumbai" },
  { no:62, t1:"Lucknow Super Giants",    t2:"Chennai Super Kings",         date:"2026-05-16T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow" },
  { no:63, t1:"Rajasthan Royals",        t2:"Punjab Kings",                date:"2026-05-17T10:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur" },
  { no:64, t1:"Royal Challengers Bengaluru", t2:"Kolkata Knight Riders",   date:"2026-05-17T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru" },
  // WEEK 9
  { no:65, t1:"Gujarat Titans",          t2:"Delhi Capitals",              date:"2026-05-18T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad" },
  { no:66, t1:"Sunrisers Hyderabad",     t2:"Mumbai Indians",              date:"2026-05-19T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad" },
  { no:67, t1:"Punjab Kings",            t2:"Chennai Super Kings",         date:"2026-05-20T14:00:00Z", venue:"HPCA Stadium, Dharamsala" },
  { no:68, t1:"Delhi Capitals",          t2:"Lucknow Super Giants",        date:"2026-05-21T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi" },
  { no:69, t1:"Rajasthan Royals",        t2:"Gujarat Titans",              date:"2026-05-22T14:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur" },
  { no:70, t1:"Kolkata Knight Riders",   t2:"Royal Challengers Bengaluru", date:"2026-05-23T14:00:00Z", venue:"Eden Gardens, Kolkata" },
  { no:71, t1:"Mumbai Indians",          t2:"Delhi Capitals",              date:"2026-05-24T10:00:00Z", venue:"Wankhede Stadium, Mumbai" },
  { no:72, t1:"Chennai Super Kings",     t2:"Gujarat Titans",              date:"2026-05-24T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai" },
  // Playoffs (dates TBC)
  { no:73, t1:"TBD (1st)",              t2:"TBD (2nd)",                   date:"2026-05-26T14:00:00Z", venue:"TBD – Qualifier 1" },
  { no:74, t1:"TBD (3rd)",              t2:"TBD (4th)",                   date:"2026-05-27T14:00:00Z", venue:"TBD – Eliminator" },
  { no:75, t1:"TBD",                    t2:"TBD",                         date:"2026-05-29T14:00:00Z", venue:"TBD – Qualifier 2" },
  { no:76, t1:"TBD",                    t2:"TBD",                         date:"2026-05-31T14:00:00Z", venue:"TBD – Final" },
];

// Match duration: T20 is typically ~3.5 hours
const MATCH_DURATION_MS = 3.5 * 60 * 60 * 1000;

function norm(n) { return (n || '').toLowerCase().replace(/[^a-z]/g, ''); }

// ── Dream11 Fantasy Points ─────────────────────────────────────────
function fantasyPts(bat, bowl, inXI) {
  let p = inXI ? 4 : 0;
  const r = bat.r || 0, b = bat.b || 0;
  p += r + (bat['4s'] || 0) + (bat['6s'] || 0) * 2;
  if (r >= 100) p += 16; else if (r >= 50) p += 8; else if (r >= 30) p += 4;
  if (r === 0 && bat.dismissal && !/not out/i.test(bat.dismissal)) p -= 2;
  if (b >= 10) {
    const sr = (r / b) * 100;
    if      (sr > 170) p += 6; else if (sr > 150) p += 4; else if (sr > 130) p += 2;
    else if (sr <  50) p -= 6; else if (sr <  60) p -= 4; else if (sr <  70) p -= 2;
  }
  const w = bowl.w || 0, o = parseFloat(bowl.o) || 0, br = bowl.r || 0;
  p += w * 25 + (bowl.maiden || 0) * 8;
  if (w >= 5) p += 8; else if (w >= 4) p += 4; else if (w >= 3) p += 4;
  if (o >= 2) {
    const eco = br / o;
    if      (eco <  5) p += 6; else if (eco <  6) p += 4; else if (eco <  7) p += 2;
    else if (eco >= 10) p -= 6; else if (eco >= 9) p -= 4; else if (eco >= 8) p -= 2;
  }
  return Math.round(p);
}

function extractPts(scorecard) {
  const pts = {}, seenBat = new Set();
  (scorecard || []).forEach(inn => {
    (inn.batting || []).forEach(b => {
      const name = b.batsman?.name || b.name; if (!name) return;
      const k = norm(name), first = !seenBat.has(k); seenBat.add(k);
      pts[k] = (pts[k] || 0) + fantasyPts({ r:b.r||0, b:b.b||0, '4s':b['4s']||0, '6s':b['6s']||0, dismissal:b.dismissal||'' }, {}, first);
    });
    (inn.bowling || []).forEach(bw => {
      const name = bw.bowler?.name || bw.name; if (!name) return;
      const k = norm(name);
      pts[k] = (pts[k] || 0) + fantasyPts({}, { w:bw.w||0, o:bw.o||0, r:bw.r||0, maiden:bw.maiden||0 }, false);
    });
  });
  return pts;
}

// ── Try to scrape live scores from Cricbuzz mobile HTML ────────────
async function fetchCricbuzzLive() {
  try {
    const r = await fetch('https://m.cricbuzz.com/cricket-match/live', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return {};
    const html = await r.text();

    // Cricbuzz embeds match data in JSON inside script tags
    // Try __NEXT_DATA__ first
    const nextMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextMatch) {
      const data = JSON.parse(nextMatch[1]);
      return parseCricbuzzNextData(data);
    }

    // Fallback: look for window.__data or similar
    const dataMatch = html.match(/window\.__data\s*=\s*({[\s\S]*?});\s*<\/script>/);
    if (dataMatch) return JSON.parse(dataMatch[1]);

    return {};
  } catch (e) {
    console.warn('Cricbuzz scrape failed:', e.message);
    return {};
  }
}

function parseCricbuzzNextData(data) {
  // Cricbuzz Next.js data structure – extract live match scores
  // Returns { [matchTitle]: { s1, s2, result, status } }
  const scores = {};
  try {
    const matches = data?.props?.pageProps?.matches
      || data?.props?.pageProps?.data?.matches
      || [];
    (Array.isArray(matches) ? matches : []).forEach(m => {
      const title = (m.matchInfo?.matchTitle || m.title || '').toLowerCase();
      const teams = m.matchInfo?.team1?.teamSName + '_' + m.matchInfo?.team2?.teamSName;
      const score1 = m.matchScore?.team1Score?.inngs1;
      const score2 = m.matchScore?.team2Score?.inngs1;
      scores[teams.toLowerCase()] = {
        s1: score1 ? `${score1.runs}/${score1.wickets}` : '',
        o1: score1 ? String(score1.overs) : '',
        s2: score2 ? `${score2.runs}/${score2.wickets}` : '',
        o2: score2 ? String(score2.overs) : '',
        result: m.matchInfo?.status || '',
      };
    });
  } catch (_) {}
  return scores;
}

// ── Determine match status from schedule + current time ───────────
function getStatus(matchDate) {
  const now = Date.now();
  const start = new Date(matchDate).getTime();
  const end = start + MATCH_DURATION_MS;
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'completed';
}

// ── Build match object ────────────────────────────────────────────
function buildMatch(sched, liveScores) {
  const status = getStatus(sched.date);
  // Try to find live score data for this match
  const key = `${sched.t1.split(' ').pop()}_${sched.t2.split(' ').pop()}`.toLowerCase();
  const live = liveScores[key] || {};
  const isoDate = new Date(sched.date).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }) + ' · ' + new Date(sched.date).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata', hour12: true
  }) + ' IST';

  return {
    id: `ipl2026_match${sched.no}`,
    no: sched.no,
    t1: sched.t1, t2: sched.t2,
    f1: sched.t1, f2: sched.t2,
    s1: live.s1 || '', o1: live.o1 || '',
    s2: live.s2 || '', o2: live.o2 || '',
    status,
    date: isoDate,
    venue: sched.venue,
    result: live.result || (status === 'completed' ? 'Match completed' : ''),
    toss: '',
    scorecard: [],
    playerPoints: {},
  };
}

// ── Handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');

  const now = Date.now();

  // Determine which matches need live scores
  const needsLive = SCHEDULE.some(s => {
    const start = new Date(s.date).getTime();
    return now >= start && now <= start + MATCH_DURATION_MS;
  });

  // Only hit Cricbuzz when a match is actually live
  const liveScores = needsLive ? await fetchCricbuzzLive() : {};

  // Sort: live → upcoming → completed
  const sorted = [...SCHEDULE].sort((a, b) => {
    const sa = getStatus(a.date), sb = getStatus(b.date);
    const order = { live: 0, upcoming: 1, completed: 2 };
    if (sa !== sb) return order[sa] - order[sb];
    if (sa === 'upcoming') return new Date(a.date) - new Date(b.date);
    return new Date(b.date) - new Date(a.date); // most recent completed first
  });

  const matches = sorted.map(s => buildMatch(s, liveScores));

  res.json({ matches, fetchedAt: now });
}
