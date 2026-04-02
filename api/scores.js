// api/scores.js — Vercel Serverless Function
// Returns full IPL 2026 schedule with playerPoints loaded from Firestore cache

export const config = { maxDuration: 15 };

const FB_KEY = 'AIzaSyDL-KwaBrgRCHsxqDNtzs_l4h_dVw6I-FU';
const FB_PRJ = 'fantasy-ipl-pacers';
const FS     = `https://firestore.googleapis.com/v1/projects/${FB_PRJ}/databases/(default)/documents`;

// ── Full IPL 2026 Schedule ────────────────────────────────────────
const SCHEDULE = [
  {no:1,  t1:"Sunrisers Hyderabad",        t2:"Royal Challengers Bengaluru", date:"2026-03-28T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru"},
  {no:2,  t1:"Kolkata Knight Riders",      t2:"Mumbai Indians",              date:"2026-03-29T14:00:00Z", venue:"Eden Gardens, Kolkata"},
  {no:3,  t1:"Chennai Super Kings",        t2:"Rajasthan Royals",            date:"2026-03-30T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai"},
  {no:4,  t1:"Gujarat Titans",             t2:"Punjab Kings",                date:"2026-03-31T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad"},
  {no:5,  t1:"Lucknow Super Giants",       t2:"Delhi Capitals",              date:"2026-04-01T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow"},
  {no:6,  t1:"Kolkata Knight Riders",      t2:"Sunrisers Hyderabad",         date:"2026-04-03T14:00:00Z", venue:"Eden Gardens, Kolkata"},
  {no:7,  t1:"Chennai Super Kings",        t2:"Punjab Kings",                date:"2026-04-04T10:00:00Z", venue:"MA Chidambaram Stadium, Chennai"},
  {no:8,  t1:"Delhi Capitals",             t2:"Mumbai Indians",              date:"2026-04-04T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi"},
  {no:9,  t1:"Gujarat Titans",             t2:"Rajasthan Royals",            date:"2026-04-04T10:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad"},
  {no:10, t1:"Sunrisers Hyderabad",        t2:"Lucknow Super Giants",        date:"2026-04-05T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad"},
  {no:11, t1:"Royal Challengers Bengaluru",t2:"Chennai Super Kings",         date:"2026-04-06T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru"},
  {no:12, t1:"Kolkata Knight Riders",      t2:"Punjab Kings",                date:"2026-04-07T14:00:00Z", venue:"Eden Gardens, Kolkata"},
  {no:13, t1:"Rajasthan Royals",           t2:"Mumbai Indians",              date:"2026-04-07T14:00:00Z", venue:"ACA Stadium, Guwahati"},
  {no:14, t1:"Delhi Capitals",             t2:"Gujarat Titans",              date:"2026-04-08T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi"},
  {no:15, t1:"Kolkata Knight Riders",      t2:"Lucknow Super Giants",        date:"2026-04-09T14:00:00Z", venue:"Eden Gardens, Kolkata"},
  {no:16, t1:"Rajasthan Royals",           t2:"Royal Challengers Bengaluru", date:"2026-04-10T14:00:00Z", venue:"ACA Stadium, Guwahati"},
  {no:17, t1:"Punjab Kings",               t2:"Sunrisers Hyderabad",         date:"2026-04-11T10:00:00Z", venue:"HPCA Stadium, Dharamsala"},
  {no:18, t1:"Chennai Super Kings",        t2:"Delhi Capitals",              date:"2026-04-11T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai"},
  {no:19, t1:"Lucknow Super Giants",       t2:"Gujarat Titans",              date:"2026-04-12T10:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow"},
  {no:20, t1:"Mumbai Indians",             t2:"Royal Challengers Bengaluru", date:"2026-04-12T14:00:00Z", venue:"Wankhede Stadium, Mumbai"},
  {no:21, t1:"Sunrisers Hyderabad",        t2:"Rajasthan Royals",            date:"2026-04-13T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad"},
  {no:22, t1:"Chennai Super Kings",        t2:"Kolkata Knight Riders",       date:"2026-04-15T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai"},
  {no:23, t1:"Royal Challengers Bengaluru",t2:"Lucknow Super Giants",        date:"2026-04-16T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru"},
  {no:24, t1:"Mumbai Indians",             t2:"Punjab Kings",                date:"2026-04-17T14:00:00Z", venue:"Wankhede Stadium, Mumbai"},
  {no:25, t1:"Gujarat Titans",             t2:"Kolkata Knight Riders",       date:"2026-04-18T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad"},
  {no:26, t1:"Royal Challengers Bengaluru",t2:"Delhi Capitals",              date:"2026-04-19T10:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru"},
  {no:27, t1:"Sunrisers Hyderabad",        t2:"Chennai Super Kings",         date:"2026-04-19T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad"},
  {no:28, t1:"Kolkata Knight Riders",      t2:"Rajasthan Royals",            date:"2026-04-19T10:00:00Z", venue:"Eden Gardens, Kolkata"},
  {no:29, t1:"Punjab Kings",               t2:"Lucknow Super Giants",        date:"2026-04-20T14:00:00Z", venue:"HPCA Stadium, Dharamsala"},
  {no:30, t1:"Gujarat Titans",             t2:"Mumbai Indians",              date:"2026-04-21T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad"},
  {no:31, t1:"Sunrisers Hyderabad",        t2:"Delhi Capitals",              date:"2026-04-22T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad"},
  {no:32, t1:"Lucknow Super Giants",       t2:"Rajasthan Royals",            date:"2026-04-22T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow"},
  {no:33, t1:"Mumbai Indians",             t2:"Chennai Super Kings",         date:"2026-04-24T14:00:00Z", venue:"Wankhede Stadium, Mumbai"},
  {no:34, t1:"Royal Challengers Bengaluru",t2:"Gujarat Titans",              date:"2026-04-25T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru"},
  {no:35, t1:"Delhi Capitals",             t2:"Punjab Kings",                date:"2026-04-26T10:00:00Z", venue:"Arun Jaitley Stadium, Delhi"},
  {no:36, t1:"Rajasthan Royals",           t2:"Sunrisers Hyderabad",         date:"2026-04-25T14:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur"},
  {no:37, t1:"Gujarat Titans",             t2:"Chennai Super Kings",         date:"2026-04-27T10:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad"},
  {no:38, t1:"Lucknow Super Giants",       t2:"Kolkata Knight Riders",       date:"2026-04-27T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow"},
  {no:39, t1:"Delhi Capitals",             t2:"Royal Challengers Bengaluru", date:"2026-04-28T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi"},
  {no:40, t1:"Punjab Kings",               t2:"Rajasthan Royals",            date:"2026-04-28T14:00:00Z", venue:"New International Cricket Stadium, New Chandigarh"},
  {no:41, t1:"Mumbai Indians",             t2:"Sunrisers Hyderabad",         date:"2026-04-30T14:00:00Z", venue:"Wankhede Stadium, Mumbai"},
  {no:42, t1:"Gujarat Titans",             t2:"Royal Challengers Bengaluru", date:"2026-05-01T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad"},
  {no:43, t1:"Rajasthan Royals",           t2:"Delhi Capitals",              date:"2026-05-01T14:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur"},
  {no:44, t1:"Chennai Super Kings",        t2:"Mumbai Indians",              date:"2026-05-02T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai"},
  {no:45, t1:"Punjab Kings",               t2:"Kolkata Knight Riders",       date:"2026-05-03T10:00:00Z", venue:"New International Cricket Stadium, New Chandigarh"},
  {no:46, t1:"Lucknow Super Giants",       t2:"Sunrisers Hyderabad",         date:"2026-05-03T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow"},
  {no:47, t1:"Delhi Capitals",             t2:"Rajasthan Royals",            date:"2026-05-04T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi"},
  {no:48, t1:"Royal Challengers Bengaluru",t2:"Punjab Kings",                date:"2026-05-05T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru"},
  {no:49, t1:"Kolkata Knight Riders",      t2:"Gujarat Titans",              date:"2026-05-06T14:00:00Z", venue:"Eden Gardens, Kolkata"},
  {no:50, t1:"Mumbai Indians",             t2:"Lucknow Super Giants",        date:"2026-05-07T14:00:00Z", venue:"Wankhede Stadium, Mumbai"},
  {no:51, t1:"Chennai Super Kings",        t2:"Sunrisers Hyderabad",         date:"2026-05-08T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai"},
  {no:52, t1:"Rajasthan Royals",           t2:"Kolkata Knight Riders",       date:"2026-05-09T10:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur"},
  {no:53, t1:"Punjab Kings",               t2:"Delhi Capitals",              date:"2026-05-09T14:00:00Z", venue:"New International Cricket Stadium, New Chandigarh"},
  {no:54, t1:"Lucknow Super Giants",       t2:"Royal Challengers Bengaluru", date:"2026-05-10T10:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow"},
  {no:55, t1:"Gujarat Titans",             t2:"Sunrisers Hyderabad",         date:"2026-05-10T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad"},
  {no:56, t1:"Mumbai Indians",             t2:"Kolkata Knight Riders",       date:"2026-05-11T14:00:00Z", venue:"Wankhede Stadium, Mumbai"},
  {no:57, t1:"Delhi Capitals",             t2:"Chennai Super Kings",         date:"2026-05-12T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi"},
  {no:58, t1:"Royal Challengers Bengaluru",t2:"Rajasthan Royals",            date:"2026-05-13T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru"},
  {no:59, t1:"Sunrisers Hyderabad",        t2:"Punjab Kings",                date:"2026-05-14T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad"},
  {no:60, t1:"Kolkata Knight Riders",      t2:"Delhi Capitals",              date:"2026-05-15T14:00:00Z", venue:"Eden Gardens, Kolkata"},
  {no:61, t1:"Mumbai Indians",             t2:"Gujarat Titans",              date:"2026-05-16T10:00:00Z", venue:"Wankhede Stadium, Mumbai"},
  {no:62, t1:"Lucknow Super Giants",       t2:"Chennai Super Kings",         date:"2026-05-16T14:00:00Z", venue:"BRSABV Ekana Cricket Stadium, Lucknow"},
  {no:63, t1:"Rajasthan Royals",           t2:"Punjab Kings",                date:"2026-05-17T10:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur"},
  {no:64, t1:"Royal Challengers Bengaluru",t2:"Kolkata Knight Riders",       date:"2026-05-17T14:00:00Z", venue:"M. Chinnaswamy Stadium, Bengaluru"},
  {no:65, t1:"Gujarat Titans",             t2:"Delhi Capitals",              date:"2026-05-18T14:00:00Z", venue:"Narendra Modi Stadium, Ahmedabad"},
  {no:66, t1:"Sunrisers Hyderabad",        t2:"Mumbai Indians",              date:"2026-05-19T14:00:00Z", venue:"Rajiv Gandhi Intl. Stadium, Hyderabad"},
  {no:67, t1:"Punjab Kings",               t2:"Chennai Super Kings",         date:"2026-05-20T14:00:00Z", venue:"New International Cricket Stadium, New Chandigarh"},
  {no:68, t1:"Delhi Capitals",             t2:"Lucknow Super Giants",        date:"2026-05-21T14:00:00Z", venue:"Arun Jaitley Stadium, Delhi"},
  {no:69, t1:"Rajasthan Royals",           t2:"Gujarat Titans",              date:"2026-05-22T14:00:00Z", venue:"Sawai Mansingh Stadium, Jaipur"},
  {no:70, t1:"Kolkata Knight Riders",      t2:"Royal Challengers Bengaluru", date:"2026-05-23T14:00:00Z", venue:"Eden Gardens, Kolkata"},
  {no:71, t1:"Mumbai Indians",             t2:"Delhi Capitals",              date:"2026-05-24T10:00:00Z", venue:"Wankhede Stadium, Mumbai"},
  {no:72, t1:"Chennai Super Kings",        t2:"Gujarat Titans",              date:"2026-05-24T14:00:00Z", venue:"MA Chidambaram Stadium, Chennai"},
  // Playoffs (venues TBC)
  {no:73, t1:"TBD (1st)",                  t2:"TBD (2nd)",                   date:"2026-05-26T14:00:00Z", venue:"TBD — Qualifier 1"},
  {no:74, t1:"TBD (3rd)",                  t2:"TBD (4th)",                   date:"2026-05-27T14:00:00Z", venue:"TBD — Eliminator"},
  {no:75, t1:"TBD",                        t2:"TBD",                         date:"2026-05-29T14:00:00Z", venue:"TBD — Qualifier 2"},
  {no:76, t1:"TBD",                        t2:"TBD",                         date:"2026-05-31T14:00:00Z", venue:"TBD — Final"},
];

