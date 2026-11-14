import React from 'react';
import { X, Sparkles, BookOpen, Check, ArrowRight } from 'lucide-react';
import { CandidateBook } from '../types';
import { getCategoryBadgeStyle } from '../utils/formatters';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: CandidateBook[];
  onInductCandidate: (candidate: CandidateBook) => void;
  nextDay: number;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({
  isOpen,
  onClose,
  candidates,
  onInductCandidate,
  nextDay,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#241E1A]/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#FAF8F5] border-l border-[#ECE6DE] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-[#ECE6DE] bg-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#241E1A] font-editorial flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#C86242]" />
              <span>Upcoming Candidate Queue</span>
            </h3>
            <p className="text-xs text-[#7F756D] mt-0.5">
              Pre-screened titles meeting high-substance qualification
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#7F756D] hover:text-[#241E1A] hover:bg-[#F3EFEA] border border-[#E3DCD1] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {candidates.length === 0 ? (
            <div className="text-center py-12 text-[#9C9388] text-xs">
              No candidates remaining in the queue. You can research any custom book directly.
            </div>
          ) : (
            candidates.map((cand, idx) => {
              const badge = getCategoryBadgeStyle(cand.category);

              return (
                <div
                  key={cand.title}
                  className="p-4 rounded-2xl bg-white border border-[#ECE6DE] hover:border-[#D1C9BE] shadow-2xs transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono-code font-bold text-[#9C9388]">
                      QUEUE #{idx + 1}
                    </span>
                    <span
                      className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {cand.category}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#241E1A] font-editorial leading-snug">
                      {cand.title}
                    </h4>
                    {cand.subtitle && (
                      <p className="text-xs text-[#7F756D] font-editorial italic mt-0.5">
                        {cand.subtitle}
                      </p>
                    )}
                    <p className="text-xs text-[#C86242] font-semibold mt-1">
                      By {cand.author} {cand.year ? `(${cand.year})` : ''}
                    </p>
                  </div>

                  <p className="text-[11px] text-[#5B524A] leading-relaxed bg-[#FAF8F5] p-2.5 rounded-xl border border-[#ECE6DE]">
                    <span className="font-semibold text-[#7F756D] block text-[10px] uppercase font-mono-code mb-0.5">
                      Why it qualifies:
                    </span>
                    {cand.qualificationRationale}
                  </p>

                  <button
                    onClick={() => {
                      onInductCandidate(cand);
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-full bg-[#FAF1EC] hover:bg-[#C86242] text-[#C86242] hover:text-white border border-[#EBC8BA] text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Research & Induct as Day {nextDay}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
