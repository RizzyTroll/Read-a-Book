import { Book, BookCategory } from '../types';

export function formatBookMarkdown(book: Book): string {
  let md = `**${book.title} — ${book.author}**\n`;
  md += `*${book.thesis}*\n\n`;

  md += `**Summary**\n`;
  book.structure.forEach((part) => {
    md += `- **Part ${part.partNumber}: ${part.partTitle}**\n`;
    md += `  - ${part.keyIdea}\n`;
    if (part.realLifeExample) {
      md += `  - Example: ${part.realLifeExample}\n`;
    }
    md += `  - Takeaway: ${part.whyItMatters}\n`;
  });

  md += `\n**Key Takeaways**\n`;
  book.keyInsights.forEach((insight) => {
    md += `- ${insight}\n`;
  });

  if (book.dailyImplementation && book.dailyImplementation.length > 0) {
    md += `\n**Implement in Daily Life**\n`;
    book.dailyImplementation.forEach((step) => {
      md += `- ${step}\n`;
    });
  }

  md += `\n**Strengths & Limits**\n`;
  md += `${book.strengthWeakness}\n`;

  return md;
}

export function getCategoryBadgeStyle(category: BookCategory): {
  bg: string;
  text: string;
  border: string;
  accent: string;
} {
  switch (category) {
    case 'Investing':
    case 'Finance':
      return {
        bg: 'bg-[#34C759]/10',
        text: 'text-[#248A3D]',
        border: 'border-[#34C759]/25',
        accent: '#248A3D',
      };
    case 'Entrepreneurship':
    case 'Business':
      return {
        bg: 'bg-[#007AFF]/10',
        text: 'text-[#007AFF]',
        border: 'border-[#007AFF]/25',
        accent: '#007AFF',
      };
    default:
      return {
        bg: 'bg-[#F2F2F7]',
        text: 'text-[#6E6E73]',
        border: 'border-black/[0.08]',
        accent: '#6E6E73',
      };
  }
}

export interface CoverDesign {
  bgGradient: string;
  textColor: string;
  authorColor: string;
  accentBorder: string;
  motif: string;
  stageBg: string;
  motifStroke: string;
  motifFill: string;
}

