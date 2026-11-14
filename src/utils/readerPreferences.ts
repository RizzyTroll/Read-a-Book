export type ReaderTheme = 'warm-paper' | 'soft-sage' | 'evening-warm';
export type ReaderFontSize = 'normal' | 'large' | 'xlarge';

export interface ReaderPreferences {
  isReadableMode: boolean;
  theme: ReaderTheme;
  fontSize: ReaderFontSize;
}

const READER_PREFS_KEY = 'read_a_book_reader_prefs_v1';

export const DEFAULT_READER_PREFS: ReaderPreferences = {
  isReadableMode: false,
  theme: 'warm-paper',
  fontSize: 'large',
};

export function getStoredReaderPrefs(): ReaderPreferences {
  try {
    const raw = localStorage.getItem(READER_PREFS_KEY);
    if (!raw) return DEFAULT_READER_PREFS;
    const parsed = JSON.parse(raw);
    return {
      isReadableMode: Boolean(parsed.isReadableMode),
      theme: ['warm-paper', 'soft-sage', 'evening-warm'].includes(parsed.theme)
        ? parsed.theme
        : 'warm-paper',
      fontSize: ['normal', 'large', 'xlarge'].includes(parsed.fontSize)
        ? parsed.fontSize
        : 'large',
    };
  } catch {
    return DEFAULT_READER_PREFS;
  }
}

export function saveReaderPrefs(prefs: ReaderPreferences): void {
  try {
    localStorage.setItem(READER_PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save reader preferences:', err);
  }
}

export interface ReaderThemeClasses {
  pageBg: string;
  surfaceBg: string;
  subtleBg: string;
  hoverBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  greenText: string;
  greenBg: string;
  greenBorder: string;
  amberText: string;
  amberBg: string;
  amberBorder: string;
  isDark: boolean;
}

export function getReaderThemeClasses(prefs: ReaderPreferences): ReaderThemeClasses {
  if (!prefs.isReadableMode) {
    return {
      pageBg: 'bg-[#F5F5F7]',
      surfaceBg: 'bg-white',
      subtleBg: 'bg-[#F5F5F7]',
      hoverBg: 'hover:bg-[#EFEFF4]',
      border: 'border-black/[0.08]',
      textPrimary: 'text-[#1D1D1F]',
      textSecondary: 'text-[#3A3A3C]',
      textMuted: 'text-[#6E6E73]',
      accentText: 'text-[#007AFF]',
      accentBg: 'bg-[#007AFF]/[0.08]',
      accentBorder: 'border-[#007AFF]/20',
      greenText: 'text-[#248A3D]',
      greenBg: 'bg-[#34C759]/[0.12]',
      greenBorder: 'border-[#34C759]/25',
      amberText: 'text-[#B25000]',
      amberBg: 'bg-[#FF9500]/[0.10]',
      amberBorder: 'border-[#FF9500]/25',
      isDark: false,
    };
  }

  switch (prefs.theme) {
    case 'soft-sage':
      return {
        pageBg: 'bg-[#EAF0E8]',
        surfaceBg: 'bg-[#F3F7F2]',
        subtleBg: 'bg-[#E3EBE0]',
        hoverBg: 'hover:bg-[#DCE6D8]',
        border: 'border-[#C9D6C6]',
        textPrimary: 'text-[#1D281F]',
        textSecondary: 'text-[#334235]',
        textMuted: 'text-[#5A6B5C]',
        accentText: 'text-[#0066CC]',
        accentBg: 'bg-[#0066CC]/[0.08]',
        accentBorder: 'border-[#0066CC]/20',
        greenText: 'text-[#246E33]',
        greenBg: 'bg-[#DCEAD9]',
        greenBorder: 'border-[#B9D1B4]',
        amberText: 'text-[#875215]',
        amberBg: 'bg-[#EDEAD8]',
        amberBorder: 'border-[#D9D1B4]',
        isDark: false,
      };
    case 'evening-warm':
      return {
        pageBg: 'bg-[#1C1C1E]',
        surfaceBg: 'bg-[#2C2C2E]',
        subtleBg: 'bg-[#242426]',
        hoverBg: 'hover:bg-[#3A3A3C]',
        border: 'border-white/[0.1]',
        textPrimary: 'text-[#F5F5F7]',
        textSecondary: 'text-[#D1D1D6]',
        textMuted: 'text-[#98989D]',
        accentText: 'text-[#0A84FF]',
        accentBg: 'bg-[#0A84FF]/[0.16]',
        accentBorder: 'border-[#0A84FF]/30',
        greenText: 'text-[#30D158]',
        greenBg: 'bg-[#30D158]/[0.14]',
        greenBorder: 'border-[#30D158]/25',
        amberText: 'text-[#FF9F0A]',
        amberBg: 'bg-[#FF9F0A]/[0.14]',
        amberBorder: 'border-[#FF9F0A]/25',
        isDark: true,
      };
    case 'warm-paper':
    default:
      return {
        pageBg: 'bg-[#F8F3E8]',
        surfaceBg: 'bg-[#FCF9F2]',
        subtleBg: 'bg-[#F1EAD9]',
        hoverBg: 'hover:bg-[#EAE0CB]',
        border: 'border-[#E2D8C3]',
        textPrimary: 'text-[#2C241B]',
        textSecondary: 'text-[#4A3E32]',
        textMuted: 'text-[#756757]',
        accentText: 'text-[#0066CC]',
        accentBg: 'bg-[#0066CC]/[0.08]',
        accentBorder: 'border-[#0066CC]/20',
        greenText: 'text-[#248A3D]',
        greenBg: 'bg-[#E2ECDF]',
        greenBorder: 'border-[#C2D6BC]',
        amberText: 'text-[#8C5214]',
        amberBg: 'bg-[#F4E7CE]',
        amberBorder: 'border-[#E2CBA3]',
        isDark: false,
      };
  }
}

export function getReaderBodyTextClass(prefs: ReaderPreferences): string {
  if (!prefs.isReadableMode) {
    return 'text-sm sm:text-[15px] leading-relaxed';
  }
  switch (prefs.fontSize) {
    case 'normal':
      return 'text-[15px] sm:text-base leading-[1.75]';
    case 'xlarge':
      return 'text-[18px] sm:text-[19px] leading-[1.9]';
    case 'large':
    default:
      return 'text-base sm:text-[17px] leading-[1.85]';
  }
}