const MATCH_DUR_MS = 3.5 * 60 * 60 * 1000;

function getStatus(dateStr) {
  const now = Date.now(), start = new Date(dateStr).getTime();
  if (now < start) return 'upcoming';
  if (now <= start + MATCH_DUR_MS) return 'live';
  return 'completed';
}

// ── Load cached player points from Firestore ──────────────────────
async function loadCachedScorecard(matchNo) {
  try {
    const r = await fetch(`${FS}/scorecards/match_${matchNo}?key=${FB_KEY}`);
    if (!r.ok) return null;
    const d = await r.json();
    if (!d.fields?.data?.stringValue) return null;
    return JSON.parse(d.fields.data.stringValue);
  } catch { return null; }
}

// ── Handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const now = Date.now();

  // Load Firestore cached scorecards for recently completed matches (last 7 days)
  const recentCompleted = SCHEDULE.filter(m => {
    const end = new Date(m.date).getTime() + MATCH_DUR_MS;
    return end < now && end > now - 7 * 24 * 60 * 60 * 1000;
  });

  // Fetch all cached scorecards in parallel
  const scorecardMap = {};
  await Promise.all(
    recentCompleted.map(async m => {
      const sc = await loadCachedScorecard(m.no);
      if (sc?.playerPoints) scorecardMap[m.no] = sc;
    })
  );

  // Build match list
  const matches = SCHEDULE.map(m => {
    const status = getStatus(m.date);
    const sc     = scorecardMap[m.no];
    const isoDate = new Date(m.date).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      timeZone: 'Asia/Kolkata',
    }) + ' · ' + new Date(m.date).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Kolkata', hour12: true,
    }) + ' IST';

    return {
      id:           `ipl2026_match${m.no}`,
      no:           m.no,
      t1:           m.t1, t2: m.t2,
      f1:           m.t1, f2: m.t2,
      s1:           sc?.s1 || '',
      s2:           sc?.s2 || '',
      o1:           sc?.o1 || '',
      o2:           sc?.o2 || '',
      status,
      date:         isoDate,
      venue:        m.venue,
      result:       sc?.result || (status === 'completed' ? 'Match completed' : ''),
      toss:         sc?.toss   || '',
      scorecard:    sc?.innings || [],
      playerPoints: sc?.playerPoints || {},
    };
  });

  // Sort: live → upcoming (soonest first) → completed (most recent first)
  const order = { live: 0, upcoming: 1, completed: 2 };
  matches.sort((a, b) => {
    if (a.status !== b.status) return order[a.status] - order[b.status];
    const da = SCHEDULE.find(s => s.no === a.no)?.date || '';
    const db = SCHEDULE.find(s => s.no === b.no)?.date || '';
    if (a.status === 'upcoming') return new Date(da) - new Date(db);
    return new Date(db) - new Date(da); // completed: newest first
  });

  res.json({ matches, fetchedAt: now });
}
