import { Book, BookCategory, BookStructurePart } from '../types';

const VALID_CATEGORIES: BookCategory[] = [
  'Self-Growth',
  'Investing',
  'Personal Development',
  'Business',
  'Entrepreneurship',
  'Finance',
  'Management',
];

const CURATED_FALLBACK_POOL: Array<{
  title: string;
  author: string;
  category: BookCategory;
}> = [
  { title: 'Never Split the Difference', author: 'Chris Voss', category: 'Personal Development' },
  { title: 'Antifragile', author: 'Nassim Nicholas Taleb', category: 'Finance' },
  { title: 'Good to Great', author: 'Jim Collins', category: 'Business' },
  { title: 'The Most Important Thing', author: 'Howard Marks', category: 'Investing' },
  { title: 'Shoe Dog', author: 'Phil Knight', category: 'Entrepreneurship' },
  { title: 'Deep Work', author: 'Cal Newport', category: 'Self-Growth' },
  { title: 'The Almanack of Naval Ravikant', author: 'Eric Jorgenson', category: 'Self-Growth' },
  { title: "The Innovator's Dilemma", author: 'Clayton M. Christensen', category: 'Business' },
  { title: 'Common Stocks and Uncommon Profits', author: 'Philip A. Fisher', category: 'Investing' },
  { title: 'Four Thousand Weeks', author: 'Oliver Burkeman', category: 'Self-Growth' },
  { title: 'Essentialism', author: 'Greg McKeown', category: 'Self-Growth' },
  { title: "Man's Search for Meaning", author: 'Viktor E. Frankl', category: 'Self-Growth' },
  { title: 'Drive', author: 'Daniel H. Pink', category: 'Business' },
  { title: 'Thinking in Bets', author: 'Annie Duke', category: 'Investing' },
  { title: 'Rework', author: 'Jason Fried & David Heinemeier Hansson', category: 'Entrepreneurship' },
  { title: 'Zero to One', author: 'Peter Thiel', category: 'Entrepreneurship' },
  { title: 'High Output Management', author: 'Andrew S. Grove', category: 'Management' },
  { title: 'The Lean Startup', author: 'Eric Ries', category: 'Entrepreneurship' },
  { title: 'Influence', author: 'Robert B. Cialdini', category: 'Personal Development' },
  { title: 'The Millionaire Next Door', author: 'Thomas J. Stanley', category: 'Finance' },
  { title: 'Meditations', author: 'Marcus Aurelius', category: 'Self-Growth' },
  { title: 'Principles', author: 'Ray Dalio', category: 'Management' },
  { title: 'The E-Myth Revisited', author: 'Michael E. Gerber', category: 'Business' },
  { title: 'The Little Book of Common Sense Investing', author: 'John C. Bogle', category: 'Investing' },
  { title: 'Mindset', author: 'Carol S. Dweck', category: 'Self-Growth' },
  { title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', category: 'Personal Development' },
  { title: 'Start with Why', author: 'Simon Sinek', category: 'Business' },
  { title: 'Grit', author: 'Angela Duckworth', category: 'Self-Growth' },
  { title: 'Measure What Matters', author: 'John Doerr', category: 'Management' },
  { title: 'The Subtle Art of Not Giving a F*ck', author: 'Mark Manson', category: 'Personal Development' },
];

const SUBJECT_CATEGORY_MAP: Array<{ subject: string; category: BookCategory }> = [
  { subject: 'personal_development', category: 'Personal Development' },
  { subject: 'self_help', category: 'Self-Growth' },
  { subject: 'investing', category: 'Investing' },
  { subject: 'business', category: 'Business' },
  { subject: 'entrepreneurship', category: 'Entrepreneurship' },
  { subject: 'finance', category: 'Finance' },
  { subject: 'management', category: 'Management' },
  { subject: 'leadership', category: 'Management' },
  { subject: 'economics', category: 'Finance' },
  { subject: 'psychology', category: 'Self-Growth' },
];

function normTitle(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isTitleInLibrary(title: string, library: Book[]): boolean {
  const target = normTitle(title);
  if (!target) return false;
  return library.some((b) => {
    const existing = normTitle(b.title);
    if (!existing) return false;
    return existing === target || (target.length > 5 && existing.length > 5 && (existing.includes(target) || target.includes(existing)));
  });
}

export function makeUniqueBookId(title: string, existingIds: Set<string>): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 100) || 'book';

  if (!existingIds.has(base)) {
    existingIds.add(base);
    return base;
  }
  let suffix = 2;
  while (existingIds.has(`${base}-${suffix}`)) {
    suffix++;
  }
  const unique = `${base}-${suffix}`;
  existingIds.add(unique);
  return unique;
}

