import React from 'react';
import { Book } from '../types';
import { getBookCoverDesign } from '../utils/formatters';
import { Check } from 'lucide-react';

interface BookCoverProps {
  book: Book;
  isRead?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onToggleRead?: (e: React.MouseEvent) => void;
  showDetailsUnderneath?: boolean;
}

export const BookCover: React.FC<BookCoverProps> = ({
  book,
  isRead = false,
  size = 'md',
  onClick,
  onToggleRead,
  showDetailsUnderneath = true,
}) => {
  const design = getBookCoverDesign(book.title, book.category);

  const sizeClasses = {
    sm: 'w-26 h-38 text-[10px]',
    md: 'w-32 h-48 sm:w-36 sm:h-52 text-xs',
    lg: 'w-44 h-64 sm:w-52 sm:h-76 text-sm',
  }[size];

  return (
    <div className="flex flex-col items-center group relative">
      {/* Crisp Apple Books Cover Card */}
      <div
        onClick={onClick}
        className={`relative ${sizeClasses} rounded-r-xl rounded-l-[3px] bg-gradient-to-br ${design.bgGradient} p-3.5 sm:p-4 flex flex-col justify-between cursor-pointer select-none transition-transform duration-200 ease-out group-hover:-translate-y-1 book-cover-shadow overflow-hidden border border-black/10`}
        role="button"
        tabIndex={0}
      >
        {/* Spine crease */}
        <div className="absolute left-0 top-0 bottom-0 w-3 book-spine-effect pointer-events-none" />

        {/* Subtle geometric cover watermark graphic */}
        <svg
          viewBox="0 0 120 160"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.14]"
        >
          <circle cx="88" cy="40" r="36" stroke="white" strokeWidth="1" fill="none" />
          <circle cx="88" cy="40" r="22" stroke="white" strokeWidth="1" fill="none" />
          <line x1="16" y1="120" x2="104" y2="120" stroke="white" strokeWidth="0.75" />
        </svg>

        {/* Completion Tick Button (optional on cover) */}
        {onToggleRead && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleRead(e);
            }}
            className={`absolute top-2 right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              isRead
                ? 'bg-[#34C759] text-white'
                : 'bg-white/25 hover:bg-white/90 text-white/90 hover:text-[#1D1D1F] backdrop-blur-xs'
            }`}
            title={isRead ? 'Completed' : 'Mark as read'}
            aria-label={isRead ? 'Marked as read' : 'Mark as read'}
          >
            <Check className={`w-3.5 h-3.5 ${isRead ? 'stroke-[3]' : 'stroke-[2.2]'}`} />
          </button>
        )}

        {/* Cover Title */}
        <div className="my-auto pl-1.5 pr-1 text-left relative z-10">
          <h3
            className="font-editorial font-semibold leading-snug tracking-tight line-clamp-4"
            style={{ color: design.textColor }}
          >
            {book.title}
          </h3>
        </div>

        {/* Cover Author */}
        <div
          className="pt-2 border-t pl-1.5 relative z-10"
          style={{ borderColor: design.accentBorder }}
        >
          <span
            className="text-[10px] font-medium tracking-wide truncate block"
            style={{ color: design.authorColor }}
          >
            {book.author}
          </span>
        </div>
      </div>

      {/* Optional standalone details below cover */}
      {showDetailsUnderneath && (
        <div className="mt-2.5 text-center max-w-[150px] space-y-0.5">
          <h4 className="text-[13px] font-semibold text-[#1D1D1F] line-clamp-1 group-hover:text-[#007AFF] transition-colors">
            {book.title}
          </h4>
          <p className="text-[11px] text-[#6E6E73] line-clamp-1">
            {book.author}
          </p>
        </div>
      )}
    </div>
  );
};
