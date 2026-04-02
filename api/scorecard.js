// api/scorecard.js — Vercel Serverless Function
// Scrapes full scorecards from official IPL franchise websites (free, no API key)
// Fetches from BOTH team sites to get both innings, stores permanently in Firestore

export const config = { maxDuration: 30 };

// ── IPL Team website domains ──────────────────────────────────────
const SITES = {
  'Royal Challengers Bengaluru': 'https://www.royalchallengers.com',
  'Mumbai Indians':              'https://www.mumbaiindians.com',
  'Chennai Super Kings':         'https://www.csk.in',
  'Kolkata Knight Riders':       'https://www.kkr.in',
  'Sunrisers Hyderabad':         'https://www.sunrisershyderabad.in',
  'Rajasthan Royals':            'https://www.rajasthanroyals.com',
  'Gujarat Titans':              'https://www.gujarattitans.com',
  'Punjab Kings':                'https://www.punjabkings.in',
  'Lucknow Super Giants':        'https://www.lucknowsupergiants.com',
  'Delhi Capitals':              'https://www.delhicapitals.com',
};

// Known match slugs (confirmed from Rajasthan Royals schedule page)
// Same slug works on ALL IPL team websites
const SLUGS = {
  1:  'royal-challengers-bengaluru-vs-sunrisers-hyderabad-bcsh03282026267882',
  2:  'kolkata-knight-riders-vs-mumbai-indians-krmw03292026267883',
  3:  'rajasthan-royals-vs-chennai-super-kings-rrck03302026267884',
  4:  'gujarat-titans-vs-punjab-kings-ahmkp03312026267885',
  5:  'lucknow-super-giants-vs-delhi-capitals-lkodd04012026267886',
  6:  'kolkata-knight-riders-vs-sunrisers-hyderabad-krsh04032026270054',
  7:  'chennai-super-kings-vs-punjab-kings-ckckp04042026270055',
  8:  'delhi-capitals-vs-mumbai-indians-ddmw04042026270057',
  9:  'gujarat-titans-vs-rajasthan-royals-ahmrr04042026270056',
  10: 'sunrisers-hyderabad-vs-lucknow-super-giants-shlko04052026270058',
  11: 'royal-challengers-bengaluru-vs-chennai-super-kings-bcck04062026270059',
  12: 'kolkata-knight-riders-vs-punjab-kings-krkp04072026270060',
  13: 'rajasthan-royals-vs-mumbai-indians-rrmi04072026270060',
  14: 'delhi-capitals-vs-gujarat-titans-ddahm04082026270061',
  15: 'kolkata-knight-riders-vs-lucknow-super-giants-krlko04092026270062',
  16: 'rajasthan-royals-vs-royal-challengers-bengaluru-rrbc04102026270063',
  17: 'punjab-kings-vs-sunrisers-hyderabad-kprr04112026270292',
  18: 'chennai-super-kings-vs-delhi-capitals-ckdd04122026270293',
  19: 'lucknow-super-giants-vs-gujarat-titans-lkoahm04122026270294',
  20: 'mumbai-indians-vs-royal-challengers-bengaluru-mwbc04132026270295',
  21: 'sunrisers-hyderabad-vs-rajasthan-royals-shrr04132026270292',
  22: 'chennai-super-kings-vs-kolkata-knight-riders-ckkr04152026270296',
  23: 'royal-challengers-bengaluru-vs-lucknow-super-giants-bclko04162026270297',
  24: 'mumbai-indians-vs-punjab-kings-mwkp04172026270298',
  25: 'gujarat-titans-vs-kolkata-knight-riders-ahmkr04182026270299',
  26: 'royal-challengers-bengaluru-vs-delhi-capitals-bcdd04192026270300',
  27: 'sunrisers-hyderabad-vs-chennai-super-kings-shck04192026270301',
  28: 'kolkata-knight-riders-vs-rajasthan-royals-krrr04192026270299',
  29: 'punjab-kings-vs-lucknow-super-giants-kplko04202026270302',
  30: 'gujarat-titans-vs-mumbai-indians-ahmmw04212026270303',
  31: 'sunrisers-hyderabad-vs-delhi-capitals-shdd04222026270304',
  32: 'lucknow-super-giants-vs-rajasthan-royals-lkorr04222026270303',
  33: 'mumbai-indians-vs-chennai-super-kings-mwck04242026270305',
  34: 'royal-challengers-bengaluru-vs-gujarat-titans-bcahm04252026270306',
  35: 'delhi-capitals-vs-punjab-kings-ddkp04262026270307',
  36: 'rajasthan-royals-vs-sunrisers-hyderabad-rrsh04252026270307',
  37: 'gujarat-titans-vs-chennai-super-kings-ahmck04272026270308',
  38: 'lucknow-super-giants-vs-kolkata-knight-riders-lkokr04272026270309',
  39: 'delhi-capitals-vs-royal-challengers-bengaluru-ddbc04282026270310',
  40: 'punjab-kings-vs-rajasthan-royals-kprr04282026270311',
  41: 'mumbai-indians-vs-sunrisers-hyderabad-mwsh04302026270312',
  42: 'gujarat-titans-vs-royal-challengers-bengaluru-ahmbc05012026270313',
  43: 'rajasthan-royals-vs-delhi-capitals-rrdd05012026270314',
  44: 'chennai-super-kings-vs-mumbai-indians-ckmw05022026270315',
  45: 'punjab-kings-vs-kolkata-knight-riders-kpkr05032026270316',
  46: 'lucknow-super-giants-vs-sunrisers-hyderabad-lkosh05032026270317',
  47: 'delhi-capitals-vs-rajasthan-royals-ddrr05042026270318',
  48: 'royal-challengers-bengaluru-vs-punjab-kings-bckp05052026270319',
  49: 'kolkata-knight-riders-vs-gujarat-titans-krahm05062026270320',
  50: 'mumbai-indians-vs-lucknow-super-giants-mwlko05072026270321',
  51: 'chennai-super-kings-vs-sunrisers-hyderabad-cksh05082026270322',
  52: 'rajasthan-royals-vs-kolkata-knight-riders-rrkr05092026270323',
  53: 'punjab-kings-vs-delhi-capitals-kpdd05092026270324',
  54: 'lucknow-super-giants-vs-royal-challengers-bengaluru-lkobc05102026270325',
  55: 'gujarat-titans-vs-sunrisers-hyderabad-ahmsh05102026270326',
  56: 'mumbai-indians-vs-kolkata-knight-riders-mwkr05112026270327',
  57: 'delhi-capitals-vs-chennai-super-kings-ddck05122026270328',
  58: 'royal-challengers-bengaluru-vs-rajasthan-royals-bcrr05132026270329',
  59: 'sunrisers-hyderabad-vs-punjab-kings-shkp05142026270330',
  60: 'kolkata-knight-riders-vs-delhi-capitals-krdd05152026270331',
  61: 'mumbai-indians-vs-gujarat-titans-mwahm05162026270332',
  62: 'lucknow-super-giants-vs-chennai-super-kings-lkock05162026270333',
  63: 'rajasthan-royals-vs-punjab-kings-rrkp05172026270334',
  64: 'royal-challengers-bengaluru-vs-kolkata-knight-riders-bckr05172026270335',
  65: 'gujarat-titans-vs-delhi-capitals-ahmdd05182026270336',
  66: 'sunrisers-hyderabad-vs-mumbai-indians-shmw05192026270337',
  67: 'punjab-kings-vs-chennai-super-kings-kpck05202026270338',
  68: 'delhi-capitals-vs-lucknow-super-giants-ddlko05212026270339',
  69: 'rajasthan-royals-vs-gujarat-titans-rrahm05222026270340',
  70: 'kolkata-knight-riders-vs-royal-challengers-bengaluru-krbc05232026270341',
  71: 'mumbai-indians-vs-delhi-capitals-mwdd05242026270342',
  72: 'chennai-super-kings-vs-gujarat-titans-ckahm05242026270343',
};