function inferCategory(subjects: string[], fallback?: string): BookCategory {
  if (fallback && (VALID_CATEGORIES as string[]).includes(fallback)) {
    return fallback as BookCategory;
  }
  const joined = subjects.join(' ').toLowerCase();
  if (/invest|stock|equity|portfolio|buffett|valuation|market/.test(joined)) return 'Investing';
  if (/financ|money|wealth|bank|econom|tax|budget/.test(joined)) return 'Finance';
  if (/entrepreneur|startup|founder|venture/.test(joined)) return 'Entrepreneurship';
  if (/manage|leader|executive|team|organization/.test(joined)) return 'Management';
  if (/business|company|strategy|commerce|marketing/.test(joined)) return 'Business';
  if (/habit|communicat|negotiat|persuasion|career|productiv/.test(joined)) return 'Personal Development';
  return 'Self-Growth';
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 4500): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function cleanWikiOrLibraryText(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') {
    return raw
      .replace(/\[.*?\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    return cleanWikiOrLibraryText((raw as { value?: unknown }).value);
  }
  return '';
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

interface FreeResearchData {
  title: string;
  author: string;
  year: number;
  subjects: string[];
  description: string;
  wikiExtract: string;
  firstSentence: string;
  sourcesChecked: string[];
}

export async function lookupBookOnFreeApis(
  rawTitle: string,
  rawAuthor?: string
): Promise<FreeResearchData> {
  const queryTitle = rawTitle.trim();
  const queryAuthor = (rawAuthor || '').trim();

  const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(queryTitle)}${
    queryAuthor ? `&author=${encodeURIComponent(queryAuthor)}` : ''
  }&limit=3`;

  const wikiQuery = queryAuthor ? `${queryTitle} ${queryAuthor} book` : `${queryTitle} book`;
  const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    wikiQuery
  )}&srlimit=3&format=json&origin=*`;

  const [olData, wikiSearchData] = await Promise.all([
    fetchJsonWithTimeout<any>(olUrl, 4500),
    fetchJsonWithTimeout<any>(wikiSearchUrl, 4500),
  ]);

  const doc = Array.isArray(olData?.docs) && olData.docs.length > 0 ? olData.docs[0] : null;
  const resolvedTitle = doc?.title || queryTitle;
  const resolvedAuthor =
    (Array.isArray(doc?.author_name) && doc.author_name[0]) || queryAuthor || 'Book Author';
  const resolvedYear =
    (typeof doc?.first_publish_year === 'number' && doc.first_publish_year >= 1400 && doc.first_publish_year <= 2100
      ? doc.first_publish_year
      : new Date().getFullYear());
  const subjects: string[] = Array.isArray(doc?.subject) ? doc.subject.slice(0, 8) : [];
  const firstSentence = Array.isArray(doc?.first_sentence)
    ? cleanWikiOrLibraryText(doc.first_sentence[0])
    : cleanWikiOrLibraryText(doc?.first_sentence);

  let workDescription = '';
  if (doc?.key && typeof doc.key === 'string' && doc.key.startsWith('/works/')) {
    const workData = await fetchJsonWithTimeout<any>(`https://openlibrary.org${doc.key}.json`, 3500);
    workDescription = cleanWikiOrLibraryText(workData?.description);
  }

  let wikiExtract = '';
  let wikiPageTitle = '';
  const wikiHits = Array.isArray(wikiSearchData?.query?.search)
    ? wikiSearchData.query.search
    : [];

  const titleLower = queryTitle.toLowerCase();
  const bestWikiHit =
    wikiHits.find((h: any) => String(h.title || '').toLowerCase().includes(titleLower)) ||
    wikiHits[0];

  if (bestWikiHit?.title) {
    wikiPageTitle = bestWikiHit.title;
    const fullExtractData = await fetchJsonWithTimeout<any>(
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(
        String(bestWikiHit.title)
      )}&format=json&origin=*`,
      4500
    );
    const pages = fullExtractData?.query?.pages;
    const firstPage = pages ? (Object.values(pages)[0] as any) : null;
    if (firstPage?.extract && typeof firstPage.extract === 'string') {
      wikiExtract = firstPage.extract.replace(/\[.*?\]/g, '').trim();
    } else {
      const wikiSummary = await fetchJsonWithTimeout<any>(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          String(bestWikiHit.title).replace(/\s+/g, '_')
        )}`,
        3500
      );
      wikiExtract = cleanWikiOrLibraryText(wikiSummary?.extract);
    }
  }

  const sourcesChecked: string[] = [];
  if (doc) sourcesChecked.push(`Open Library Catalog (${resolvedTitle})`);
  if (wikiPageTitle) sourcesChecked.push(`Wikipedia (${wikiPageTitle})`);
  if (sourcesChecked.length === 0) {
    sourcesChecked.push('Open Library Search API', 'Wikipedia Knowledge Index');
  }

  return {
    title: resolvedTitle,
    author: resolvedAuthor,
    year: resolvedYear,
    subjects,
    description: workDescription,
    wikiExtract,
    firstSentence,
    sourcesChecked,
  };
}