export function getBookCoverDesign(title: string, category: BookCategory): CoverDesign {
  const t = title.toLowerCase();

  if (t.includes('psychology of money')) {
    return {
      bgGradient: 'from-[#1C4D8D] to-[#0F2C59]',
      textColor: '#FFFFFF',
      authorColor: '#D6E4FF',
      accentBorder: 'rgba(255,255,255,0.22)',
      motif: 'coins',
      stageBg: 'from-[#EFF4FC] to-[#E3ECFA]',
      motifStroke: '#1C4D8D',
      motifFill: '#9DBDF2',
    };
  }

  if (t.includes('atomic habits')) {
    return {
      bgGradient: 'from-[#1F6E58] to-[#114234]',
      textColor: '#FFFFFF',
      authorColor: '#CBEADF',
      accentBorder: 'rgba(255,255,255,0.22)',
      motif: 'orbit',
      stageBg: 'from-[#EDF7F3] to-[#DFF0E8]',
      motifStroke: '#1F6E58',
      motifFill: '#93D1BD',
    };
  }

  if (t.includes('zero to one')) {
    return {
      bgGradient: 'from-[#2C2C2E] to-[#141416]',
      textColor: '#FFFFFF',
      authorColor: '#D1D1D6',
      accentBorder: 'rgba(255,255,255,0.2)',
      motif: 'monolith',
      stageBg: 'from-[#F0F1F5] to-[#E5E7EE]',
      motifStroke: '#2C2C2E',
      motifFill: '#AEAEB2',
    };
  }

  if (t.includes('thinking, fast and slow') || t.includes('thinking fast and slow')) {
    return {
      bgGradient: 'from-[#B8453B] to-[#7D261F]',
      textColor: '#FFFFFF',
      authorColor: '#FADAD7',
      accentBorder: 'rgba(255,255,255,0.22)',
      motif: 'duality',
      stageBg: 'from-[#FCF1F0] to-[#F7E2E0]',
      motifStroke: '#B8453B',
      motifFill: '#E6A19B',
    };
  }

  if (t.includes('intelligent investor')) {
    return {
      bgGradient: 'from-[#265B43] to-[#163829]',
      textColor: '#FFFFFF',
      authorColor: '#D2E8DD',
      accentBorder: 'rgba(255,255,255,0.25)',
      motif: 'crest',
      stageBg: 'from-[#EEF6F2] to-[#E0EDE6]',
      motifStroke: '#265B43',
      motifFill: '#96C7B0',
    };
  }

  if (t.includes('principles')) {
    return {
      bgGradient: 'from-[#3A4A63] to-[#202B3D]',
      textColor: '#FFFFFF',
      authorColor: '#D3DCEB',
      accentBorder: 'rgba(255,255,255,0.22)',
      motif: 'matrix',
      stageBg: 'from-[#EFF2F7] to-[#E2E8F2]',
      motifStroke: '#3A4A63',
      motifFill: '#9FB1CC',
    };
  }

  if (t.includes('high output')) {
    return {
      bgGradient: 'from-[#4F469C] to-[#2F2969]',
      textColor: '#FFFFFF',
      authorColor: '#DDD9FA',
      accentBorder: 'rgba(255,255,255,0.22)',
      motif: 'gears',
      stageBg: 'from-[#F2F1FC] to-[#E6E3FA]',
      motifStroke: '#4F469C',
      motifFill: '#ABA4EA',
    };
  }

  if (t.includes('lean startup')) {
    return {
      bgGradient: 'from-[#0066CC] to-[#004499]',
      textColor: '#FFFFFF',
      authorColor: '#D4E8FF',
      accentBorder: 'rgba(255,255,255,0.22)',
      motif: 'loop',
      stageBg: 'from-[#EDF5FF] to-[#DCEBFF]',
      motifStroke: '#0066CC',
      motifFill: '#8AC0FA',
    };
  }

  if (t.includes('poor charlie') || t.includes('munger')) {
    return {
      bgGradient: 'from-[#7A4B2A] to-[#4F2D15]',
      textColor: '#FFFFFF',
      authorColor: '#F2DFCF',
      accentBorder: 'rgba(255,255,255,0.24)',
      motif: 'lattice',
      stageBg: 'from-[#F9F3EE] to-[#F1E6DC]',
      motifStroke: '#7A4B2A',
      motifFill: '#CFA98E',
    };
  }

  if (t.includes('hard thing')) {
    return {
      bgGradient: 'from-[#36363A] to-[#1D1D20]',
      textColor: '#FFFFFF',
      authorColor: '#D4D4DA',
      accentBorder: 'rgba(255,255,255,0.22)',
      motif: 'diagonal',
      stageBg: 'from-[#F1F1F4] to-[#E5E5EA]',
      motifStroke: '#36363A',
      motifFill: '#AEAEB5',
    };
  }

  // Fallback palettes harmonized to Apple colors
  switch (category) {
    case 'Investing':
      return {
        bgGradient: 'from-[#1D5B8C] to-[#10395B]',
        textColor: '#FFFFFF',
        authorColor: '#D4E9FA',
        accentBorder: 'rgba(255,255,255,0.22)',
        motif: 'coins',
        stageBg: 'from-[#EEF5FB] to-[#E1EDF7]',
        motifStroke: '#1D5B8C',
        motifFill: '#95C1E4',
      };
    case 'Finance':
      return {
        bgGradient: 'from-[#236B4B] to-[#13422D]',
        textColor: '#FFFFFF',
        authorColor: '#D2EFE1',
        accentBorder: 'rgba(255,255,255,0.22)',
        motif: 'crest',
        stageBg: 'from-[#EDF7F2] to-[#DFF0E8]',
        motifStroke: '#236B4B',
        motifFill: '#8FC8AE',
      };
    case 'Entrepreneurship':
      return {
        bgGradient: 'from-[#0A64C4] to-[#064182]',
        textColor: '#FFFFFF',
        authorColor: '#D6E9FF',
        accentBorder: 'rgba(255,255,255,0.22)',
        motif: 'loop',
        stageBg: 'from-[#EDF5FF] to-[#DFECFE]',
        motifStroke: '#0A64C4',
        motifFill: '#8DBDF2',
      };
    case 'Personal Development':
      return {
        bgGradient: 'from-[#5E489E] to-[#3B2B6B]',
        textColor: '#FFFFFF',
        authorColor: '#E5DDFB',
        accentBorder: 'rgba(255,255,255,0.22)',
        motif: 'orbit',
        stageBg: 'from-[#F3F0FA] to-[#E8E2F7]',
        motifStroke: '#5E489E',
        motifFill: '#B3A3E0',
      };
    case 'Self-Growth':
      return {
        bgGradient: 'from-[#A6424B] to-[#6E262C]',
        textColor: '#FFFFFF',
        authorColor: '#FADEE1',
        accentBorder: 'rgba(255,255,255,0.22)',
        motif: 'duality',
        stageBg: 'from-[#FBF0F1] to-[#F5E1E3]',
        motifStroke: '#A6424B',
        motifFill: '#DC9BA1',
      };
    default:
      return {
        bgGradient: 'from-[#3A3A3C] to-[#222224]',
        textColor: '#FFFFFF',
        authorColor: '#E5E5EA',
        accentBorder: 'rgba(255,255,255,0.22)',
        motif: 'monolith',
        stageBg: 'from-[#F2F2F7] to-[#E5E5EA]',
        motifStroke: '#3A3A3C',
        motifFill: '#AEAEB2',
      };
  }
}
