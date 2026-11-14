import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Check,
  Loader2,
  Download,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Book } from '../types';
import { ReadStatusMap } from '../utils/readingStorage';
import { exportLibraryJson } from '../utils/libraryStorage';

export type LibraryFilter = 'all' | 'unread' | 'completed';

interface RightSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  books: Book[];
  readStatusMap: ReadStatusMap;
  filterMode: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  onAutoAddBooks: (count: number, specificTitle?: string) => Promise<void>;
  isAddingBooks: boolean;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  books,
  readStatusMap,
  filterMode,
  onFilterChange,
  onAutoAddBooks,
  isAddingBooks,
}) => {
  const [bookCountToAdd, setBookCountToAdd] = useState<number>(1);
  const [showSpecificInput, setShowSpecificInput] = useState(false);
  const [specificTitleInput, setSpecificTitleInput] = useState('');

  const readCount = useMemo(() => {
    return Object.values(readStatusMap).filter((r) => r.read).length;
  }, [readStatusMap]);

  const progressPct = books.length > 0 ? Math.round((readCount / books.length) * 100) : 0;

  const handleQuickAdd = async () => {
    if (isAddingBooks) return;
    await onAutoAddBooks(bookCountToAdd);
  };

  const handleSpecificAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specificTitleInput.trim() || isAddingBooks) return;
    await onAutoAddBooks(1, specificTitleInput.trim());
    setSpecificTitleInput('');
    setShowSpecificInput(false);
  };

  if (!isOpen) return null;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#F5F5F7] text-[#1D1D1F]">
      {/* Sidebar Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-black/[0.06] bg-white/70 backdrop-blur-xl shrink-0">
        <span className="text-[15px] font-semibold tracking-tight text-[#1D1D1F]">
          Library Menu
        </span>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[40px] min-h-[40px] -mr-2 flex items-center justify-center rounded-full text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-black/[0.05] transition-colors cursor-pointer"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Apple Grouped Lists */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
        {/* 1. Search */}
        <section className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search titles or authors"
              className="w-full h-11 bg-white border border-black/[0.06] rounded-xl pl-10 pr-8 text-[14px] text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#E5E5EA] text-[#6E6E73] hover:text-[#1D1D1F] flex items-center justify-center text-xs cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </section>

        {/* 2. Add a Book */}
        <section className="space-y-2">
          <h3 className="px-1 text-[13px] font-semibold text-[#6E6E73]">
            Add a Book
          </h3>
          <div className="bg-white rounded-2xl border border-black/[0.05] divide-y divide-black/[0.06] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {/* Quantity Segmented Selector */}
            <div className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#1D1D1F]">
                  Number of books
                </span>
                <span className="text-[13px] text-[#6E6E73] tabular-nums">
                  {bookCountToAdd}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1 p-1 bg-[#F2F2F7] rounded-xl">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setBookCountToAdd(num)}
                    className={`h-8 rounded-lg text-[13px] font-semibold tabular-nums transition-all cursor-pointer ${
                      bookCountToAdd === num
                        ? 'bg-white text-[#1D1D1F] shadow-xs'
                        : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={isAddingBooks}
                className="w-full h-11 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {isAddingBooks ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 stroke-[2.2]" />
                    <span>
                      Add {bookCountToAdd} {bookCountToAdd === 1 ? 'Book' : 'Books'}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Expandable Specific Title Row */}
            <div>
              <button
                type="button"
                onClick={() => setShowSpecificInput((prev) => !prev)}
                className="w-full px-3.5 min-h-[44px] flex items-center justify-between text-[14px] font-medium text-[#007AFF] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
              >
                <span>Add a specific book</span>
                <ChevronRight
                  className={`w-4 h-4 text-[#C7C7CC] transition-transform ${
                    showSpecificInput ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {showSpecificInput && (
                <form
                  onSubmit={handleSpecificAdd}
                  className="px-3.5 pb-3.5 pt-1 space-y-2.5 bg-[#FAFAFC]"
                >
                  <input
                    type="text"
                    placeholder="Title and author..."
                    value={specificTitleInput}
                    onChange={(e) => setSpecificTitleInput(e.target.value)}
                    autoFocus
                    className="w-full h-10 bg-white border border-black/[0.1] rounded-xl px-3 text-[13px] text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:border-[#007AFF]"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSpecificInput(false)}
                      className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!specificTitleInput.trim() || isAddingBooks}
                      className="px-4 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-40 text-white text-[13px] font-semibold cursor-pointer"
                    >
                      {isAddingBooks ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* 3. View Filter */}
        <section className="space-y-2">
          <h3 className="px-1 text-[13px] font-semibold text-[#6E6E73]">
            Show Books
          </h3>
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#E5E5EA]/75 rounded-xl">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unread', label: 'Unread' },
                { id: 'completed', label: 'Completed' },
              ] as { id: LibraryFilter; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onFilterChange(item.id)}
                className={`h-9 rounded-lg text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                  filterMode === item.id
                    ? 'bg-white text-[#1D1D1F] font-semibold shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* 4. Books Completed Summary */}
        <section className="space-y-2">
          <h3 className="px-1 text-[13px] font-semibold text-[#6E6E73]">
            Completed
          </h3>
          <div className="bg-white rounded-2xl border border-black/[0.05] p-4 space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#34C759]/15 text-[#248A3D] flex items-center justify-center">
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[#1D1D1F]">
                    Books Completed
                  </p>
                  <p className="text-[12px] text-[#6E6E73] tabular-nums">
                    {readCount} of {books.length} books
                  </p>
                </div>
              </div>
              <span className="text-[20px] font-bold text-[#1D1D1F] tabular-nums">
                {readCount}
              </span>
            </div>

            <div className="w-full h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#34C759] rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </section>

        {/* 5. Library Tools */}
        <section className="space-y-2">
          <h3 className="px-1 text-[13px] font-semibold text-[#6E6E73]">
            Library
          </h3>
          <div className="bg-white rounded-2xl border border-black/[0.05] divide-y divide-black/[0.06] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <button
              type="button"
              onClick={() => exportLibraryJson(books)}
              className="w-full px-4 min-h-[46px] flex items-center justify-between text-[14px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-[#007AFF]" />
                <span>Export Backup</span>
              </span>
              <span className="text-[12px] text-[#86868B]">JSON</span>
            </button>

            <div className="px-4 min-h-[46px] flex items-center justify-between text-[14px]">
              <span className="flex items-center gap-2.5 text-[#1D1D1F] font-medium">
                <BookOpen className="w-4 h-4 text-[#6E6E73]" />
                <span>Total Saved</span>
              </span>
              <span className="text-[13px] text-[#6E6E73] tabular-nums">
                {books.length}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile & Tablet Slide-Over Drawer from Right */}
      <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
        />
        <aside className="relative w-[86vw] max-w-[340px] h-full shadow-2xl border-l border-black/[0.08] z-10 animate-in slide-in-from-right duration-200">
          {sidebarContent}
        </aside>
      </div>

      {/* Desktop Docked Right Sidebar */}
      <aside className="hidden lg:block w-80 shrink-0 border-l border-black/[0.06] bg-[#F5F5F7] sticky top-14 h-[calc(100vh-3.5rem)]">
        {sidebarContent}
      </aside>
    </>
  );
};