function parseWikipediaSections(extract: string): Array<{ title: string; body: string }> {
  if (!extract) return [];
  const skipHeadings = /^(see also|references|external links|further reading|notes|bibliography|citations|sources)$/i;
  const lines = extract.split('\n');
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = 'Core Overview & Context';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^={2,}\s*(.+?)\s*={2,}$/);
    if (headingMatch) {
      const body = currentLines.join(' ').replace(/\s+/g, ' ').trim();
      if (body.length > 40 && !skipHeadings.test(currentTitle)) {
        sections.push({ title: currentTitle, body });
      }
      currentTitle = headingMatch[1].trim();
      currentLines = [];
    } else if (line.trim()) {
      currentLines.push(line.trim());
    }
  }
  const tailBody = currentLines.join(' ').replace(/\s+/g, ' ').trim();
  if (tailBody.length > 40 && !skipHeadings.test(currentTitle)) {
    sections.push({ title: currentTitle, body: tailBody });
  }
  return sections;
}

export async function buildBookViaFreeApis(
  rawTitle: string,
  rawAuthor: string | undefined,
  rawCategory: string | undefined,
  existingIds: Set<string>,
  dayNumber: number
): Promise<Book> {
  const research = await lookupBookOnFreeApis(rawTitle, rawAuthor);
  const category = inferCategory(research.subjects, rawCategory);

  const wikiSections = parseWikipediaSections(research.wikiExtract);
  const combinedText = [research.wikiExtract.replace(/^={2,}.+?={2,}$/gm, ''), research.description, research.firstSentence]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = splitSentences(combinedText);

  const thesis =
    sentences[0] ||
    `${research.title} by ${research.author} presents foundational concepts, frameworks, and practical habits in ${category.toLowerCase()} to guide deeper, steadier everyday judgment.`;

  const themeLabels = research.subjects;
  const structure: BookStructurePart[] = [];

  if (wikiSections.length >= 2) {
    wikiSections.forEach((sec, idx) => {
      structure.push({
        partNumber: idx + 1,
        partTitle: sec.title,
        keyIdea: sec.body,
        realLifeExample: `Consider how "${sec.title}" from "${research.title}" shows up in your current work or habits, and test one small adjustment this week.`,
        whyItMatters: `Deepens your grasp of ${sec.title.toLowerCase()} so you can apply ${research.author}'s framework deliberately.`,
      });
    });
    if (research.description && !wikiSections.some((s) => s.body.includes(research.description.slice(0, 60)))) {
      structure.push({
        partNumber: structure.length + 1,
        partTitle: 'Publisher Synopsis & Key Themes',
        keyIdea: research.description,
        realLifeExample: `Use the core themes (${themeLabels.slice(0, 3).join(', ') || category.toLowerCase()}) as a personal checklist when tackling a related decision.`,
        whyItMatters: 'Connects the book’s broader arc back to everyday choices.',
      });
    }
  } else if (sentences.length >= 2) {
    const sentencesPerPart = sentences.length > 12 ? 3 : 2;
    const partCount = Math.max(2, Math.ceil(sentences.length / sentencesPerPart));
    for (let i = 0; i < partCount; i++) {
      const start = i * sentencesPerPart;
      const chunk = sentences.slice(start, start + sentencesPerPart).join(' ') || thesis;
      const themeHint = themeLabels[i] ? ` — ${themeLabels[i]}` : '';
      structure.push({
        partNumber: i + 1,
        partTitle:
          i === 0
            ? `Core Perspective${themeHint}`
            : i === 1
            ? `Key Principles${themeHint}`
            : i === 2
            ? `Practical Application${themeHint}`
            : `Deeper Insights & Frameworks${themeHint}`,
        keyIdea: chunk,
        realLifeExample: `Pause when facing a choice related to ${
          themeLabels[i] || category.toLowerCase()
        } and test ${research.author}'s perspective from "${research.title}" on a concrete decision this week.`,
        whyItMatters: `Turns ideas from "${research.title}" into steady everyday habits instead of one-time motivation.`,
      });
    }
  } else {
    structure.push(
      {
        partNumber: 1,
        partTitle: `Core Idea & Mindset of ${research.title}`,
        keyIdea: `${research.title} by ${research.author} focuses on clear fundamentals in ${category.toLowerCase()}. Instead of chasing quick fixes, it encourages slowing down, questioning assumptions, and building habits you can stick with consistently.`,
        realLifeExample: `Choose one small decision this week in ${category.toLowerCase()} and write down the simple rule you will follow before acting.`,
        whyItMatters: 'Clear personal rules prevent emotional mistakes when things get busy.',
      },
      {
        partNumber: 2,
        partTitle: 'Turning Frameworks into Steady Habits',
        keyIdea: `Lasting results come from repeating small, practical steps rather than waiting for huge bursts of willpower. Testing each principle in real situations makes it obvious what works best for your own goals.`,
        realLifeExample: 'Spend 10 quiet minutes every Sunday reviewing one idea you tried and one improvement for the week ahead.',
        whyItMatters: 'Consistent small steps compound quietly over months and years.',
      }
    );
  }

  const keyInsights: string[] = [];
  for (const s of sentences) {
    if (s.length >= 30 && s.length <= 420 && !keyInsights.includes(s)) {
      keyInsights.push(s);
    }
  }
  if (keyInsights.length < 3) {
    keyInsights.push(
      `${research.title} emphasizes long-term clarity and deliberate action over short-term impulse.`,
      `Focus on repeatable habits in ${category.toLowerCase()} rather than relying on temporary motivation.`,
      `Ask yourself what small mistake you can avoid before trying any bold new move.`
    );
  }

  const dailyImplementation: string[] = [
    `Write down the main takeaway from "${research.title}" on a note you see at the start of the day.`,
    `Pick one small habit connected to ${category.toLowerCase()} and practice it for 10 minutes today.`,
    `Before making a major decision this week, pause and apply a calm checklist inspired by ${research.author}.`,
    `Review what worked and what felt unclear after testing an idea from "${research.title}" for 7 days.`,
  ];

  const readingTimeMin = Math.max(6, Math.round(structure.length * 3.5));

  return {
    id: makeUniqueBookId(research.title, existingIds),
    day: Math.min(5000, Math.max(1, dayNumber)),
    date: new Date().toISOString().split('T')[0],
    title: research.title,
    subtitle: research.subjects[0] ? `${research.subjects[0]}` : '',
    author: research.author,
    category,
    year: research.year,
    readingTimeMin,
    qualificationRationale: `Added via Open Library & Wikipedia in ${category}${
      research.year ? ` (${research.year})` : ''
    }.`,
    thesis,
    conflictNote: `Researched using free public book catalogs (${research.sourcesChecked.join(', ')}).`,
    sourcesChecked: research.sourcesChecked,
    structure,
    keyInsights,
    dailyImplementation,
    strengthWeakness: `Grounded in public catalog and overview data for "${research.title}" by ${research.author}. Best used by turning each key section into concrete weekly routines.`,
    researchedAt: new Date().toISOString(),
  };
}

