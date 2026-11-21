import React, { useState, useMemo, useEffect } from 'react';
import { Book } from '../types';
import {
  formatBookMarkdown,
  formatBookShareSnippet,
  buildBookShareUrl,
  copyTextToClipboard,
  ShareSnippetFormat,
  getBookCoverDesign,
} from '../utils/formatters';
import {
  ReaderPreferences,
  ReaderTheme,
  ReaderFontSize,
  getReaderThemeClasses,
  getReaderBodyTextClass,
} from '../utils/readerPreferences';
import { BookCover } from './BookCover';
import { BookArtworkBackdrop } from './BookArtworkBackdrop';
import { answerQuestionWithFreeApi } from '../utils/freeBookApi';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  ListChecks,
  Sun,
  Leaf,
  Moon,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  MessageCircle,
  Scale,
  Lightbulb,
  Share2,
  X,
  Link2,
  ExternalLink,
  Pencil,
} from 'lucide-react';

interface BookDetailProps {
  book: Book;
  isRead: boolean;
  onToggleRead: () => void;
  onBackToLibrary?: () => void;
  readerPrefs: ReaderPreferences;
  onUpdateReaderPrefs: (next: ReaderPreferences) => void;
}

export const BookDetail: React.FC<BookDetailProps> = ({
  book,
  isRead,
  onToggleRead,
  onBackToLibrary,
  readerPrefs,
  onUpdateReaderPrefs,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Share snippet & direct link state
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<ShareSnippetFormat>('social');
  const [isEditingSnippet, setIsEditingSnippet] = useState(false);
  const [shareSnippetText, setShareSnippetText] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [directLinkCopied, setDirectLinkCopied] = useState(false);

  // Clean expandable sections
  const [expandedParts, setExpandedParts] = useState<Record<number, boolean>>({ 1: true });
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showTakeaways, setShowTakeaways] = useState(true);
  const [showDailyLife, setShowDailyLife] = useState(true);
  const [showLimits, setShowLimits] = useState(false);
  const [showAsk, setShowAsk] = useState(true);

  // Ask Q&A state (supports follow-up questions cleanly below every book)
  const [labQuestion, setLabQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<Array<{ id: number; question: string; answer: string }>>([]);
  const [isAskingLab, setIsAskingLab] = useState(false);

  // Daily implementation checklist state
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setExpandedParts({ 1: true });
    setQaHistory([]);
    setLabQuestion('');
    setCheckedItems({});
    setShowMoreActions(false);
    setIsShareOpen(false);
    setIsEditingSnippet(false);
    setShareCopied(false);
    setLinkCopied(false);
    setDirectLinkCopied(false);
  }, [book.id]);

  useEffect(() => {
    if (!isShareOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsShareOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShareOpen]);

  const theme = useMemo(() => getReaderThemeClasses(readerPrefs), [readerPrefs]);
  const bodyTextClass = useMemo(() => getReaderBodyTextClass(readerPrefs), [readerPrefs]);
  const design = useMemo(
    () => getBookCoverDesign(book.title, book.category),
    [book.title, book.category]
  );

  const dailyImplementationList = useMemo(() => {
    if (book.dailyImplementation && book.dailyImplementation.length > 0) {
      return book.dailyImplementation;
    }
    return book.keyInsights.map((insight) => `Apply this today: ${insight}`);
  }, [book]);

  const toggleReadableMode = () => {
    onUpdateReaderPrefs({
      ...readerPrefs,
      isReadableMode: !readerPrefs.isReadableMode,
    });
  };

  const setTheme = (nextTheme: ReaderTheme) => {
    onUpdateReaderPrefs({
      ...readerPrefs,
      isReadableMode: true,
      theme: nextTheme,
    });
  };

  const setFontSize = (nextSize: ReaderFontSize) => {
    onUpdateReaderPrefs({
      ...readerPrefs,
      isReadableMode: true,
      fontSize: nextSize,
    });
  };

  const handleCopyMarkdown = async () => {
    const md = formatBookMarkdown(book);
    const ok = await copyTextToClipboard(md);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareUrl = useMemo(() => buildBookShareUrl(book), [book]);

  const handleCopyDirectLink = async () => {
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setDirectLinkCopied(true);
      setTimeout(() => setDirectLinkCopied(false), 2200);
    }
  };

  const handleOpenShare = () => {
    const initialFormat: ShareSnippetFormat = 'social';
    setShareFormat(initialFormat);
    setShareSnippetText(formatBookShareSnippet(book, initialFormat, shareUrl));
    setShareCopied(false);
    setLinkCopied(false);
    setIsEditingSnippet(false);
    setShowMoreActions(false);
    setIsShareOpen(true);
  };

  const handleSwitchShareFormat = (nextFormat: ShareSnippetFormat) => {
    setShareFormat(nextFormat);
    setShareSnippetText(formatBookShareSnippet(book, nextFormat, shareUrl));
    setShareCopied(false);
  };

  const handleCopyShareSnippet = async () => {
    const ok = await copyTextToClipboard(shareSnippetText);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2200);
    }
  };

  const handleCopyShareLink = async () => {
    const ok = await copyTextToClipboard(shareUrl);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2200);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${book.title} — Book Summary`,
          text: shareSnippetText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await handleCopyShareSnippet();
  };

  const renderSnippetWithClickableLinks = (text: string) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((segment, idx) => {
      if (/^https?:\/\/[^\s]+$/.test(segment)) {
        return (
          <a
            key={idx}
            href={segment}
            target="_blank"
            rel="noopener noreferrer"
            className={`${theme.accentText} underline underline-offset-2 font-medium break-all hover:opacity-80`}
          >
            {segment}
          </a>
        );
      }
      return <React.Fragment key={idx}>{segment}</React.Fragment>;
    });
  };

  const canUseWebShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleToggleAudio = async () => {
    if (isPlayingAudio) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    try {
      setIsPlayingAudio(true);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const textToSpeak = `${book.title} by ${book.author}. Main idea: ${book.thesis}. Key lessons: ${book.keyInsights.slice(0, 4).join('. ')}. How to use it daily: ${dailyImplementationList.slice(0, 3).join('. ')}`;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      } else {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: book.title,
            text: `Main idea: ${book.thesis}. Key lessons: ${book.keyInsights.slice(0, 3).join('. ')}`,
          }),
        });
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          audio.onended = () => setIsPlayingAudio(false);
          audio.play();
        } else {
          setIsPlayingAudio(false);
        }
      }
    } catch (err) {
      console.error('Audio error:', err);
      setIsPlayingAudio(false);
    }
  };

  const submitQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isAskingLab) return;

    setShowAsk(true);
    setLabQuestion('');
    setIsAskingLab(true);

    let finalAnswer = '';
    try {
      const res = await fetch('/api/ask-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
          bookContext: {
            title: book.title,
            author: book.author,
            category: book.category,
            year: book.year,
            qualificationRationale: book.qualificationRationale,
            thesis: book.thesis,
            conflictNote: book.conflictNote,
            structure: book.structure,
            keyInsights: book.keyInsights,
            dailyImplementation: dailyImplementationList,
            strengthWeakness: book.strengthWeakness,
          },
          question: trimmed,
        }),
      });
      if (!res.ok) {
        throw new Error('API unavailable');
      }
      const data = await res.json();
      if (!data.answer || typeof data.answer !== 'string') {
        throw new Error('Empty response');
      }
      finalAnswer = data.answer;
    } catch {
      finalAnswer = await answerQuestionWithFreeApi(book, trimmed);
    } finally {
      setIsAskingLab(false);
    }

    if (finalAnswer) {
      setQaHistory((prev) => [
        ...prev,
        { id: Date.now(), question: trimmed, answer: finalAnswer },
      ]);
    }
  };

  const handleAskLab = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitQuestion(labQuestion);
  };

  const togglePart = (num: number) => {
    setExpandedParts((prev) => ({
      ...prev,
      [num]: !prev[num],
    }));
  };

  const allPartsExpanded = book.structure.every((p) => !!expandedParts[p.partNumber]);

  const toggleAllParts = () => {
    if (allPartsExpanded) {
      setExpandedParts({});
    } else {
      const next: Record<number, boolean> = {};
      book.structure.forEach((p) => {
        next[p.partNumber] = true;
      });
      setExpandedParts(next);
    }
  };

  const toggleCheck = (idx: number) => {
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const practicedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <article
      className={`mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 space-y-5 animate-in fade-in duration-200 transition-all ${theme.textPrimary}`}
    >
      {/* Top Apple Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 relative">
        {onBackToLibrary && (
          <button
            onClick={onBackToLibrary}
            className={`min-h-[40px] flex items-center gap-1.5 px-3.5 rounded-xl border text-[13px] font-medium transition-colors cursor-pointer ${theme.surfaceBg} ${theme.hoverBg} ${theme.border} ${theme.textPrimary}`}
          >
            <ArrowLeft className={`w-4 h-4 ${theme.accentText}`} />
            <span>Library</span>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Readable Mode Toggle */}
          <button
            onClick={toggleReadableMode}
            className={`min-h-[40px] flex items-center gap-1.5 px-3.5 rounded-xl text-[13px] font-medium border transition-all cursor-pointer ${
              readerPrefs.isReadableMode
                ? `${theme.accentBg} ${theme.accentText} ${theme.accentBorder}`
                : `${theme.surfaceBg} ${theme.hoverBg} ${theme.textSecondary} ${theme.border}`
            }`}
            title="Eye-friendly reading mode"
          >
            {readerPrefs.isReadableMode ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span>Readable Mode</span>
          </button>

          {/* Mark as Read */}
          <button
            onClick={onToggleRead}
            className={`min-h-[40px] flex items-center gap-1.5 px-3.5 rounded-xl text-[13px] font-medium border transition-all cursor-pointer ${
              isRead
                ? `${theme.greenBg} ${theme.greenText} ${theme.greenBorder}`
                : `${theme.surfaceBg} ${theme.hoverBg} ${theme.textSecondary} ${theme.border}`
            }`}
          >
            <Check
              className={`w-4 h-4 ${
                isRead ? `${theme.greenText} stroke-[2.6]` : theme.textMuted
              }`}
            />
            <span>{isRead ? 'Completed' : 'Mark Read'}</span>
          </button>

          {/* Copy Direct App Link */}
          <button
            type="button"
            onClick={handleCopyDirectLink}
            className={`min-h-[40px] flex items-center gap-1.5 px-3.5 rounded-xl text-[13px] font-medium border transition-all cursor-pointer ${
              directLinkCopied
                ? `${theme.greenBg} ${theme.greenText} ${theme.greenBorder}`
                : `${theme.surfaceBg} ${theme.hoverBg} ${theme.textPrimary} ${theme.border}`
            }`}
            title="Copy direct shareable link to this book summary"
          >
            {directLinkCopied ? (
              <Check className={`w-4 h-4 ${theme.greenText} stroke-[2.5]`} />
            ) : (
              <Link2 className={`w-4 h-4 ${theme.accentText}`} />
            )}
            <span>{directLinkCopied ? 'Link Copied' : 'Copy Link'}</span>
          </button>

          {/* Share Insights Snippet */}
          <button
            type="button"
            onClick={handleOpenShare}
            className={`min-h-[40px] flex items-center gap-1.5 px-3.5 rounded-xl text-[13px] font-medium border transition-all cursor-pointer ${theme.surfaceBg} ${theme.hoverBg} ${theme.textPrimary} ${theme.border}`}
            title="Share book thesis and core insights"
          >
            <Share2 className={`w-4 h-4 ${theme.accentText}`} />
            <span>Share</span>
          </button>

          {/* Expandable More Options */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreActions((prev) => !prev)}
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${theme.surfaceBg} ${theme.hoverBg} ${theme.border} ${theme.textSecondary}`}
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreActions && (
              <div
                className={`absolute right-0 mt-2 w-44 rounded-2xl border p-1.5 shadow-xl z-30 space-y-0.5 ${theme.surfaceBg} ${theme.border}`}
              >
                <button
                  type="button"
                  onClick={handleToggleAudio}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${theme.hoverBg} ${
                    isPlayingAudio ? theme.accentText : theme.textPrimary
                  }`}
                >
                  {isPlayingAudio ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  <span>{isPlayingAudio ? 'Stop Audio' : 'Listen'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCopyMarkdown();
                    setShowMoreActions(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors cursor-pointer ${theme.hoverBg} ${theme.textPrimary}`}
                >
                  {copied ? (
                    <Check className={`w-4 h-4 ${theme.greenText}`} />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy Summary'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Eye-Comfort Control Strip */}
      {readerPrefs.isReadableMode && (
        <div
          className={`rounded-2xl border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 transition-all animate-in fade-in duration-200 ${theme.surfaceBg} ${theme.border}`}
        >
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTheme('warm-paper')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all cursor-pointer ${
                readerPrefs.theme === 'warm-paper'
                  ? 'bg-[#F8F3E8] text-[#2C241B] border-[#007AFF] ring-1 ring-[#007AFF]'
                  : `bg-[#F8F3E8] text-[#4A3E32] ${theme.border} opacity-80 hover:opacity-100`
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Warm</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('soft-sage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all cursor-pointer ${
                readerPrefs.theme === 'soft-sage'
                  ? 'bg-[#EAF0E8] text-[#1D281F] border-[#007AFF] ring-1 ring-[#007AFF]'
                  : `bg-[#EAF0E8] text-[#334235] ${theme.border} opacity-80 hover:opacity-100`
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              <span>Sage</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('evening-warm')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium border transition-all cursor-pointer ${
                readerPrefs.theme === 'evening-warm'
                  ? 'bg-[#1C1C1E] text-[#F5F5F7] border-[#0A84FF] ring-1 ring-[#0A84FF]'
                  : `bg-[#2C2C2E] text-[#F5F5F7] ${theme.border} opacity-80 hover:opacity-100`
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Night</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {(
              [
                { id: 'normal', label: 'A-' },
                { id: 'large', label: 'A' },
                { id: 'xlarge', label: 'A+' },
              ] as { id: ReaderFontSize; label: string }[]
            ).map((sz) => (
              <button
                key={sz.id}
                type="button"
                onClick={() => setFontSize(sz.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  readerPrefs.fontSize === sz.id
                    ? `${theme.accentBg} ${theme.accentText} ${theme.accentBorder}`
                    : `${theme.subtleBg} ${theme.textMuted} ${theme.border}`
                }`}
              >
                {sz.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 1. Masthead Card with Graphical Stage Behind Cover */}
      <div className={`rounded-3xl border overflow-hidden transition-colors ${theme.surfaceBg} ${theme.border}`}>
        <div
          className={`relative p-6 sm:p-7 flex flex-col sm:flex-row items-center sm:items-start gap-6 overflow-hidden ${
            readerPrefs.isReadableMode ? theme.subtleBg : `bg-gradient-to-br ${design.stageBg}`
          }`}
        >
          {!readerPrefs.isReadableMode && (
            <BookArtworkBackdrop
              motif={design.motif}
              strokeColor={design.motifStroke}
              fillColor={design.motifFill}
            />
          )}

          <div className="flex-shrink-0 relative z-10">
            <BookCover
              book={book}
              isRead={isRead}
              size="sm"
              showDetailsUnderneath={false}
            />
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1 my-auto relative z-10">
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight leading-tight ${theme.textPrimary}`}>
              {book.title}
            </h1>
            <p className={`text-sm font-medium ${theme.textMuted}`}>
              {book.author}
            </p>
          </div>
        </div>

        {/* Main Idea */}
        <div className={`p-5 sm:p-6 border-t ${theme.border}`}>
          <p className={`font-editorial italic leading-relaxed ${readerPrefs.isReadableMode ? 'text-lg sm:text-xl' : 'text-base'} ${theme.textPrimary}`}>
            "{book.thesis}"
          </p>
        </div>
      </div>

      {/* 2. Expandable Section: Summary Breakdown */}
      <section className={`rounded-2xl border overflow-hidden transition-colors ${theme.surfaceBg} ${theme.border}`}>
        <div
          onClick={() => setShowBreakdown((prev) => !prev)}
          className={`px-5 py-4 flex items-center justify-between gap-3 cursor-pointer select-none ${theme.hoverBg}`}
        >
          <div className="flex items-center gap-2">
            <h2 className={`text-[16px] sm:text-lg font-semibold tracking-tight ${theme.textPrimary}`}>
              Summary
            </h2>
            <span className={`text-[13px] tabular-nums ${theme.textMuted}`}>
              · {book.structure.length} parts
            </span>
          </div>

          <div className="flex items-center gap-2">
            {showBreakdown && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAllParts();
                }}
                className={`text-[12px] font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${theme.accentText} ${theme.hoverBg}`}
              >
                {allPartsExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            )}
            {showBreakdown ? (
              <ChevronUp className={`w-4 h-4 ${theme.textMuted}`} />
            ) : (
              <ChevronDown className={`w-4 h-4 ${theme.textMuted}`} />
            )}
          </div>
        </div>

        {showBreakdown && (
          <div className={`divide-y border-t ${theme.border}`}>
            {book.structure.map((part) => {
              const isOpen = !!expandedParts[part.partNumber];

              return (
                <div key={part.partNumber}>
                  <button
                    type="button"
                    onClick={() => togglePart(part.partNumber)}
                    className={`w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors ${theme.hoverBg}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono-code font-semibold text-xs flex-shrink-0 ${theme.accentBg} ${theme.accentText}`}
                      >
                        {part.partNumber}
                      </span>
                      <span className={`text-[14px] sm:text-[15px] font-semibold truncate ${theme.textPrimary}`}>
                        {part.partTitle}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className={`w-4 h-4 flex-shrink-0 ${theme.textMuted}`} />
                    ) : (
                      <ChevronDown className={`w-4 h-4 flex-shrink-0 ${theme.textMuted}`} />
                    )}
                  </button>

                  {isOpen && (
                    <div className={`px-5 pb-5 pt-2 space-y-3 ${theme.subtleBg}`}>
                      <p className={`${bodyTextClass} ${theme.textPrimary}`}>
                        {part.keyIdea}
                      </p>

                      {part.realLifeExample && (
                        <div className={`p-3.5 rounded-xl border ${theme.surfaceBg} ${theme.border}`}>
                          <span className={`text-[12px] font-semibold block mb-0.5 ${theme.accentText}`}>
                            Example
                          </span>
                          <p className={`${bodyTextClass} ${theme.textSecondary}`}>
                            {part.realLifeExample}
                          </p>
                        </div>
                      )}

                      <p className={`text-[13px] sm:text-sm ${theme.greenText}`}>
                        <span className="font-semibold">Takeaway: </span>
                        {part.whyItMatters}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Expandable Section: Key Takeaways */}
      <section className={`rounded-2xl border overflow-hidden transition-colors ${theme.surfaceBg} ${theme.border}`}>
        <button
          type="button"
          onClick={() => setShowTakeaways((prev) => !prev)}
          className={`w-full px-5 py-4 flex items-center justify-between gap-3 cursor-pointer text-left ${theme.hoverBg}`}
        >
          <div className="flex items-center gap-2.5">
            <Lightbulb className={`w-4 h-4 ${theme.accentText}`} />
            <h2 className={`text-[16px] sm:text-lg font-semibold tracking-tight ${theme.textPrimary}`}>
              Key Takeaways
            </h2>
            <span className={`text-[13px] tabular-nums ${theme.textMuted}`}>
              · {book.keyInsights.length}
            </span>
          </div>
          {showTakeaways ? (
            <ChevronUp className={`w-4 h-4 ${theme.textMuted}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${theme.textMuted}`} />
          )}
        </button>

        {showTakeaways && (
          <ul className={`px-5 pb-5 pt-3 border-t space-y-3 ${theme.border}`}>
            {book.keyInsights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center font-mono-code font-semibold text-[11px] flex-shrink-0 mt-0.5 ${theme.accentBg} ${theme.accentText}`}
                >
                  {idx + 1}
                </span>
                <span className={`${bodyTextClass} ${theme.textPrimary}`}>
                  {insight}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 4. Expandable Section: Implement in Daily Life */}
      <section className={`rounded-2xl border overflow-hidden transition-colors ${theme.surfaceBg} ${theme.border}`}>
        <button
          type="button"
          onClick={() => setShowDailyLife((prev) => !prev)}
          className={`w-full px-5 py-4 flex items-center justify-between gap-3 cursor-pointer text-left ${theme.hoverBg}`}
        >
          <div className="flex items-center gap-2.5">
            <ListChecks className={`w-4 h-4 ${theme.greenText}`} />
            <h2 className={`text-[16px] sm:text-lg font-semibold tracking-tight ${theme.textPrimary}`}>
              Implement in Daily Life
            </h2>
            <span className={`text-[13px] tabular-nums ${theme.greenText}`}>
              · {practicedCount}/{dailyImplementationList.length}
            </span>
          </div>
          {showDailyLife ? (
            <ChevronUp className={`w-4 h-4 ${theme.textMuted}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${theme.textMuted}`} />
          )}
        </button>

        {showDailyLife && (
          <ul className={`divide-y border-t ${theme.border}`}>
            {dailyImplementationList.map((sentence, idx) => {
              const isChecked = !!checkedItems[idx];

              return (
                <li
                  key={idx}
                  onClick={() => toggleCheck(idx)}
                  className={`px-5 py-3.5 transition-colors cursor-pointer flex items-start gap-3 select-none ${
                    isChecked
                      ? `${theme.greenBg} line-through ${theme.textMuted}`
                      : `${theme.hoverBg} ${theme.textPrimary}`
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                      isChecked
                        ? 'bg-[#34C759] border-[#34C759] text-white'
                        : `${theme.surfaceBg} ${theme.border}`
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={`${bodyTextClass} flex-1`}>
                    {sentence}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 5. Expandable Section: Strengths & Limits (Collapsed by default) */}
      <section className={`rounded-2xl border overflow-hidden transition-colors ${theme.surfaceBg} ${theme.border}`}>
        <button
          type="button"
          onClick={() => setShowLimits((prev) => !prev)}
          className={`w-full px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer text-left ${theme.hoverBg}`}
        >
          <div className="flex items-center gap-2.5">
            <Scale className={`w-4 h-4 ${theme.textMuted}`} />
            <span className={`text-[15px] font-semibold tracking-tight ${theme.textPrimary}`}>
              Strengths & Limits
            </span>
          </div>
          {showLimits ? (
            <ChevronUp className={`w-4 h-4 ${theme.textMuted}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${theme.textMuted}`} />
          )}
        </button>

        {showLimits && (
          <div className={`px-5 pb-5 pt-3 border-t ${theme.border}`}>
            <p className={`${bodyTextClass} ${theme.textSecondary}`}>
              {book.strengthWeakness}
            </p>
          </div>
        )}
      </section>

      {/* 6. Expandable Section: Ask a Question (Open below every book) */}
      <section className={`rounded-2xl border overflow-hidden transition-colors ${theme.surfaceBg} ${theme.border}`}>
        <button
          type="button"
          onClick={() => setShowAsk((prev) => !prev)}
          className={`w-full px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer text-left ${theme.hoverBg}`}
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle className={`w-4 h-4 ${theme.accentText}`} />
            <span className={`text-[15px] font-semibold tracking-tight ${theme.textPrimary}`}>
              Ask a Question
            </span>
          </div>
          {showAsk ? (
            <ChevronUp className={`w-4 h-4 ${theme.textMuted}`} />
          ) : (
            <ChevronDown className={`w-4 h-4 ${theme.textMuted}`} />
          )}
        </button>

        {showAsk && (
          <div className={`px-5 pb-5 pt-3 border-t space-y-3.5 ${theme.border}`}>
            {/* Quick-tap starter questions */}
            <div className="flex flex-wrap gap-1.5">
              {[
                `What is the main lesson in simple words?`,
                `How do I apply this in daily life?`,
                `Give a real-life example from this book.`,
                `What are its weak spots?`,
              ].map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  disabled={isAskingLab}
                  onClick={() => submitQuestion(promptText)}
                  className={`px-3 py-1.5 rounded-xl border text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50 ${theme.subtleBg} ${theme.hoverBg} ${theme.border} ${theme.textSecondary}`}
                >
                  {promptText}
                </button>
              ))}
            </div>

            {qaHistory.length > 0 && (
              <div className="space-y-3">
                {qaHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border space-y-2 ${theme.subtleBg} ${theme.border}`}
                  >
                    <p className={`text-xs sm:text-[13px] font-semibold ${theme.accentText}`}>
                      {item.question}
                    </p>
                    <div className={`${bodyTextClass} whitespace-pre-wrap ${theme.textPrimary}`}>
                      {item.answer}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAskLab} className="space-y-2.5">
              <textarea
                value={labQuestion}
                onChange={(e) => setLabQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitQuestion(labQuestion);
                  }
                }}
                placeholder={`Ask anything about ${book.title}...`}
                rows={2}
                className={`w-full border rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF]/25 focus:border-[#007AFF] transition-all ${theme.subtleBg} ${theme.border} ${theme.textPrimary}`}
              />
              <button
                type="submit"
                disabled={isAskingLab || !labQuestion.trim()}
                className="min-h-[40px] flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 text-white font-semibold text-xs sm:text-[13px] cursor-pointer transition-all"
              >
                {isAskingLab ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Ask</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </section>

      {/* Share Core Insights & Thesis Modal */}
      {isShareOpen && (
        <div
          onClick={() => setIsShareOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
            className={`w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${theme.surfaceBg} ${theme.border}`}
          >
            {/* Header */}
            <div className={`px-5 py-4 border-b flex items-center justify-between gap-3 ${theme.border}`}>
              <div className="min-w-0">
                <h3 id="share-modal-title" className={`text-base font-bold tracking-tight truncate ${theme.textPrimary}`}>
                  Share Book Insights
                </h3>
                <p className={`text-xs truncate ${theme.textMuted}`}>
                  {book.title} · {book.author}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsShareOpen(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${theme.subtleBg} ${theme.hoverBg} ${theme.textMuted}`}
                aria-label="Close share dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Direct Shareable Summary Link */}
              <div className="space-y-1.5">
                <span className={`text-xs font-medium block ${theme.textSecondary}`}>
                  Summary link
                </span>
                <div className={`flex items-center gap-2 p-1.5 pl-3 rounded-xl border ${theme.subtleBg} ${theme.border}`}>
                  <Link2 className={`w-3.5 h-3.5 flex-shrink-0 ${theme.accentText}`} />
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 min-w-0 truncate text-xs font-mono-code underline underline-offset-2 hover:opacity-80 ${theme.accentText}`}
                  >
                    {shareUrl}
                  </a>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open summary in browser"
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${theme.hoverBg} ${theme.textMuted}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0 ${
                      linkCopied
                        ? 'bg-[#34C759] text-white'
                        : `${theme.surfaceBg} ${theme.hoverBg} ${theme.textPrimary} border ${theme.border}`
                    }`}
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Format Toggle */}
              <div className={`p-1 rounded-xl grid grid-cols-2 gap-1 border ${theme.subtleBg} ${theme.border}`}>
                <button
                  type="button"
                  onClick={() => handleSwitchShareFormat('social')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    shareFormat === 'social'
                      ? `${theme.surfaceBg} ${theme.textPrimary} shadow-xs`
                      : `${theme.textMuted} hover:opacity-80`
                  }`}
                >
                  Short Snippet
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchShareFormat('detailed')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    shareFormat === 'detailed'
                      ? `${theme.surfaceBg} ${theme.textPrimary} shadow-xs`
                      : `${theme.textMuted} hover:opacity-80`
                  }`}
                >
                  All Insights ({book.keyInsights.length})
                </button>
              </div>

              {/* Clickable Shareable Snippet Preview / Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${theme.textSecondary}`}>
                    Snippet preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingSnippet((prev) => !prev)}
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${theme.accentText} ${theme.hoverBg}`}
                  >
                    <Pencil className="w-3 h-3" />
                    <span>{isEditingSnippet ? 'Done' : 'Edit text'}</span>
                  </button>
                </div>

                {isEditingSnippet ? (
                  <textarea
                    id="share-snippet-textarea"
                    value={shareSnippetText}
                    onChange={(e) => {
                      setShareSnippetText(e.target.value);
                      if (shareCopied) setShareCopied(false);
                    }}
                    rows={5}
                    className={`w-full rounded-2xl border p-3.5 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#007AFF]/25 focus:border-[#007AFF] transition-all resize-y ${theme.subtleBg} ${theme.border} ${theme.textPrimary}`}
                  />
                ) : (
                  <div
                    className={`w-full rounded-2xl border p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words ${theme.subtleBg} ${theme.border} ${theme.textPrimary}`}
                  >
                    {renderSnippetWithClickableLinks(shareSnippetText)}
                  </div>
                )}
              </div>

              {/* Direct Social Share Links */}
              <div className="space-y-2">
                <p className={`text-xs font-medium ${theme.textMuted}`}>Share on social media</p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareSnippetText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`min-h-[38px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${theme.subtleBg} ${theme.hoverBg} ${theme.border} ${theme.textPrimary}`}
                  >
                    <span>Post on X</span>
                  </a>

                  <a
                    href={`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(shareSnippetText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`min-h-[38px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${theme.subtleBg} ${theme.hoverBg} ${theme.border} ${theme.textPrimary}`}
                  >
                    <span>LinkedIn</span>
                  </a>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareSnippetText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`min-h-[38px] px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${theme.subtleBg} ${theme.hoverBg} ${theme.border} ${theme.textPrimary}`}
                  >
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={`px-5 py-4 border-t flex flex-wrap items-center justify-end gap-2.5 ${theme.border}`}>
              {canUseWebShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className={`min-h-[42px] px-4 rounded-xl border text-[13px] font-semibold flex items-center gap-2 transition-colors cursor-pointer ${theme.subtleBg} ${theme.hoverBg} ${theme.border} ${theme.textPrimary}`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share via...</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyShareSnippet}
                className={`min-h-[42px] flex-1 sm:flex-initial px-5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  shareCopied
                    ? 'bg-[#34C759] text-white'
                    : 'bg-[#007AFF] hover:bg-[#0066D6] text-white'
                }`}
              >
                {shareCopied ? (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Copied Snippet!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
