import React from 'react';
import { Book } from '../types';
import { BookCover } from './BookCover';
import { BookArtworkBackdrop } from './BookArtworkBackdrop';
import { getBookCoverDesign } from '../utils/formatters';
import { ReadStatusMap } from '../utils/readingStorage';
import { Check } from 'lucide-react';

interface BookGridProps {
  books: Book[];
  totalBooksCount: number;
  readStatusMap: ReadStatusMap;
  onSelectBookForPreview: (book: Book) => void;
  onToggleRead: (bookId: string, category: string) => void;
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  totalBooksCount,
  readStatusMap,
  onSelectBookForPreview,
  onToggleRead,
}) => {
  const completedCount = Object.values(readStatusMap).filter((r) => r.read).length;
  const progressPct =
    totalBooksCount > 0 ? Math.round((completedCount / totalBooksCount) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-8">
      {/* Clean Editorial Library Heading */}
      <div className="flex items-baseline justify-between border-b border-black/[0.06] pb-3">
        <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1F] tracking-tight">
          Library
        </h2>
        <span className="text-[13px] text-[#6E6E73] tabular-nums">
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </span>
      </div>

      {/* Apple Books Showcase Cards with Bespoke Graphical Backdrop Behind Each Book */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {books.map((book) => {
          const isRead = !!readStatusMap[book.id]?.read;
          const design = getBookCoverDesign(book.title, book.category);

          return (
            <div
              key={book.id}
              onClick={() => onSelectBookForPreview(book)}
              className="group bg-white rounded-2xl border border-black/[0.05] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.07)] transition-all duration-200 cursor-pointer flex flex-col"
            >
              {/* Graphical Artwork Stage Behind the Book */}
              <div
                className={`relative bg-gradient-to-b ${design.stageBg} pt-6 pb-5 px-4 flex items-center justify-center overflow-hidden`}
              >
                <BookArtworkBackdrop
                  motif={design.motif}
                  strokeColor={design.motifStroke}
                  fillColor={design.motifFill}
                />

                {/* Top-right completion tick button (40px tap zone) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRead(book.id, book.category);
                  }}
                  className="absolute top-2 right-2 z-20 w-9 h-9 flex items-center justify-center rounded-full cursor-pointer"
                  title={isRead ? 'Completed' : 'Mark as read'}
                  aria-label={isRead ? 'Marked as read' : 'Mark as read'}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-xs ${
                      isRead
                        ? 'bg-[#34C759] text-white'
                        : 'bg-white/85 hover:bg-white text-[#86868B] hover:text-[#1D1D1F] backdrop-blur-md border border-black/[0.06]'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${isRead ? 'stroke-[3]' : 'stroke-[2.2]'}`} />
                  </span>
                </button>

                {/* Book Cover seated in front of graphical backdrop */}
                <div className="relative z-10">
                  <BookCover
                    book={book}
                    isRead={isRead}
                    size="sm"
                    showDetailsUnderneath={false}
                  />
                </div>
              </div>

              {/* Clean Book Info Footer */}
              <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-1 bg-white">
                <h3 className="text-[14px] sm:text-[15px] font-semibold text-[#1D1D1F] leading-snug line-clamp-2 group-hover:text-[#007AFF] transition-colors">
                  {book.title}
                </h3>
                <p className="text-[12px] text-[#6E6E73] line-clamp-1">
                  {book.author}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Books Completed Bar (clean & thumb-friendly on mobile) */}
      <section className="pt-2">
        <div className="bg-white rounded-2xl border border-black/[0.05] p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#34C759]/15 text-[#248A3D] flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[#1D1D1F]">
                Books Completed
              </p>
              <p className="text-[12px] text-[#6E6E73] tabular-nums">
                {completedCount} of {totalBooksCount} read
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:w-64">
            <div className="flex-1 h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#34C759] rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[13px] font-semibold text-[#1D1D1F] tabular-nums w-9 text-right">
              {progressPct}%
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