export async function addBooksOnClientViaFreeApis(
  count: number,
  specificTitle: string | undefined,
  existingLibrary: Book[],
  specificAuthor?: string
): Promise<{ addedBooks: Book[]; error?: string }> {
  const existingIds = new Set(existingLibrary.map((b) => b.id));
  const runningLibrary = [...existingLibrary];

  if (specificTitle && specificTitle.trim()) {
    const trimmed = specificTitle.trim();
    if (isTitleInLibrary(trimmed, runningLibrary)) {
      return { addedBooks: [], error: `"${trimmed}" is already in your library.` };
    }
    const book = await buildBookViaFreeApis(
      trimmed,
      specificAuthor,
      undefined,
      existingIds,
      runningLibrary.length + 1
    );
    return { addedBooks: [book] };
  }

  const targetCount = Math.max(1, Math.min(5, Math.floor(count) || 1));
  const candidatesToAdd: Array<{ title: string; author?: string; category?: BookCategory }> = [];

  for (const item of CURATED_FALLBACK_POOL) {
    if (candidatesToAdd.length >= targetCount) break;
    if (
      !isTitleInLibrary(item.title, runningLibrary) &&
      !candidatesToAdd.some((c) => normTitle(c.title) === normTitle(item.title))
    ) {
      candidatesToAdd.push(item);
    }
  }

  // Endless free Open Library Subjects API discovery once curated pool is used up
  if (candidatesToAdd.length < targetCount) {
    const startOffset = Math.max(0, runningLibrary.length - 20);
    for (let sIdx = 0; sIdx < SUBJECT_CATEGORY_MAP.length && candidatesToAdd.length < targetCount; sIdx++) {
      const entry = SUBJECT_CATEGORY_MAP[(sIdx + runningLibrary.length) % SUBJECT_CATEGORY_MAP.length];
      const offset = (startOffset + sIdx * 7) % 120;
      const subjectData = await fetchJsonWithTimeout<any>(
        `https://openlibrary.org/subjects/${entry.subject}.json?limit=35&offset=${offset}`,
        4500
      );
      const works = Array.isArray(subjectData?.works) ? subjectData.works : [];
      for (const work of works) {
        if (candidatesToAdd.length >= targetCount) break;
        const wTitle = typeof work?.title === 'string' ? work.title.trim() : '';
        if (!wTitle || wTitle.length < 3 || wTitle.length > 140) continue;
        if (
          !isTitleInLibrary(wTitle, runningLibrary) &&
          !candidatesToAdd.some((c) => normTitle(c.title) === normTitle(wTitle))
        ) {
          const wAuthor =
            (Array.isArray(work.authors) && work.authors[0]?.name) || 'Book Author';
          candidatesToAdd.push({
            title: wTitle,
            author: wAuthor,
            category: entry.category,
          });
        }
      }
    }
  }

  // Process in small parallel batches of 4 for speed without hitting rate limits
  const addedBooks: Book[] = [];
  for (let i = 0; i < candidatesToAdd.length; i += 4) {
    const chunk = candidatesToAdd.slice(i, i + 4);
    const built = await Promise.all(
      chunk.map((item, idx) =>
        buildBookViaFreeApis(
          item.title,
          item.author,
          item.category,
          existingIds,
          runningLibrary.length + addedBooks.length + idx + 1
        )
      )
    );
    for (const book of built) {
      addedBooks.push(book);
      runningLibrary.push(book);
    }
  }

  return { addedBooks };
}

