export type BookCategory =
  | 'Self-Growth'
  | 'Investing'
  | 'Personal Development'
  | 'Business'
  | 'Entrepreneurship'
  | 'Finance';

export interface BookStructurePart {
  partNumber: number;
  partTitle: string;
  keyIdea: string;
  whyItMatters: string;
  realLifeExample?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Book {
  id: string;
  day: number;
  date: string;
  title: string;
  subtitle?: string;
  author: string;
  category: BookCategory;
  year: number;
  readingTimeMin: number;
  qualificationRationale: string;
  thesis: string;
  conflictNote: string;
  sourcesChecked: string[];
  structure: BookStructurePart[];
  keyInsights: string[];
  dailyImplementation?: string[];
  strengthWeakness: string;
  searchQueries?: string[];
  groundingChunks?: GroundingSource[];
  researchedAt?: string;
}

export interface CandidateBook {
  id?: string;
  title: string;
  subtitle?: string;
  author: string;
  category: BookCategory;
  year?: number;
  qualificationRationale: string;
}

export interface LibraryResponse {
  library: Book[];
  totalBooks: number;
  ceilingLimit: number;
  categories: BookCategory[];
  isCeilingReached: boolean;
}
