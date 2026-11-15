import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  BookOpen,
  CheckCircle2,
  Eye,
  MessageSquare,
  QrCode,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { AppLogo } from './AppLogo';

interface QuickTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    icon: BookOpen,
    accentBg: 'bg-[#007AFF]/12 text-[#007AFF]',
    title: 'Welcome to Read a Book',
    summary:
      'You start with 20 classic books explained in simple, everyday words—so you can learn a whole book’s best lessons in just a few minutes.',
    bullets: [
      'Tap any book cover on the shelf to see a quick overview.',
      'Tap "Read Full Summary" for detailed plain-English sections and real-life examples.',
    ],
  },
  {
    icon: TrendingUp,
    accentBg: 'bg-[#34C759]/15 text-[#248A3D]',
    title: 'Mark Books Read & Watch Your Growth',
    summary:
      'Keep track of every book you finish and watch your reading streak build day by day.',
    bullets: [
      'Tap the check mark button at the top-right corner of any book card—or inside its summary—to mark it Read.',
      'Tap the "Growth" card above the library anytime to reveal your smooth progress chart (days skipped drop back to 0 cleanly).',
    ],
  },
  {
    icon: Eye,
    accentBg: 'bg-[#AF52DE]/12 text-[#8944AB]',
    title: 'Readable Mode & Daily Life Checklist',
    summary:
      'Comfortable reading designed to be gentle on your eyes, plus real habits you can try today.',
    bullets: [
      'Inside any summary, tap "Readable" to switch to Paper or Night backgrounds and larger, softer text.',
      'Scroll to "Implement in Daily Life" inside every book to check off simple, practical actions you try in real life.',
    ],
  },
  {
    icon: MessageSquare,
    accentBg: 'bg-[#FF9500]/15 text-[#B25000]',
    title: 'Ask Questions & Grow Your Shelf',
    summary:
      'Never get stuck on a concept—ask questions directly inside any book or add any new title you want.',
    bullets: [
      'Use "Ask About This Book" at the bottom of any summary to get plain, accurate answers right away.',
      'Open the right Menu to add 1 to 5 curated books at once, or type any specific book title and author.',
    ],
  },
  {
    icon: QrCode,
    accentBg: 'bg-[#1D1D1F]/10 text-[#1D1D1F]',
    title: 'Sync Your Account & Phone QR',
    summary:
      'Save your library across devices and install the app on your Android or iPhone in seconds.',
    bullets: [
      'Create a free account in the Menu using your unique username, Gmail, and password so your books stay yours.',
      'Open "Phone QR & Install" in the Menu anytime to scan the QR code and install on your phone without cables.',
    ],
  },
];

export const QuickTutorialModal: React.FC<QuickTutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const step = TUTORIAL_STEPS[stepIndex];
  const Icon = step.icon;
  const isLast = stepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
      onClose();
    } else {
      setStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    onComplete();
    onClose();
  };

  return createPortal(
    <div
      onClick={handleSkip}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full sm:max-w-lg bg-[#F5F5F7] rounded-t-3xl sm:rounded-3xl border border-black/[0.08] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-black/[0.06] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#007AFF] tabular-nums">
              Quick Guide · {stepIndex + 1} of {TUTORIAL_STEPS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="w-8 h-8 rounded-full bg-[#F2F2F7] text-[#6E6E73] hover:text-[#1D1D1F] flex items-center justify-center cursor-pointer"
            aria-label="Close tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slide Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          <div className="bg-white rounded-2xl border border-black/[0.05] p-5 sm:p-6 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {stepIndex === 0 ? (
              <AppLogo className="w-12 h-12 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]" />
            ) : (
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${step.accentBg}`}>
                <Icon className="w-6 h-6" />
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-[20px] font-bold text-[#1D1D1F] tracking-tight leading-snug">
                {step.title}
              </h3>
              <p className="text-[14px] text-[#3A3A3C] leading-relaxed">
                {step.summary}
              </p>
            </div>

            <ul className="space-y-2.5 pt-1">
              {step.bullets.map((line, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[13.5px] text-[#1D1D1F] leading-relaxed bg-[#F5F5F7] rounded-xl p-3"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Step Dots */}
          <div className="flex items-center justify-center gap-2">
            {TUTORIAL_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setStepIndex(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === stepIndex ? 'w-6 bg-[#007AFF]' : 'w-2 bg-black/[0.15] hover:bg-black/[0.3]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-white border-t border-black/[0.06] flex items-center justify-between gap-3 shrink-0">
          {stepIndex > 0 ? (
            <button
              type="button"
              onClick={handleBack}
              className="h-11 px-4 rounded-xl bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-[14px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSkip}
              className="h-11 px-4 rounded-xl text-[#6E6E73] hover:text-[#1D1D1F] text-[14px] font-medium cursor-pointer"
            >
              Skip
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 sm:flex-none h-11 px-6 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-[14px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>{isLast ? 'Start Reading' : 'Next'}</span>
            {!isLast && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
