import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Search,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { Book, CandidateBook, BookCategory } from '../types';

interface ResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextDay: number;
  candidates: CandidateBook[];
  onBookAdded: (newBook: Book) => void;
  onSelectExistingBook: (id: string) => void;
}

const CATEGORIES: BookCategory[] = [
  'Self-Growth',
  'Investing',
  'Personal Development',
  'Business',
  'Entrepreneurship',
  'Finance',
];

export const ResearchModal: React.FC<ResearchModalProps> = ({
  isOpen,
  onClose,
  nextDay,
  candidates,
  onBookAdded,
  onSelectExistingBook,
}) => {
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateBook | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customCategory, setCustomCategory] = useState<BookCategory>('Business');

  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateBook, setDuplicateBook] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleSelectQueuedCandidate = (c: CandidateBook) => {
    setSelectedCandidate(c);
    setCustomTitle(c.title);
    setCustomAuthor(c.author);
    setCustomCategory(c.category);
    setErrorMessage(null);
    setDuplicateBook(null);
  };

  const handleStartResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setDuplicateBook(null);

    setCurrentStep('Screening title against library to prevent duplicates...');
    await new Promise((r) => setTimeout(r, 600));

    setCurrentStep('Dispatching Google Search grounding via Gemini 3.8 Flash...');

    try {
      const res = await fetch('/api/research-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim(),
          author: customAuthor.trim(),
          category: customCategory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.existingBook) {
          setDuplicateBook(data.existingBook);
        }
        throw new Error(data.error || 'Failed to research book.');
      }

      setCurrentStep('Synthesizing core thesis, ordered structure, and actionable insights...');
      await new Promise((r) => setTimeout(r, 600));

      onBookAdded(data.book);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during research.');
    } finally {
      setIsLoading(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#241E1A]/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FAF8F5] border border-[#ECE6DE] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative my-8">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#ECE6DE] bg-white flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF1EC] border border-[#EBC8BA] flex items-center justify-center text-[#C86242]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[#241E1A] font-editorial">
                  Research Engine: Day {nextDay}
                </h3>
                <span className="text-[10px] font-mono-code uppercase bg-[#FAF1EC] text-[#C86242] border border-[#EBC8BA] px-2 py-0.5 rounded-full">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-[#7F756D]">
                Multi-source grounded research across official summaries, reviews, and structure.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-[#7F756D] hover:text-[#241E1A] p-1.5 rounded-full hover:bg-[#F3EFEA] transition-colors cursor-pointer border border-[#E3DCD1]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Quick Select From Candidate Queue */}
          {candidates.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono-code uppercase font-semibold text-[#5B524A] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#C86242]" />
                  Select from Pre-Screened Titles
                </span>
                <span className="text-[11px] text-[#9C9388] font-mono-code">
                  {candidates.length} Queued
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1">
                {candidates.slice(0, 6).map((c) => (
                  <button
                    key={c.title}
                    type="button"
                    onClick={() => handleSelectQueuedCandidate(c)}
                    className={`text-left p-2.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                      customTitle === c.title
                        ? 'bg-[#FAF1EC] border-[#C86242] text-[#A04627] shadow-2xs'
                        : 'bg-white hover:bg-[#F3EFEA] border-[#ECE6DE] text-[#5B524A]'
                    }`}
                  >
                    <div className="font-bold line-clamp-1 font-editorial">{c.title}</div>
                    <div className="text-[11px] text-[#7F756D] line-clamp-1">
                      {c.author} • {c.category}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Input Form */}
          <form onSubmit={handleStartResearch} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5B524A] mb-1">
                Book Title *
              </label>
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => {
                  setCustomTitle(e.target.value);
                  setErrorMessage(null);
                  setDuplicateBook(null);
                }}
                placeholder="e.g. Never Split the Difference, Antifragile, Good to Great"
                className="w-full bg-white border border-[#ECE6DE] focus:border-[#C86242] focus:ring-1 focus:ring-[#C86242] rounded-2xl px-3.5 py-2 text-xs sm:text-sm text-[#241E1A] placeholder-[#9C9388] focus:outline-none shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5B524A] mb-1">
                  Author Name (Recommended)
                </label>
                <input
                  type="text"
                  value={customAuthor}
                  onChange={(e) => setCustomAuthor(e.target.value)}
                  placeholder="e.g. Chris Voss, Nassim Taleb"
                  className="w-full bg-white border border-[#ECE6DE] focus:border-[#C86242] focus:ring-1 focus:ring-[#C86242] rounded-2xl px-3.5 py-2 text-xs sm:text-sm text-[#241E1A] placeholder-[#9C9388] focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5B524A] mb-1">
                  Domain Category *
                </label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as BookCategory)}
                  className="w-full bg-white border border-[#ECE6DE] focus:border-[#C86242] focus:ring-1 focus:ring-[#C86242] rounded-2xl px-3.5 py-2 text-xs sm:text-sm text-[#241E1A] focus:outline-none shadow-2xs"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error or Duplicate notice */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-[#FDF0EE] border border-[#ECCBC6] text-[#9E3934] text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#C86242] flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>{errorMessage}</p>
                  {duplicateBook && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectExistingBook(duplicateBook.id);
                        onClose();
                      }}
                      className="underline font-semibold text-[#9E3934] hover:text-[#241E1A] cursor-pointer"
                    >
                      Jump to Day {duplicateBook.day} ("{duplicateBook.title}")
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Progress indicator */}
            {isLoading && (
              <div className="p-4 rounded-2xl bg-white border border-[#EBC8BA] space-y-2">
                <div className="flex items-center gap-2.5 text-xs text-[#A04627] font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-[#C86242]" />
                  <span>{currentStep || 'Executing research pipeline...'}</span>
                </div>
                <div className="w-full bg-[#F3EFEA] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#C86242] h-full w-2/3 animate-pulse" />
                </div>
              </div>
            )}

            {/* Submission */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#ECE6DE]">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-full text-xs font-medium text-[#7F756D] hover:text-[#241E1A] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !customTitle.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#C86242] hover:bg-[#B35234] disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Researching Fresh...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Trigger Day {nextDay} Deep Dive</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