// ── Firestore REST ────────────────────────────────────────────────
const FB_KEY = 'AIzaSyDL-KwaBrgRCHsxqDNtzs_l4h_dVw6I-FU';
const FB_PRJ = 'fantasy-ipl-pacers';
const FS     = `https://firestore.googleapis.com/v1/projects/${FB_PRJ}/databases/(default)/documents`;

async function fsGet(col, id) {
  try {
    const r = await fetch(`${FS}/${col}/${id}?key=${FB_KEY}`);
    if (!r.ok) return null;
    const d = await r.json();
    return d.fields?.data?.stringValue ? JSON.parse(d.fields.data.stringValue) : null;
  } catch { return null; }
}

async function fsSet(col, id, data) {
  try {
    await fetch(`${FS}/${col}/${id}?key=${FB_KEY}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          data:      { stringValue: JSON.stringify(data) },
          matchNo:   { integerValue: String(data.matchNo || 0) },
          updatedAt: { stringValue: new Date().toISOString() },
        }
      })
    });
  } catch { /* best effort */ }
}

// ── HTML → parseable text ─────────────────────────────────────────
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, (_, t) => '\n#### ' + t.replace(/<[^>]+>/g, '').trim() + '\n')
    .replace(/<td[^>]*>([\s\S]*?)<\/td>/gi, (_, t) => '\n' + t.replace(/<[^>]+>/g, '').trim())
    .replace(/<div[^>]*class="[^"]*dismissal[^"]*"[^>]*>([\s\S]*?)<\/div>/gi, (_, t) => '\n' + t.replace(/<[^>]+>/g, '').trim())
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ').replace(/^\s+/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Parse clean text into innings data ────────────────────────────
const TEAM_RE = /Royal Challengers Bengaluru|Mumbai Indians|Chennai Super Kings|Kolkata Knight Riders|Delhi Capitals|Sunrisers Hyderabad|Rajasthan Royals|Gujarat Titans|Punjab Kings|Lucknow Super Giants/i;

function parseInnings(html) {
  const text  = htmlToText(html);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const innings = [];
  let inn = null, mode = null, i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // New team / innings section
    if (TEAM_RE.test(line) && !line.startsWith('####')) {
      const m = line.match(TEAM_RE);
      if (m) {
        if (inn && (inn.batting.length || inn.bowling.length)) innings.push(inn);
        inn = { team: m[0], total: '', overs: '', batting: [], bowling: [] };
        const sc = line.match(/(\d+\/\d+)/);   if (sc) inn.total = sc[1];
        const ov = line.match(/\(([\d.]+)\s*(?:ov|overs?)?\)/); if (ov) inn.overs = ov[1];
      }
      i++; continue;
    }

    // Section markers
    if (/^Batting$/i.test(line)) { mode = 'bat';  i++; continue; }
    if (/^Bowling$/i.test(line)) { mode = 'bowl'; i++; continue; }

    // Standalone score/overs
    if (inn && /^\d+\/\d+$/.test(line))   { inn.total = line; i++; continue; }
    if (inn && /^\([\d.]+/.test(line))    {
      const m = line.match(/\(([\d.]+)/); if (m) inn.overs = m[1];
      i++; continue;
    }

    // Player header (#### Name)
    if (line.startsWith('####') && inn) {
      const name = line.replace(/^####\s*/, '').replace(/\(c\)|\(w\)|\(wk\)/gi, '').trim();
      if (!name) { i++; continue; }

      const nums = [], texts = [];
      let j = i + 1;
      while (j < lines.length) {
        const nx = lines[j].trim();
        if (nx.startsWith('####') || /^(Batting|Bowling)$/i.test(nx) || TEAM_RE.test(nx)) break;
        if (/^[\d.]+$/.test(nx)) nums.push(parseFloat(nx));
        else if (nx) texts.push(nx);
        j++;
        if (nums.length >= 7) break;
      }

      const dismissal = texts.find(t =>
        /^(?:c\s|b\s|lbw|run\s*out|not\s*out|st\s|caught|bowled|retired)/i.test(t)
      ) || 'not out';

      if (mode === 'bat' && nums.length >= 2) {
        inn.batting.push({ name, r: nums[0]||0, b: nums[1]||0, '4s': nums[2]||0, '6s': nums[3]||0, dismissal });
      } else if (mode === 'bowl' && nums.length >= 4) {
        inn.bowling.push({ name, o: nums[0]||0, maiden: nums[1]||0, r: nums[2]||0, w: nums[3]||0 });
      }
      i = j; continue;
    }

    i++;
  }

  if (inn && (inn.batting.length || inn.bowling.length)) innings.push(inn);
  return innings;
}

// ── Discover slug from team schedule page ─────────────────────────
async function discoverSlug(no, t1, t2) {
  for (const site of [SITES[t1], SITES[t2], SITES['Rajasthan Royals']].filter(Boolean)) {
    for (const path of ['/schedule-fixtures-results', '/matches', '/schedule']) {
      try {
        const r = await fetch(`${site}${path}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
          signal: AbortSignal.timeout(6000),
        });
        if (!r.ok) continue;
        const html = await r.text();
        const re   = /\/schedule-fixtures-results\/([a-z0-9-]+)/g;
        let m;
        const t1w  = t1.toLowerCase().split(' ').filter(w => w.length > 3);
        const t2w  = t2.toLowerCase().split(' ').filter(w => w.length > 3);
        while ((m = re.exec(html)) !== null) {
          const slug = m[1];
          if (slug.includes('2026') && t1w.some(w => slug.includes(w)) && t2w.some(w => slug.includes(w))) {
            await fsSet('matchSlugs', `match_${no}`, { slug });
            return slug;
          }
        }
      } catch { /* try next */ }
    }
  }
  return null;
}

