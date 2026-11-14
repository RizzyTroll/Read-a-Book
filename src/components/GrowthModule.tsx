import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { ReadStatusMap } from '../utils/readingStorage';

interface GrowthModuleProps {
  readStatusMap: ReadStatusMap;
}

interface DailyPoint {
  dateKey: string;
  date: string;
  booksRead: number;
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export const GrowthModule: React.FC<GrowthModuleProps> = ({ readStatusMap }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const completedCount = useMemo(() => {
    return Object.values(readStatusMap).filter((r) => r.read).length;
  }, [readStatusMap]);

  // Build continuous daily timeline: every missed day is strictly 0
  const { timelineData, maxDaily } = useMemo(() => {
    const dailyMap = new Map<string, number>();
    let earliestTimestamp: number | null = null;

    for (const record of Object.values(readStatusMap)) {
      if (!record.read || !record.readAt) continue;
      const parsed = new Date(record.readAt);
      if (isNaN(parsed.getTime())) continue;

      const localDay = parseLocalDay(parsed);
      const key = toLocalDateKey(localDay);
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1);

      const ts = localDay.getTime();
      if (earliestTimestamp === null || ts < earliestTimestamp) {
        earliestTimestamp = ts;
      }
    }

    const today = parseLocalDay(new Date());
    const sixDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);

    const startDay =
      earliestTimestamp !== null && earliestTimestamp < sixDaysAgo.getTime()
        ? new Date(earliestTimestamp)
        : sixDaysAgo;

    const points: DailyPoint[] = [];
    let highestOnAnyDay = 0;

    const cursor = new Date(startDay.getTime());
    while (cursor.getTime() <= today.getTime()) {
      const key = toLocalDateKey(cursor);
      const count = dailyMap.get(key) || 0;
      if (count > highestOnAnyDay) highestOnAnyDay = count;

      points.push({
        dateKey: key,
        date: cursor.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        booksRead: count,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      timelineData: points,
      maxDaily: highestOnAnyDay,
    };
  }, [readStatusMap]);

  // Graph height scales dynamically with peak daily marked books
  const yMax = Math.max(1, maxDaily);
  const chartHeight = useMemo(() => {
    if (maxDaily === 0) return 140;
    return Math.min(360, 140 + maxDaily * 34);
  }, [maxDaily]);

  const yTicks = useMemo(() => {
    const step = yMax > 8 ? Math.ceil(yMax / 6) : 1;
    const ticks: number[] = [];
    for (let v = 0; v <= yMax; v += step) {
      ticks.push(v);
    }
    if (ticks[ticks.length - 1] !== yMax) {
      ticks.push(yMax);
    }
    return ticks;
  }, [yMax]);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-1">
      <div className="bg-white border border-black/[0.05] rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all">
        {/* Clean Apple Health-style header bar */}
        <div
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="flex items-center justify-between gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
              <TrendingUp className="w-4 h-4 stroke-[2.2]" />
            </div>
            <h2 className="text-[15px] sm:text-base font-semibold text-[#1D1D1F] tracking-tight">
              Growth
            </h2>
            <span className="text-[13px] text-[#6E6E73] tabular-nums">
              · {completedCount} read
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed((prev) => !prev);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[12px] font-medium text-[#1D1D1F] transition-colors cursor-pointer"
          >
            <span>{isCollapsed ? 'Show' : 'Hide'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Continuous Curve Chart */}
        {!isCollapsed && (
          <div className="pt-4 mt-3 border-t border-black/[0.06]">
            <div className="w-full transition-all duration-300">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart
                  data={timelineData}
                  margin={{ top: 10, right: 12, left: -24, bottom: 2 }}
                >
                  <defs>
                    <linearGradient id="appleGrowthCurveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#007AFF" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#007AFF" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#86868B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                    minTickGap={16}
                  />
                  <YAxis
                    stroke="#86868B"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(0,0,0,0.08)' }}
                    allowDecimals={false}
                    domain={[0, yMax]}
                    ticks={yTicks}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as DailyPoint;
                        return (
                          <div className="bg-[#1D1D1F] text-white px-3 py-1.5 rounded-xl text-xs shadow-lg">
                            <p className="text-[11px] text-[#AEAEB2]">
                              {data.date}
                            </p>
                            <p className="font-semibold text-[#64D2FF] tabular-nums">
                              {data.booksRead} {data.booksRead === 1 ? 'book' : 'books'}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="booksRead"
                    name="Books Marked"
                    stroke="#007AFF"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#appleGrowthCurveGrad)"
                    dot={{ r: 3.5, fill: '#007AFF', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                    activeDot={{ r: 5.5, fill: '#007AFF', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
