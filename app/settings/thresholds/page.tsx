'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface Threshold {
  _id: string;
  category: string;
  greenMinDays: number;
  yellowMinDays: number;
  orangeMinDays: number;
  redMinDays: number;
}

export default function CategoryThresholdsPage() {
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [green, setGreen] = useState('');
  const [yellow, setYellow] = useState('');
  const [orange, setOrange] = useState('');
  const [red, setRed] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');

  const fetchThresholds = () => {
    fetch('/api/settings/thresholds')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load thresholds');
        return res.json();
      })
      .then((data) => {
        setThresholds(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchThresholds();
  }, []);

  const startEdit = (t: Threshold) => {
    setEditingId(t._id);
    setEditCategoryName(t.category);
    setGreen(String(t.greenMinDays));
    setYellow(String(t.yellowMinDays));
    setOrange(String(t.orangeMinDays));
    setRed(String(t.redMinDays));
    setSuccess('');
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const g = Number(green);
    const y = Number(yellow);
    const o = Number(orange);
    const r = Number(red);

    // Validate relative order
    if (!(g > y && y > o && o > r && r >= 0)) {
      setError('Order constraint violation: Green must be greater than Yellow, Yellow greater than Orange, and Orange greater than Red (G > Y > O > R >= 0).');
      return;
    }

    try {
      const res = await fetch('/api/settings/thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: editingId,
          category: editCategoryName,
          greenMinDays: g,
          yellowMinDays: y,
          orangeMinDays: o,
          redMinDays: r,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save thresholds');

      setSuccess(`Threshold settings for "${editCategoryName}" updated successfully!`);
      setEditingId(null);
      fetchThresholds();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto overflow-hidden bg-surface-bright relative p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Category Expiry Thresholds</h1>
          <p className="text-sm text-on-surface-variant font-medium">Configure days-to-expiry alert limits per category. Changing offsets updates the colors of active batches.</p>
        </div>

        {error && (
          <div className="bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-sm flex items-center gap-2 max-w-4xl">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-urgency-green-bg border border-urgency-green-border text-urgency-green-text rounded p-3 text-sm flex items-center gap-2 max-w-4xl">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {loading ? (
          <p className="text-on-surface-variant font-medium">Loading settings...</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl">
            {/* List of configurations */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary fill-icon">tune</span>
                Operational Categories
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {thresholds.map((t) => (
                  <div 
                    key={t._id}
                    className="bg-surface border border-outline-variant p-5 rounded-xl shadow-xs flex flex-col justify-between relative overflow-hidden group"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-on-surface">{t.category}</h3>
                        <p className="text-xs text-on-surface-variant font-medium">Active monitoring limits</p>
                      </div>
                      
                      <button
                        onClick={() => startEdit(t)}
                        className="px-3 py-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold rounded cursor-pointer transition-colors"
                      >
                        Edit
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs pt-2">
                      <div className="bg-urgency-green-bg/50 border border-urgency-green-border p-2 rounded">
                        <span className="block font-mono font-bold text-[10px] text-urgency-green-text uppercase">Fresh</span>
                        <span className="text-sm font-bold text-on-surface font-mono">&gt; {t.greenMinDays}d</span>
                      </div>
                      <div className="bg-urgency-yellow-bg border border-urgency-yellow-border p-2 rounded">
                        <span className="block font-mono font-bold text-[10px] text-urgency-yellow-text uppercase">Monitor</span>
                        <span className="text-sm font-bold text-on-surface font-mono">{t.yellowMinDays}d - {t.greenMinDays}d</span>
                      </div>
                      <div className="bg-urgency-orange-bg border border-urgency-orange-border p-2 rounded">
                        <span className="block font-mono font-bold text-[10px] text-urgency-orange-text uppercase">Watch</span>
                        <span className="text-sm font-bold text-on-surface font-mono">{t.orangeMinDays}d - {t.yellowMinDays}d</span>
                      </div>
                      <div className="bg-urgency-red-bg border border-urgency-red-border p-2 rounded">
                        <span className="block font-mono font-bold text-[10px] text-urgency-red-text uppercase">Urgent</span>
                        <span className="text-sm font-bold text-on-surface font-mono">&lt; {t.redMinDays}d</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Editing form */}
            {editingId && (
              <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden space-y-4 shadow-xs h-fit animate-scale-up">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary fill-icon">edit</span>
                  Edit Category: {editCategoryName}
                </h2>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                        Fresh Minimum (Days)
                      </label>
                      <input
                        type="number"
                        value={green}
                        onChange={(e) => setGreen(e.target.value)}
                        required
                        min={0}
                        className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                        Monitor Level (Days)
                      </label>
                      <input
                        type="number"
                        value={yellow}
                        onChange={(e) => setYellow(e.target.value)}
                        required
                        min={0}
                        className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                        Watch Level (Days)
                      </label>
                      <input
                        type="number"
                        value={orange}
                        onChange={(e) => setOrange(e.target.value)}
                        required
                        min={0}
                        className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                        Urgent Level (Days)
                      </label>
                      <input
                        type="number"
                        value={red}
                        onChange={(e) => setRed(e.target.value)}
                        required
                        min={0}
                        className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low rounded font-bold text-xs cursor-pointer text-on-surface"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-on-primary rounded font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Save Configuration
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
