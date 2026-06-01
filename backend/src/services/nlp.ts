const STOPWORDS = new Set<string>([
  'the','a','an','and','or','to','of','in','on','at','for','with','by','is','are','was','were',
  'be','been','being','have','has','had','this','that','those','these','it','its','as','from',
  'not','into','out','about','over','under','up','down','off','if','then','so','than','but',
  'no','yes','do','does','did','will','would','could','should','can','may','might','must',
  'i','we','you','they','he','she','him','her','us','them','my','our','your','their',
  'me','also','any','some','all','more','most','few','other','only','same','such','very',
  'each','both','again','here','there','when','where','why','how','what','which','who','whom',
  'one','two','too','off','vs'
]);

const TAG_RULES: Array<[string, RegExp]> = [
  ['oil-leak',       /\boil\s*leak(s|ing|ed)?\b/i],
  ['hydraulic-leak', /\bhydraulic\s+(leak|leaking|leaked)\b/i],
  ['hydraulic',      /\bhydraulic(s)?\b/i],
  ['valve',          /\bvalve(\s+block)?\b/i],
  ['hose',           /\bhose(s)?\b/i],
  ['pipe',           /\bpipe(s)?\b/i],
  ['ram',            /\b(lift\s+)?ram(s)?\b/i],
  ['pump',           /\bpump(s)?\b/i],
  ['seal',           /\bseal(s|ed|ing)?\b/i],
  ['gasket',         /\bgasket(s)?\b/i],
  ['o-ring',         /\bo[\-\s]?ring(s)?\b/i],
  ['adapter',        /\badapter|\badaptor\b/i],
  ['fitting',        /\bfitting(s)?\b/i],
  ['boom',           /\bboom\b/i],
  ['wear-pad',       /\bwear[\-\s]?pad(s)?\b/i],
  ['cylinder',       /\bcylinder(s)?\b/i],
  ['engine',         /\bengine\b/i],
  ['transmission',   /\btransmission\b/i],
  ['axle',           /\baxle(s)?\b/i],
  ['cab',            /\bcab(in)?\b/i],
  ['paint',          /\bpaint(work)?\b/i],
  ['harness',        /\b(wiring\s+)?harness\b/i],
  ['sensor',         /\bsensor(s)?\b/i],
  ['error-code',     /\berror\s+code(s)?\b|\bfault\s+code(s)?\b/i],
  ['ecu',            /\becu\b/i],
  ['battery',        /\bbattery\b/i],
  ['alternator',     /\balternator\b/i],
  ['starter',        /\bstarter\s*(motor)?\b/i],
  ['radiator',       /\bradiator\b/i],
  ['fan',            /\bfan\b/i],
  ['filter',         /\bfilter(s)?\b/i],
  ['loose',          /\bloose\b/i],
  ['missing-part',   /\bmissing\b|\bwrong\s+part\b/i],
  ['damaged',        /\bdamaged?\b|\bdamage\b/i],
  ['vibration',      /\bvibration|vibrat(es|ing|ed)?\b/i],
  ['noise',          /\bnoise|noisy|knocking|rattle|rattling\b/i],
  ['overheating',    /\boverheat(ing|ed)?\b/i],
  ['smoke',          /\bsmoke|smoking\b/i],
  ['no-start',       /\bwon'?t\s+start|will\s+not\s+start|no\s+start\b/i],
  ['steering',       /\bsteering\b/i],
  ['brake',          /\bbrake(s)?\b/i],
  ['tyre',           /\btyre(s)?|tire(s)?\b/i],
  ['joystick',       /\bjoystick\b/i],
  ['display',        /\bdisplay|dashboard|cluster\b/i],
  ['ac',             /\bair\s*con(ditioning)?\b|\ba\/c\b/i],
  ['door',           /\bdoor(s)?\b/i],
  ['mirror',         /\bmirror(s)?\b/i],
  ['light',          /\blight(s)?|lamp(s)?|bulb(s)?\b/i],
  ['attachment',     /\battachment|forks?\b/i],
  ['warning',        /\bwarning\b/i],
  ['intermittent',   /\bintermittent(ly)?\b/i],
  ['travel-site',    /\btravell?ed\s+(to\s+)?site\b|\btravel\s+(to\s+)?site\b|\bvisit(ed)?\s+site\b/i],
  ['stock-inspection', /\bstock\s+inspection\b|\bpdi\b/i],
  ['contamination',  /\bcontamin(ated|ation)\b|\bdebris\b/i],
  ['corrosion',      /\bcorrosion|rust(ed|y|ing)?\b/i],
  ['software',       /\bsoftware|firmware|update\b/i],
  ['routing',        /\b(hose|cable|wire)\s+routing\b|\brouting\b/i],
  ['replaced',       /\breplaced?\b|\brefitted\b/i],
  ['adjusted',       /\badjust(ed|ment)?|shimm(ed|ing)?\b/i]
];

export function tokenize(text: string | null | undefined): string[] {
  if (!text) return [];
  const lc = text.toLowerCase();
  const raw = lc.match(/[a-z][a-z'\-]{2,}/g) || [];
  return raw.filter(w => !STOPWORDS.has(w) && w.length >= 3 && w.length <= 24);
}

export function bigramsOf(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    out.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return out;
}

export function tagsOf(text: string | null | undefined): string[] {
  if (!text) return [];
  const hits = new Set<string>();
  for (const [tag, re] of TAG_RULES) {
    if (re.test(text)) hits.add(tag);
  }
  return Array.from(hits);
}

export function enrichDescription(text: string | null | undefined) {
  const tokens = tokenize(text);
  return {
    descriptionTokens: tokens,
    descriptionBigrams: bigramsOf(tokens),
    descriptionTags: tagsOf(text)
  };
}

export const TAG_VOCABULARY = TAG_RULES.map(([t]) => t);
