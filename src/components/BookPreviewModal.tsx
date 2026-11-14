import React, { useState } from 'react';
import { X, Check, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Book } from '../types';
import { BookCover } from './BookCover';
import { BookArtworkBackdrop } from './BookArtworkBackdrop';
import { getBookCoverDesign } from '../utils/formatters';

interface BookPreviewModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onExpandSummary: (book: Book) => void;
  isRead: boolean;
  onToggleRead: () => void;
}

export const BookPreviewModal: React.FC<BookPreviewModalProps> = ({
  book,
  isOpen,
  onClose,
  onExpandSummary,
  isRead,
  onToggleRead,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  if (!isOpen || !book) return null;

  const design = getBookCoverDesign(book.title, book.category);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/35 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-[#F5F5F7] rounded-t-3xl sm:rounded-3xl border border-black/[0.08] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
      >
        {/* Graphical Hero Stage Behind Book Cover */}
        <div className={`relative bg-gradient-to-b ${design.stageBg} pt-6 pb-6 px-6 flex flex-col items-center overflow-hidden border-b border-black/[0.06]`}>
          <BookArtworkBackdrop
            motif={design.motif}
            strokeColor={design.motifStroke}
            fillColor={design.motifFill}
          />

          {/* Mobile grab handle */}
          <div className="sm:hidden w-10 h-1 bg-black/20 rounded-full mb-4 relative z-10" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-white/85 hover:bg-white text-[#6E6E73] hover:text-[#1D1D1F] flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md shadow-xs"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10">
            <BookCover
              book={book}
              isRead={isRead}
              size="sm"
              showDetailsUnderneath={false}
              onToggleRead={onToggleRead}
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-[#1D1D1F] tracking-tight leading-snug">
              {book.title}
            </h3>
            <p className="text-[13px] font-medium text-[#6E6E73]">
              {book.author}
            </p>

            {/* Expandable optional details */}
            {(book.subtitle || book.year) && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowInfo((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[#007AFF] hover:text-[#0066D6] transition-colors cursor-pointer"
                >
                  <span>Book info</span>
                  {showInfo ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showInfo && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-white border border-black/[0.05] text-xs text-[#3A3A3C] space-y-1 text-left">
                    {book.subtitle && (
                      <p className="font-editorial italic text-[#3A3A3C]">{book.subtitle}</p>
                    )}
                    <p className="text-[12px] text-[#6E6E73] tabular-nums">
                      {book.year} · {book.structure.length} parts
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clean Main Idea */}
          <div className="p-4 rounded-2xl bg-white border border-black/[0.05]">
            <p className="text-[14px] font-editorial italic text-[#1D1D1F] leading-relaxed">
              "{book.thesis}"
            </p>
          </div>
        </div>

        {/* Apple Sheet Action Footer */}
        <div className="p-4 sm:px-6 sm:py-4 bg-white border-t border-black/[0.06] flex flex-col sm:flex-row items-center gap-2.5">
          <button
            onClick={onToggleRead}
            className={`w-full sm:w-auto min-h-[44px] px-5 rounded-xl text-[14px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isRead
                ? 'bg-[#34C759]/15 text-[#248A3D]'
                : 'bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F]'
            }`}
          >
            <Check className={`w-4 h-4 ${isRead ? 'text-[#248A3D] stroke-[2.6]' : 'text-[#6E6E73]'}`} />
            <span>{isRead ? 'Completed' : 'Mark as Read'}</span>
          </button>

          <button
            onClick={() => {
              onExpandSummary(book);
              onClose();
            }}
            className="w-full flex-1 min-h-[44px] px-5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-semibold text-[14px] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Read Summary</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
