import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import {
  CheckCircle2,
  TrendingUp,
  Award,
  Clock,
  BookOpen,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { Book } from '../types';
import { ReadStatusMap } from '../utils/readingStorage';

interface ReadingDashboardProps {
  books: Book[];
  readStatusMap: ReadStatusMap;
  onMarkRead: (bookId: string, category: string) => void;
  onSelectBook: (bookId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Investing: '#D9822B', // warm ochre
  Finance: '#507D54', // forest sage
  Business: '#475467', // deep warm slate
  Entrepreneurship: '#C86242', // terracotta
  'Personal Development': '#855B8B', // muted plum
  'Self-Growth': '#B84D47', // dusty rose
};

export const ReadingDashboard: React.FC<ReadingDashboardProps> = ({
  books,
  readStatusMap,
  onMarkRead,
}) => {
  const [chartView, setChartView] = useState<'cumulative' | 'by-category'>('cumulative');

  // Compute metrics
  const totalReadCount = useMemo(() => {
    return Object.values(readStatusMap).filter((r) => r.read).length;
  }, [readStatusMap]);

  const readPercentage = books.length > 0 ? Math.round((totalReadCount / books.length) * 100) : 0;

  const totalMinutesRead = useMemo(() => {
    return books.reduce((acc, b) => {
      return readStatusMap[b.id]?.read ? acc + (b.readingTimeMin || 8) : acc;
    }, 0);
  }, [books, readStatusMap]);

  // Books read per category breakdown
  const categoryStats = useMemo(() => {
    const cats: Record<string, { total: number; read: number }> = {};
    const validCats = [
      'Investing',
      'Finance',
      'Business',
      'Entrepreneurship',
      'Personal Development',
      'Self-Growth',
    ];

    validCats.forEach((c) => {
      cats[c] = { total: 0, read: 0 };
    });

    books.forEach((b) => {
      if (!cats[b.category]) {
        cats[b.category] = { total: 0, read: 0 };
      }
      cats[b.category].total += 1;
      if (readStatusMap[b.id]?.read) {
        cats[b.category].read += 1;
      }
    });

    return Object.entries(cats).map(([name, stat]) => ({
      name,
      total: stat.total,
      read: stat.read,
      rate: stat.total > 0 ? Math.round((stat.read / stat.total) * 100) : 0,
      color: CATEGORY_COLORS[name] || '#7F756D',
    }));
  }, [books, readStatusMap]);

  // Most read category
  const topCategory = useMemo(() => {
    const sorted = [...categoryStats].sort((a, b) => b.read - a.read);
    return sorted[0]?.read > 0 ? sorted[0].name : 'None yet';
  }, [categoryStats]);

  // TIME-SERIES: Number of books read per category over time
  const timeSeriesData = useMemo(() => {
    const readEntries = Object.values(readStatusMap)
      .filter((r) => r.read && r.readAt)
      .map((r) => {
        const book = books.find((b) => b.id === r.bookId);
        return {
          ...r,
          dateStr: new Date(r.readAt).toISOString().split('T')[0],
          category: book ? book.category : r.category || 'Business',
        };
      })
      .sort((a, b) => new Date(a.readAt).getTime() - new Date(b.readAt).getTime());

    if (readEntries.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      return [
        {
          date: today,
          Investing: 0,
          Finance: 0,
          Business: 0,
          Entrepreneurship: 0,
          'Personal Development': 0,
          'Self-Growth': 0,
          total: 0,
        },
      ];
    }

    const uniqueDates = Array.from(new Set(readEntries.map((e) => e.dateStr)));
    const runningCounts: Record<string, number> = {
      Investing: 0,
      Finance: 0,
      Business: 0,
      Entrepreneurship: 0,
      'Personal Development': 0,
      'Self-Growth': 0,
    };

    let cumulativeTotal = 0;

    return uniqueDates.map((d) => {
      const entriesOnDate = readEntries.filter((e) => e.dateStr === d);
      entriesOnDate.forEach((e) => {
        if (runningCounts[e.category] !== undefined) {
          runningCounts[e.category] += 1;
        } else {
          runningCounts[e.category] = 1;
        }
        cumulativeTotal += 1;
      });

      return {
        date: d,
        Investing: runningCounts['Investing'] || 0,
        Finance: runningCounts['Finance'] || 0,
        Business: runningCounts['Business'] || 0,
        Entrepreneurship: runningCounts['Entrepreneurship'] || 0,
        'Personal Development': runningCounts['Personal Development'] || 0,
        'Self-Growth': runningCounts['Self-Growth'] || 0,
        total: cumulativeTotal,
      };
    });
  }, [readStatusMap, books]);

  return (
    <div className="rounded-3xl border border-[#ECE6DE] bg-white p-5 sm:p-7 space-y-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#ECE6DE] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EFF5F0] border border-[#C8DEC9] flex items-center justify-center text-[#507D54]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-[#241E1A] font-editorial tracking-tight">
                Reading Mastery & Category Velocity
              </h3>
              <span className="text-[10px] font-mono-code uppercase bg-[#EFF5F0] text-[#2E5E35] border border-[#C8DEC9] px-2 py-0.5 rounded-full">
                Saved in Storage
              </span>
            </div>
            <p className="text-xs text-[#7F756D]">
              Visualize completion trajectory, category distribution, and time logged
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-full border border-[#ECE6DE] text-xs self-start sm:self-auto">
          <button
            onClick={() => setChartView('cumulative')}
            className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
              chartView === 'cumulative'
                ? 'bg-white text-[#241E1A] shadow-2xs font-semibold'
                : 'text-[#7F756D] hover:text-[#241E1A]'
            }`}
          >
            Category Growth
          </button>
          <button
            onClick={() => setChartView('by-category')}
            className={`px-3 py-1 rounded-full font-medium transition-all cursor-pointer ${
              chartView === 'by-category'
                ? 'bg-white text-[#241E1A] shadow-2xs font-semibold'
                : 'text-[#7F756D] hover:text-[#241E1A]'
            }`}
          >
            By Category
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#ECE6DE] space-y-1">
          <div className="flex items-center justify-between text-[#7F756D] text-xs">
            <span>Books Completed</span>
            <CheckCircle2 className="w-4 h-4 text-[#507D54]" />
          </div>
          <div className="text-2xl font-bold text-[#241E1A] font-mono-code">
            {totalReadCount}{' '}
            <span className="text-xs text-[#9C9388] font-normal">/ {books.length}</span>
          </div>
          <div className="text-[11px] text-[#507D54] font-medium">
            {readPercentage}% of library finished
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#ECE6DE] space-y-1">
          <div className="flex items-center justify-between text-[#7F756D] text-xs">
            <span>Deep Reading Logged</span>
            <Clock className="w-4 h-4 text-[#C86242]" />
          </div>
          <div className="text-2xl font-bold text-[#241E1A] font-mono-code">
            {totalMinutesRead}{' '}
            <span className="text-xs text-[#9C9388] font-normal">mins</span>
          </div>
          <div className="text-[11px] text-[#C86242] font-medium">
            ~{(totalMinutesRead / 60).toFixed(1)} hours of dense synthesis
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#ECE6DE] space-y-1">
          <div className="flex items-center justify-between text-[#7F756D] text-xs">
            <span>Top Category Focus</span>
            <Award className="w-4 h-4 text-[#855B8B]" />
          </div>
          <div className="text-base sm:text-lg font-bold text-[#241E1A] truncate line-clamp-1">
            {topCategory}
          </div>
          <div className="text-[11px] text-[#7F756D] font-medium">
            Highest completion density
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#ECE6DE] space-y-1">
          <div className="flex items-center justify-between text-[#7F756D] text-xs">
            <span>Unread in Library</span>
            <BookOpen className="w-4 h-4 text-[#5B524A]" />
          </div>
          <div className="text-2xl font-bold text-[#241E1A] font-mono-code">
            {books.length - totalReadCount}
          </div>
          <div className="text-[11px] text-[#5B524A] font-medium">
            Ready for your next deep-dive
          </div>
        </div>
      </div>

      {/* Main Chart Visualization */}
      <div className="p-5 rounded-2xl bg-[#FAF8F5] border border-[#ECE6DE] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono-code uppercase font-semibold text-[#5B524A] flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#C86242]" />
            {chartView === 'cumulative'
              ? 'Timeline: Cumulative Books Read Per Category'
              : 'Category Comparison: Read vs. Total in Library'}
          </span>
          <span className="text-[11px] text-[#9C9388] font-mono-code">
            Recharts Visualization
          </span>
        </div>

        {chartView === 'cumulative' ? (
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                    <linearGradient key={cat} id={`grad-${cat}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECE6DE" />
                <XAxis dataKey="date" stroke="#9C9388" fontSize={11} tickLine={false} />
                <YAxis stroke="#9C9388" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#ECE6DE',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(36,30,26,0.08)',
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                {Object.keys(CATEGORY_COLORS).map((cat) => (
                  <Area
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    stackId="1"
                    stroke={CATEGORY_COLORS[cat]}
                    fill={`url(#grad-${cat})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECE6DE" />
                <XAxis dataKey="name" stroke="#9C9388" fontSize={11} tickLine={false} />
                <YAxis stroke="#9C9388" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#ECE6DE',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(36,30,26,0.08)',
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} books`,
                    name === 'read' ? 'Completed' : 'Total Available',
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="read" name="Completed" fill="#507D54" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total" name="Total in Library" fill="#D1C9BE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {totalReadCount === 0 && (
          <div className="p-3.5 rounded-xl bg-[#FAF1EC] border border-[#EBC8BA] text-xs text-[#A04627] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C86242] flex-shrink-0" />
              <span>
                Click <strong>"Mark as Read"</strong> on any book cover to see your timeline and category chart plot live!
              </span>
            </div>
            {books.length > 0 && (
              <button
                onClick={() => onMarkRead(books[0].id, books[0].category)}
                className="px-3 py-1 rounded-full bg-[#C86242] hover:bg-[#B35234] text-white font-semibold text-xs whitespace-nowrap cursor-pointer transition-colors"
              >
                Mark Day 1 as Read
              </button>
            )}
          </div>
        )}
      </div>

      {/* Category Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categoryStats.map((cat) => (
          <div
            key={cat.name}
            className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#ECE6DE] space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#241E1A] flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </span>
              <span className="font-mono-code text-[#7F756D] text-[11px]">
                {cat.read} / {cat.total} ({cat.rate}%)
              </span>
            </div>
            <div className="w-full bg-[#E8E2D8] h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${cat.rate}%`,
                  backgroundColor: cat.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
