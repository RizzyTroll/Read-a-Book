import React from 'react';
import { BookOpen, Search, PanelRight, X } from 'lucide-react';
import { ReaderThemeClasses } from '../utils/readerPreferences';

interface HeaderProps {
  onBackToLibrary?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  readerTheme?: ReaderThemeClasses;
}

export const Header: React.FC<HeaderProps> = ({
  onBackToLibrary,
  searchQuery,
  onSearchChange,
  isSidebarOpen,
  onToggleSidebar,
  readerTheme,
}) => {
  return (
    <header
      className={`h-14 border-b backdrop-blur-xl sticky top-0 z-30 transition-colors ${
        readerTheme
          ? `${readerTheme.pageBg} ${readerTheme.border}`
          : 'border-black/[0.06] bg-[#F5F5F7]/85'
      }`}
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Clean Brand Wordmark */}
        <button
          type="button"
          onClick={onBackToLibrary}
          className="flex items-center gap-2.5 cursor-pointer group select-none whitespace-nowrap shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1D1D1F] flex items-center justify-center text-white transition-colors group-hover:bg-[#007AFF]">
            <BookOpen className="w-4 h-4" />
          </div>
          <span
            className={`text-[17px] font-semibold tracking-tight ${
              readerTheme ? readerTheme.textPrimary : 'text-[#1D1D1F]'
            }`}
          >
            Read a Book
          </span>
        </button>

        {/* Right: Quick Search (desktop) + Right Sidebar Trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative hidden sm:block w-56 md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search books"
              className="w-full h-9 bg-black/[0.05] focus:bg-white border border-transparent focus:border-[#007AFF]/40 focus:ring-2 focus:ring-[#007AFF]/20 rounded-xl pl-8 pr-7 text-[13px] text-[#1D1D1F] placeholder-[#86868B] focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleSidebar}
            className={`min-h-[40px] px-3 rounded-xl flex items-center gap-1.5 text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isSidebarOpen
                ? 'bg-[#007AFF]/12 text-[#007AFF]'
                : 'bg-black/[0.05] hover:bg-black/[0.08] text-[#1D1D1F]'
            }`}
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          >
            <PanelRight className="w-4 h-4" />
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      </div>
    </header>
  );
};