// ── Dream11 Points ────────────────────────────────────────────────
function norm(n) { return (n || '').toLowerCase().replace(/[^a-z]/g, ''); }

function d11(bat, bowl, xi) {
  let p = xi ? 4 : 0;
  const r = bat.r||0, b = bat.b||0;
  p += r + (bat['4s']||0) + (bat['6s']||0)*2;
  if (r>=100) p+=16; else if (r>=50) p+=8; else if (r>=30) p+=4;
  if (r===0 && bat.dismissal && !/not out/i.test(bat.dismissal)) p-=2;
  if (b>=10) {
    const sr=(r/b)*100;
    if(sr>170)p+=6; else if(sr>150)p+=4; else if(sr>130)p+=2;
    else if(sr<50)p-=6; else if(sr<60)p-=4; else if(sr<70)p-=2;
  }
  const w=bowl.w||0, o=parseFloat(bowl.o)||0, br=bowl.r||0;
  p += w*25 + (bowl.maiden||0)*8;
  if(w>=5)p+=8; else if(w>=4)p+=4; else if(w>=3)p+=4;
  if(o>=2){
    const eco=br/o;
    if(eco<5)p+=6; else if(eco<6)p+=4; else if(eco<7)p+=2;
    else if(eco>=10)p-=6; else if(eco>=9)p-=4; else if(eco>=8)p-=2;
  }
  return Math.round(p);
}