export async function answerQuestionWithFreeApi(
  book: Book,
  question: string
): Promise<string> {
  const cleanQuestion = question.trim();
  const qLower = cleanQuestion.toLowerCase();

  // Always check free Wikipedia & Open Library APIs in parallel for extra external context if the user asks beyond the card text
  const wikiSearchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    `${book.title} ${book.author}`
  )}&srlimit=2&format=json&origin=*`;
  const olUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(
    book.title
  )}&author=${encodeURIComponent(book.author)}&limit=1`;

  const [wikiSearch, olData] = await Promise.all([
    fetchJsonWithTimeout<any>(wikiSearchUrl, 3000),
    fetchJsonWithTimeout<any>(olUrl, 3000),
  ]);

  let wikiContext = '';
  const wikiHit = Array.isArray(wikiSearch?.query?.search) ? wikiSearch.query.search[0] : null;
  if (wikiHit?.title) {
    const summaryData = await fetchJsonWithTimeout<any>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        String(wikiHit.title).replace(/\s+/g, '_')
      )}`,
      2800
    );
    wikiContext = cleanWikiOrLibraryText(summaryData?.extract);
  }

  let olDescription = '';
  const olDoc = Array.isArray(olData?.docs) ? olData.docs[0] : null;
  if (olDoc?.key && String(olDoc.key).startsWith('/works/')) {
    const workData = await fetchJsonWithTimeout<any>(`https://openlibrary.org${olDoc.key}.json`, 2800);
    olDescription = cleanWikiOrLibraryText(workData?.description);
  }

  const stopWords = new Set([
    'what', 'when', 'where', 'which', 'about', 'does', 'this', 'book', 'from', 'with',
    'that', 'your', 'mean', 'explain', 'give', 'tell', 'more', 'some', 'have', 'into',
    'they', 'their', 'there', 'would', 'could', 'should', 'like',
  ]);
  const keywords = qLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const parts = Array.isArray(book.structure) ? book.structure : [];
  const scoredParts = parts
    .map((part) => {
      const hay = `${part.partTitle} ${part.keyIdea} ${part.realLifeExample || ''} ${part.whyItMatters}`.toLowerCase();
      const score = keywords.reduce((acc, kw) => (hay.includes(kw) ? acc + 2 : acc), 0);
      return { part, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const dailyList =
    book.dailyImplementation && book.dailyImplementation.length > 0
      ? book.dailyImplementation
      : book.keyInsights.map((i) => `Practice this today: ${i}`);

  const scoredInsights = (book.keyInsights || [])
    .map((insight) => {
      const hay = insight.toLowerCase();
      const score = keywords.reduce((acc, kw) => (hay.includes(kw) ? acc + 1 : acc), 0);
      return { insight, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const isAskingDaily = /apply|daily|practice|habit|action|use|start|today|work|home|life|step|plan|do i/.test(qLower);
  const isAskingExample = /example|story|scenario|real|illustrat/.test(qLower);
  const isAskingWeakness = /weak|flaw|criticism|limit|wrong|bad|miss|disagree|short|problem|mistake|conflict/.test(qLower);
  const isAskingAuthor = /author|who wrote|writer|background|year|publish/.test(qLower);
  const isAskingMain = /main|thesis|summary|gist|point|about|overview|beginner|simple|lesson/.test(qLower);

  const sections: string[] = [];

  if (isAskingAuthor) {
    sections.push(
      `"${book.title}" was written by ${book.author}${book.year ? ` (${book.year})` : ''} in the ${book.category} category.`
    );
    if (book.qualificationRationale) {
      sections.push(book.qualificationRationale);
    }
    if (wikiContext) {
      sections.push(`Overview from Wikipedia:\n${wikiContext}`);
    }
  } else if (scoredParts.length > 0) {
    sections.push(`Here is what "${book.title}" by ${book.author} teaches about your question:`);
    for (const { part } of scoredParts.slice(0, 2)) {
      let block = `• ${part.partTitle}: ${part.keyIdea}`;
      if (part.realLifeExample) block += `\n  Example: ${part.realLifeExample}`;
      if (part.whyItMatters) block += `\n  Why it matters: ${part.whyItMatters}`;
      sections.push(block);
    }
    if (scoredInsights.length > 0) {
      sections.push(`Related takeaway:\n• ${scoredInsights[0].insight}`);
    }
  } else if (isAskingDaily) {
    sections.push(`How to apply "${book.title}" in daily life:`);
    dailyList.slice(0, 5).forEach((step) => {
      sections.push(`• ${step}`);
    });
  } else if (isAskingWeakness) {
    sections.push(`Strengths & limits of "${book.title}":\n${book.strengthWeakness || 'Practical framework that works best when applied consistently over time.'}`);
    if (book.conflictNote) {
      sections.push(`Context note:\n${book.conflictNote}`);
    }
  } else if (isAskingExample) {
    const withExamples = parts.filter((p) => p.realLifeExample);
    if (withExamples.length > 0) {
      sections.push(`Real-life examples from "${book.title}":`);
      withExamples.slice(0, 3).forEach((p) => {
        sections.push(`• ${p.partTitle}: ${p.realLifeExample}`);
      });
    } else {
      sections.push(`Practical ways "${book.title}" shows up in everyday life:`);
      dailyList.slice(0, 3).forEach((step) => sections.push(`• ${step}`));
    }
  } else {
    sections.push(`Main idea of "${book.title}" (${book.author}):\n${book.thesis}`);
    if (book.keyInsights.length > 0) {
      sections.push(
        `Key takeaways:\n${book.keyInsights
          .slice(0, isAskingMain ? 4 : 3)
          .map((i) => `• ${i}`)
          .join('\n')}`
      );
    }
    if (wikiContext && (!isAskingMain || wikiContext.length > 40)) {
      const firstTwoSentences = splitSentences(wikiContext).slice(0, 2).join(' ');
      if (firstTwoSentences) {
        sections.push(`Additional context:\n${firstTwoSentences}`);
      }
    } else if (olDescription) {
      const olSnippet = splitSentences(olDescription).slice(0, 2).join(' ');
      if (olSnippet) {
        sections.push(`Book overview:\n${olSnippet}`);
      }
    }
  }

  if (!isAskingDaily && dailyList.length > 0) {
    sections.push(`One step to try today:\n• ${dailyList[0]}`);
  }

  return sections.join('\n\n').trim();
}
