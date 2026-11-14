import React from 'react';
import { Search, ChevronLeft, ChevronRight, CheckCircle2, Check } from 'lucide-react';
import { Book } from '../types';
import { getCategoryBadgeStyle } from '../utils/formatters';
import { ReadStatusMap } from '../utils/readingStorage';

interface TimelineNavProps {
  books: Book[];
  selectedBookId: string;
  onSelectBook: (id: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  readStatusMap: ReadStatusMap;
}

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Investing', value: 'Investing' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Business', value: 'Business' },
  { label: 'Entrepreneurship', value: 'Entrepreneurship' },
  { label: 'Personal Growth', value: 'Personal Development' },
  { label: 'Self-Growth', value: 'Self-Growth' },
];

export const TimelineNav: React.FC<TimelineNavProps> = ({
  books,
  selectedBookId,
  onSelectBook,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  readStatusMap,
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const amount = direction === 'left' ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#FAF8F5] border-b border-[#ECE6DE] px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Top Controls: Search & Category Chips */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.value;
              const count =
                cat.value === 'ALL'
                  ? books.length
                  : books.filter((b) => b.category === cat.value).length;

              return (
                <button
                  key={cat.value}
                  onClick={() => onSelectCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#241E1A] text-[#FAF8F5] shadow-xs'
                      : 'bg-white hover:bg-[#F3EFEA] text-[#5B524A] border border-[#E3DCD1]'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-code ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F3EFEA] text-[#7F756D]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Minimal Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9C9388]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search books, authors, theses..."
              className="w-full bg-white border border-[#E3DCD1] focus:border-[#C86242] focus:ring-1 focus:ring-[#C86242] rounded-full pl-9 pr-7 py-1.5 text-xs text-[#241E1A] placeholder-[#9C9388] focus:outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C9388] hover:text-[#241E1A] text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Days Horizontal Timeline Scroller */}
        <div className="relative flex items-center">
          <button
            onClick={() => scroll('left')}
            className="absolute -left-2 z-10 p-1.5 rounded-full bg-white hover:bg-[#F3EFEA] text-[#5B524A] border border-[#E3DCD1] shadow-sm cursor-pointer hidden md:flex items-center justify-center transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div
            ref={scrollContainerRef}
            className="flex items-center gap-2.5 overflow-x-auto py-1 scroll-smooth w-full no-scrollbar px-1"
          >
            {books.map((book) => {
              const isSelected = book.id === selectedBookId;
              const isRead = !!readStatusMap[book.id]?.read;
              const badge = getCategoryBadgeStyle(book.category);

              return (
                <button
                  key={book.id}
                  onClick={() => onSelectBook(book.id)}
                  className={`flex-shrink-0 text-left p-2.5 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-white border-[#241E1A] ring-1 ring-[#241E1A] shadow-sm'
                      : isRead
                      ? 'bg-white hover:bg-[#F8F6F1] border-[#C8DEC9]'
                      : 'bg-white/80 hover:bg-white border-[#E7E1D7] hover:border-[#D1C9BE]'
                  }`}
                  style={{ width: '205px' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono-code font-bold text-[#A66016] flex items-center gap-1">
                        DAY {book.day}
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-[#241E1A]" />}
                      </span>
                      {isRead && (
                        <span
                          className="flex items-center gap-0.5 text-[9px] font-mono-code font-bold text-[#2E5E35] bg-[#EFF5F0] border border-[#C8DEC9] px-1.5 py-0.2 rounded-full"
                          title="Marked as Read"
                        >
                          <Check className="w-2.5 h-2.5 text-[#2E5E35] stroke-[3]" />
                          READ
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {book.category}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#241E1A] line-clamp-1 font-editorial group-hover:text-[#C86242] transition-colors">
                    {book.title}
                  </h4>
                  <p className="text-[11px] text-[#7F756D] line-clamp-1 mt-0.5">
                    {book.author}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => scroll('right')}
            className="absolute -right-2 z-10 p-1.5 rounded-full bg-white hover:bg-[#F3EFEA] text-[#5B524A] border border-[#E3DCD1] shadow-sm cursor-pointer hidden md:flex items-center justify-center transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