function calcPts(innings) {
  const pts={}, seenBat=new Set();
  (innings||[]).forEach(inn=>{
    (inn.batting||[]).forEach(b=>{
      if(!b.name)return;
      const k=norm(b.name), first=!seenBat.has(k); seenBat.add(k);
      pts[k]=(pts[k]||0)+d11(b,{},first);
    });
    (inn.bowling||[]).forEach(bw=>{
      if(!bw.name)return;
      const k=norm(bw.name);
      pts[k]=(pts[k]||0)+d11({},bw,false);
    });
  });
  return pts;
}

// ── Fetch one innings from a team site ────────────────────────────
async function fetchInnings(site, slug) {
  const r = await fetch(`${site}/schedule-fixtures-results/${slug}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  return parseInnings(html);
}

// ── Handler ───────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { no, t1, t2 } = req.query;
  if (!no) return res.status(400).json({ error: 'no (matchNo) required' });

  // 1. Serve from Firestore cache if available
  const cached = await fsGet('scorecards', `match_${no}`);
  if (cached?.playerPoints && Object.keys(cached.playerPoints).length > 0) {
    return res.json({ ...cached, fromCache: true });
  }

  // 2. Skip TBD matches
  if ((t1||'').includes('TBD') || (t2||'').includes('TBD')) {
    return res.json({ matchNo: parseInt(no), innings:[], playerPoints:{} });
  }

  // 3. Resolve slug
  let slug = SLUGS[parseInt(no)];
  if (!slug) {
    const slugCache = await fsGet('matchSlugs', `match_${no}`);
    slug = slugCache?.slug;
  }
  if (!slug && t1 && t2) {
    slug = await discoverSlug(parseInt(no), t1, t2);
  }
  if (!slug) {
    return res.status(404).json({ error: `No slug found for match ${no}. Will retry later.` });
  }

  // 4. Fetch from BOTH team sites (home + away) to get both innings
  const allInnings = [];
  const site1 = SITES[t1] || 'https://www.rajasthanroyals.com';
  const site2 = SITES[t2];

  // Primary (home team perspective)
  try {
    const innings1 = await fetchInnings(site1, slug);
    innings1.forEach(inn => { if (inn.batting.length || inn.bowling.length) allInnings.push(inn); });
  } catch (e) { console.warn('Site1 fetch failed:', e.message); }

  // Secondary (away team perspective — gets their batting)
  if (site2 && site2 !== site1) {
    try {
      const innings2 = await fetchInnings(site2, slug);
      innings2.forEach(inn => {
        // Only add if we don't already have this team's batting
        const alreadyHave = allInnings.some(x => norm(x.team) === norm(inn.team));
        if (!alreadyHave && (inn.batting.length || inn.bowling.length)) allInnings.push(inn);
      });
    } catch (e) { console.warn('Site2 fetch failed:', e.message); }
  }

  // 5. Calculate Dream11 points
  const playerPoints = calcPts(allInnings);
  const i0 = allInnings[0], i1 = allInnings[1];
  const result = {
    matchNo:      parseInt(no),
    innings:      allInnings,
    playerPoints,
    s1: i0?.total || '',
    o1: i0?.overs || '',
    s2: i1?.total || '',
    o2: i1?.overs || '',
    result: allInnings.length > 0 ? 'Match completed' : '',
    slug,
    fetchedAt: Date.now(),
  };

  // 6. Store in Firestore (even partial data — will update on next call)
  if (Object.keys(playerPoints).length > 0) {
    await fsSet('scorecards', `match_${no}`, result);
  }

  res.json(result);
}
