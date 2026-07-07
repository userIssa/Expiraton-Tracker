'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface LossProduct {
  name: string;
  category: string;
  unitsLost: number;
  valueImpact: number;
}

interface TrendItem {
  month: string;
  value: number;
}

interface CategoryValue {
  category: string;
  value: number;
}

interface AnalyticsData {
  valueAtRisk: number;
  totalClearedUnits: number;
  totalLostValue: number;
  avgTimeToClearDays: number;
  urgencyBreakdown: {
    total: number;
    critical: number;
    warning: number;
    safe: number;
    criticalPercent: number;
    warningPercent: number;
    safePercent: number;
  };
  categoryValues: CategoryValue[];
  lossTrend: TrendItem[];
  topLossProducts: LossProduct[];
}

const Naira = () => <span className="font-sans mr-0.5 text-[0.82em] opacity-80 select-none font-semibold">₦</span>;

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load analytics data');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8 bg-surface-bright">
          <p className="text-on-surface-variant font-medium">Loading analytics dashboard...</p>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-8 bg-surface-bright">
          <div className="bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-4">
            {error || 'Failed to load dashboard'}
          </div>
        </main>
      </div>
    );
  }

  // 1. Calculate heights for category bar chart
  const maxCategoryValue = Math.max(...data.categoryValues.map((c) => c.value), 100);
  
  // 2. Conic gradient styling for Donut chart
  const critDeg = Math.round(data.urgencyBreakdown.criticalPercent * 3.6);
  const warnDeg = Math.round(data.urgencyBreakdown.warningPercent * 3.6);
  const donutBackground = `conic-gradient(
    #6e0000 0deg ${critDeg}deg, 
    #fed65b ${critDeg}deg ${critDeg + warnDeg}deg, 
    #146c2e ${critDeg + warnDeg}deg 360deg
  )`;

  // 3. SVG Line points calculation for Trend
  const maxTrendVal = Math.max(...data.lossTrend.map((t) => t.value), 100);
  const svgWidth = 500;
  const svgHeight = 150;
  const padding = 25;
  
  const linePoints = data.lossTrend.map((t, idx) => {
    const x = padding + (idx * (svgWidth - padding * 2)) / 5;
    const y = svgHeight - padding - (t.value * (svgHeight - padding * 2)) / maxTrendVal;
    return { x, y, val: t.value };
  });

  const polylinePoints = linePoints.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = linePoints.length > 0
    ? `M ${linePoints[0].x},${svgHeight - padding} ` +
      linePoints.map((p) => `L ${p.x},${p.y}`).join(' ') +
      ` L ${linePoints[linePoints.length - 1].x},${svgHeight - padding} Z`
    : '';

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto overflow-hidden bg-surface-bright relative p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <header className="flex justify-between items-end border-b border-outline-variant/30 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Analytics Overview</h1>
            <p className="text-sm text-on-surface-variant font-medium">Real-time status of catalog stock value at risk and waste metrics.</p>
          </div>
          <div className="text-xs text-on-surface-variant font-mono uppercase font-bold tracking-wider">
            Last Updated: Just Now
          </div>
        </header>

        {/* Summary KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Value at Risk */}
          <div className="bg-surface border border-outline-variant p-4 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-secondary transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-urgency-red-text"></div>
            <div className="mb-2 pl-2">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">Value at Risk</span>
              <div className="text-3xl font-bold text-urgency-red-text mt-1 flex items-baseline">
                <Naira />{data.valueAtRisk.toLocaleString()}
              </div>
            </div>
            <div className="pl-2 text-xs text-on-surface-variant font-medium">
              Active stock near expiration
            </div>
          </div>

          {/* Card 2: Total Saved */}
          <div className="bg-surface border border-outline-variant p-4 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-secondary transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-urgency-green-text"></div>
            <div className="mb-2 pl-2">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">Total Saved / Cleared</span>
              <div className="text-3xl font-bold text-on-surface mt-1">
                {data.totalClearedUnits.toLocaleString()}{' '}
                <span className="text-xs text-on-surface-variant font-normal font-mono">units</span>
              </div>
            </div>
            <div className="pl-2 text-xs text-on-surface-variant font-medium">
              Sold/used before expiry
            </div>
          </div>

          {/* Card 3: Total Lost */}
          <div className="bg-surface border border-outline-variant p-4 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-secondary transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-urgency-maroon-text"></div>
            <div className="mb-2 pl-2">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">Total Lost (Wasted)</span>
              <div className="text-3xl font-bold text-urgency-maroon-text mt-1 flex items-baseline">
                <Naira />{data.totalLostValue.toLocaleString()}
              </div>
            </div>
            <div className="pl-2 text-xs text-on-surface-variant font-medium">
              Expired or discarded items
            </div>
          </div>

          {/* Card 4: Avg Time to Clear */}
          <div className="bg-surface border border-outline-variant p-4 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-xs hover:border-secondary transition-colors">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-urgency-yellow-text"></div>
            <div className="mb-2 pl-2">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">Avg Time to Clear</span>
              <div className="text-3xl font-bold text-on-surface mt-1">
                {data.avgTimeToClearDays}{' '}
                <span className="text-xs text-on-surface-variant font-normal font-mono">days</span>
              </div>
            </div>
            <div className="pl-2 text-xs text-on-surface-variant font-medium">
              From register to clearance
            </div>
          </div>
        </section>

        {/* Charts & Graphs Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Bar Chart: Expired by Category */}
          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <h2 className="text-base font-bold text-on-surface mb-6 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
              Wasted Stock by Category
            </h2>
            
            <div className="h-48 flex items-end justify-around gap-2 pb-6 border-b border-outline-variant/30">
              {data.categoryValues.map((cat) => {
                const heightPercent = Math.max(Math.round((cat.value / maxCategoryValue) * 100), 5);
                return (
                  <div key={cat.category} className="w-full max-w-[40px] flex flex-col items-center justify-end relative cursor-pointer h-full">
                    <div 
                      className="w-full bg-primary/85 rounded-t hover:bg-primary transition-all duration-300 relative flex justify-center" 
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute -top-7 bg-primary text-on-primary text-[9px] font-bold font-mono px-1.5 py-0.5 rounded whitespace-nowrap z-10 shadow-sm flex items-center">
                        <span className="font-sans mr-0.5 text-[0.85em] opacity-90 select-none">₦</span>{cat.value}
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-on-surface-variant mt-2 absolute -bottom-5 font-mono truncate max-w-[45px]" title={cat.category}>
                      {cat.category.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Line Chart: Loss Trend */}
          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">show_chart</span>
              Loss Trend (6-Month Value)
            </h2>

            <div className="w-full">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
                <defs>
                  <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ba1a1a" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#ba1a1a" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#eeeeee" strokeWidth="1" />
                <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="#eeeeee" strokeWidth="1" />
                <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#cccccc" strokeWidth="1" />

                {/* Area under curve */}
                {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

                {/* Line */}
                {polylinePoints && (
                  <polyline
                    fill="none"
                    stroke="#ba1a1a"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                )}

                {/* Circles for values */}
                {linePoints.map((pt, idx) => (
                  <g key={idx} className="group cursor-pointer">
                    <circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#ba1a1a" strokeWidth="2.5" />
                    {/* Tooltip */}
                    <text
                      x={pt.x}
                      y={pt.y - 10}
                      textAnchor="middle"
                      className="fill-on-surface font-mono font-bold text-[10px] opacity-0 group-hover:opacity-100 transition-opacity bg-surface"
                    >
                      <tspan fontFamily="sans-serif" fontWeight="600" opacity="0.8">₦</tspan>{pt.val}
                    </text>
                  </g>
                ))}
              </svg>

              <div className="flex justify-between px-6 mt-1 text-[10px] font-bold text-on-surface-variant font-mono">
                {data.lossTrend.map((t) => (
                  <span key={t.month}>{t.month}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Donut Chart: Urgency breakdown */}
          <div className="bg-surface border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col justify-between">
            <h2 className="text-base font-bold text-on-surface mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">pie_chart</span>
              Urgency Breakdown (Units)
            </h2>

            <div className="flex flex-col items-center">
              {/* Donut */}
              <div 
                className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-xs" 
                style={{ background: donutBackground }}
              >
                {/* Center overlay cutout */}
                <div className="absolute w-24 h-24 bg-surface rounded-full flex flex-col items-center justify-center shadow-inner">
                  <span className="text-xl font-bold text-on-surface">{data.urgencyBreakdown.total}</span>
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase font-mono">Total Units</span>
                </div>
              </div>

              {/* Legend details */}
              <div className="w-full mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-urgency-maroon-text"></div>
                    <span className="font-semibold text-on-surface">Critical (Expired/Urgent)</span>
                  </div>
                  <span className="font-mono text-on-surface-variant font-semibold">
                    {data.urgencyBreakdown.criticalPercent}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-urgency-yellow-text"></div>
                    <span className="font-semibold text-on-surface">Warning (Monitor)</span>
                  </div>
                  <span className="font-mono text-on-surface-variant font-semibold">
                    {data.urgencyBreakdown.warningPercent}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-urgency-green-text"></div>
                    <span className="font-semibold text-on-surface">Safe (Fresh)</span>
                  </div>
                  <span className="font-mono text-on-surface-variant font-semibold">
                    {data.urgencyBreakdown.safePercent}%
                  </span>
                </div>
              </div>
            </div>
          </div>

        </section>

        {/* Data Table: Top 5 Loss Products */}
        <section className="bg-surface border border-outline-variant rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low">
            <h2 className="text-base font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">trending_down</span>
              Top 5 Waste / Loss Products
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-surface-container-low/55 border-b border-outline-variant">
                  <th className="p-3 font-mono text-[10px] font-bold text-on-surface-variant uppercase w-12 text-center">#</th>
                  <th className="p-3 font-mono text-[10px] font-bold text-on-surface-variant uppercase">Product Name</th>
                  <th className="p-3 font-mono text-[10px] font-bold text-on-surface-variant uppercase w-32">Category</th>
                  <th className="p-3 font-mono text-[10px] font-bold text-on-surface-variant uppercase text-right w-36">Units Lost</th>
                  <th className="p-3 font-mono text-[10px] font-bold text-on-surface-variant uppercase text-right w-44">Value Impact</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-outline-variant/30 text-on-surface">
                {data.topLossProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-on-surface-variant font-medium">
                      No wasted products recorded yet. Perfect inventory health!
                    </td>
                  </tr>
                ) : (
                  data.topLossProducts.map((p, idx) => (
                    <tr 
                      key={idx}
                      className="hover:bg-surface-container-low/40 transition-colors group border-l-4 border-transparent hover:border-secondary"
                    >
                      <td className="p-3 text-center text-on-surface-variant group-hover:text-secondary font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-semibold text-on-surface">
                        {p.name}
                      </td>
                      <td className="p-3 font-mono text-xs text-on-surface-variant">
                        {p.category}
                      </td>
                      <td className="p-3 text-right font-semibold">
                        {p.unitsLost}
                      </td>
                      <td className="p-3 text-right text-urgency-red-text font-bold">
                        <Naira />{p.valueImpact.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
