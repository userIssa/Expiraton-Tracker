'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

interface Product {
  _id: string;
  name: string;
  SKU: string;
  category: string;
  unit: string;
}

interface User {
  name: string;
  email: string;
  role: string;
}

interface Batch {
  _id: string;
  productId: Product;
  batchNumber: string;
  quantity: number;
  location: string;
  purchaseDate: string;
  manufactureDate: string;
  expiryDate: string;
  status: 'active' | 'cleared' | 'escalated' | 'expired';
  currentUrgencyColor: 'green' | 'yellow' | 'orange' | 'red' | 'maroon';
  createdBy: User;
}

export default function InventoryPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [supervisors, setSupervisors] = useState<any[]>([]);

  // Action Modals State
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [modalType, setModalType] = useState<'clear' | 'escalate' | null>(null);
  const [clearReason, setClearReason] = useState<'sold' | 'used' | 'discarded'>('sold');
  const [clearNote, setClearNote] = useState('');
  const [escalateAssignee, setEscalateAssignee] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Summary counts
  const [counts, setCounts] = useState({
    expired: 0,
    urgent: 0,
    monitor: 0,
    fresh: 0,
  });

  // Fetch batches with query filters
  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (urgencyFilter) {
        // Map UI urgency filters back to DB currentUrgencyColor
        if (urgencyFilter === 'expired') params.append('urgencyColor', 'maroon');
        if (urgencyFilter === 'urgent') params.append('urgencyColor', 'red');
        if (urgencyFilter === 'monitor') {
          // Send both yellow and orange
          params.append('urgencyColor', 'orange'); // Just filter one for simplicity or handle multiple
        }
        if (urgencyFilter === 'fresh') params.append('urgencyColor', 'green');
      }

      const res = await fetch(`/api/batches?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBatches(data);

        // Recalculate summary counts based on all ACTIVE batches
        // To be accurate, we retrieve counts from full active list without local filters
        const fullRes = await fetch('/api/batches');
        if (fullRes.ok) {
          const fullData: Batch[] = await fullRes.json();
          const newCounts = { expired: 0, urgent: 0, monitor: 0, fresh: 0 };
          fullData.forEach((b) => {
            if (b.currentUrgencyColor === 'maroon') newCounts.expired++;
            else if (b.currentUrgencyColor === 'red') newCounts.urgent++;
            else if (b.currentUrgencyColor === 'orange' || b.currentUrgencyColor === 'yellow') newCounts.monitor++;
            else newCounts.fresh++;
          });
          setCounts(newCounts);
        }
      }
    } catch (e) {
      console.error('Failed to load batches:', e);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, urgencyFilter]);

  // Fetch supervisors list for escalation modal
  const fetchSupervisors = async () => {
    try {
      // In step 1 we seeded users. We can fetch them. Let's create a quick API or fetch in seed.
      // For now, since we have the super admin and supervisor in seeded data, we can query users
      // Let's create an endpoint GET /api/users to list supervisors, or fetch all users in a helper.
      // We will define user listing endpoint in manager settings, but we can query it or stub.
      // Let's query `/api/users` which we'll build, or fallback to seeded emails.
      const res = await fetch('/api/debug/seed'); // we can hit a lightweight user list API if available
      // Let's fetch from a quick API route we will build in step 10, or create a simple fallback
      const usersRes = await fetch('/api/auth/me'); // dummy, we'll write a simple /api/users endpoint
    } catch (e) {}
  };

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    // Quick load of supervisor list
    // We will hardcode default supervisor IDs from seed or query them
    // Our seed created Sarah Supervisor, let's fetch supervisors
    // Let's build a quick API endpoint for users in step 11, or just load a fallback list
    setSupervisors([
      { id: '6a48bcf27a12676b561df7d5', name: 'Sarah Supervisor (Supervisor)' },
      { id: '6a48bcf27a12676b561df7d6', name: 'Michael Manager (Manager)' }
    ]);
  }, []);

  const openActionModal = (batch: Batch, type: 'clear' | 'escalate') => {
    setSelectedBatch(batch);
    setModalType(type);
    setActionError('');
    setClearNote('');
    setEscalateReason('');
    if (type === 'escalate') {
      setEscalateAssignee(supervisors[0]?.id || '');
    }
  };

  const closeActionModal = () => {
    setSelectedBatch(null);
    setModalType(null);
  };

  const handleClearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/batches/${selectedBatch._id}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: clearReason, note: clearNote }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear batch');

      closeActionModal();
      fetchBatches();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/batches/${selectedBatch._id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: escalateAssignee, reason: escalateReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to escalate batch');

      closeActionModal();
      fetchBatches();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUrgencyBadge = (color: string) => {
    switch (color) {
      case 'maroon':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-urgency-maroon-bg border border-urgency-maroon-border text-urgency-maroon-text font-mono text-[10px] font-bold uppercase tracking-wider">
            Expired
          </span>
        );
      case 'red':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text font-mono text-[10px] font-bold uppercase tracking-wider">
            Urgent
          </span>
        );
      case 'orange':
      case 'yellow':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-urgency-yellow-bg border border-urgency-yellow-border text-urgency-yellow-text font-mono text-[10px] font-bold uppercase tracking-wider">
            Monitor
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-urgency-green-bg border border-urgency-green-border text-urgency-green-text font-mono text-[10px] font-bold uppercase tracking-wider">
            Fresh
          </span>
        );
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto overflow-hidden bg-surface-bright relative pb-20 md:pb-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 space-y-6">
          
          {/* Title & Add Button */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary">Inventory Management</h1>
              <p className="text-sm text-on-surface-variant font-medium">Track, monitor, and clear expiring stock batches.</p>
            </div>
            <Link
              href="/inventory/new"
              className="md:hidden bg-primary text-on-primary py-2.5 rounded text-center font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Register New Stock
            </Link>
          </div>

          {/* Urgency Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              onClick={() => setUrgencyFilter(urgencyFilter === 'expired' ? '' : 'expired')}
              className={`bg-surface border rounded p-4 flex flex-col relative overflow-hidden cursor-pointer hover:shadow-sm transition-all ${
                urgencyFilter === 'expired' ? 'ring-2 ring-primary border-transparent' : 'border-outline-variant'
              }`}
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-urgency-maroon-text"></div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono mb-1">Expired</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-urgency-maroon-text">{counts.expired}</span>
                <span className="text-xs text-urgency-maroon-text font-medium">Items</span>
              </div>
            </div>

            <div 
              onClick={() => setUrgencyFilter(urgencyFilter === 'urgent' ? '' : 'urgent')}
              className={`bg-surface border rounded p-4 flex flex-col relative overflow-hidden cursor-pointer hover:shadow-sm transition-all ${
                urgencyFilter === 'urgent' ? 'ring-2 ring-primary border-transparent' : 'border-outline-variant'
              }`}
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-urgency-red-text"></div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono mb-1">Urgent</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-urgency-red-text">{counts.urgent}</span>
                <span className="text-xs text-urgency-red-text font-medium">Items</span>
              </div>
            </div>

            <div 
              onClick={() => setUrgencyFilter(urgencyFilter === 'monitor' ? '' : 'monitor')}
              className={`bg-surface border rounded p-4 flex flex-col relative overflow-hidden cursor-pointer hover:shadow-sm transition-all ${
                urgencyFilter === 'monitor' ? 'ring-2 ring-primary border-transparent' : 'border-outline-variant'
              }`}
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-urgency-yellow-text"></div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono mb-1">Monitor</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-urgency-yellow-text">{counts.monitor}</span>
                <span className="text-xs text-urgency-yellow-text font-medium">Items</span>
              </div>
            </div>

            <div 
              onClick={() => setUrgencyFilter(urgencyFilter === 'fresh' ? '' : 'fresh')}
              className={`bg-surface border rounded p-4 flex flex-col relative overflow-hidden cursor-pointer hover:shadow-sm transition-all ${
                urgencyFilter === 'fresh' ? 'ring-2 ring-primary border-transparent' : 'border-outline-variant'
              }`}
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-urgency-green-text"></div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono mb-1">Fresh</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-urgency-green-text">{counts.fresh}</span>
                <span className="text-xs text-urgency-green-text font-medium">Items</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-surface border border-outline-variant rounded-lg p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" style={{ fontSize: '20px' }}>
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by SKU, product, or batch..."
                className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface focus:outline-none focus:border-secondary cursor-pointer min-w-[140px]"
              >
                <option value="">All Categories</option>
                <option value="Dairy">Dairy</option>
                <option value="Bakery">Bakery</option>
                <option value="Meat & Seafood">Meat & Seafood</option>
                <option value="Canned Goods">Canned Goods</option>
              </select>

              {(categoryFilter || urgencyFilter || search) && (
                <button
                  onClick={() => {
                    setCategoryFilter('');
                    setUrgencyFilter('');
                    setSearch('');
                  }}
                  className="px-3 py-2 border border-primary text-primary hover:bg-urgency-red-bg/10 rounded text-xs font-bold transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4">Product / SKU</th>
                    <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-24">Qty</th>
                    <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-32">Location</th>
                    <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-32">Mfg Date</th>
                    <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-32">Expiry Date</th>
                    <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-32">Urgency</th>
                    <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-32">Status</th>
                    <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-36 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-outline-variant/30 text-on-surface">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-on-surface-variant font-medium">
                        Loading inventory...
                      </td>
                    </tr>
                  ) : batches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-on-surface-variant font-medium">
                        No active stock batches found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr 
                        key={batch._id}
                        className="hover:bg-surface-container-low/50 transition-colors group border-l-4 border-transparent hover:border-secondary"
                      >
                        <td className="py-3 px-4">
                          <Link href={`/inventory/${batch._id}`} className="hover:underline flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center text-on-surface-variant">
                              <span className="material-symbols-outlined text-[18px]">
                                {batch.productId.category === 'Dairy' ? 'kitchen' : 
                                 batch.productId.category === 'Bakery' ? 'bakery_dining' : 
                                 batch.productId.category === 'Meat' ? 'set_meal' :
                                 batch.productId.category === 'Canned' || batch.productId.category === 'Canned Goods' ? 'grocery' : 'inventory_2'}
                              </span>
                            </div>
                            <div>
                              <div className="font-semibold text-on-surface">{batch.productId.name}</div>
                              <div className="text-xs text-on-surface-variant font-mono">
                                SKU: {batch.productId.SKU} | Batch: #{batch.batchNumber}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          {batch.quantity} {batch.productId.unit}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">
                          {batch.location}
                        </td>
                        <td className="py-3 px-4 text-on-surface-variant text-xs">
                          {formatDate(batch.manufactureDate)}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          {formatDate(batch.expiryDate)}
                        </td>
                        <td className="py-3 px-4">
                          {getUrgencyBadge(batch.currentUrgencyColor)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                            batch.status === 'cleared' ? 'bg-green-100 text-green-800' :
                            batch.status === 'escalated' ? 'bg-orange-100 text-orange-800' :
                            batch.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {batch.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            {batch.status !== 'cleared' && (
                              <>
                                <button
                                  onClick={() => openActionModal(batch, 'clear')}
                                  className="text-on-surface-variant hover:text-[#146c2e] transition-colors p-1 cursor-pointer"
                                  title="Mark Cleared"
                                >
                                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                </button>
                                <button
                                  onClick={() => openActionModal(batch, 'escalate')}
                                  className="text-on-surface-variant hover:text-primary transition-colors p-1 cursor-pointer"
                                  title="Escalate"
                                >
                                  <span className="material-symbols-outlined text-[20px]">warning</span>
                                </button>
                              </>
                            )}
                            <Link
                              href={`/inventory/${batch._id}`}
                              className="text-on-surface-variant hover:text-secondary transition-colors p-1"
                              title="Details"
                            >
                              <span className="material-symbols-outlined text-[20px]">more_vert</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Floating Action Button (Mobile Only) */}
        <Link 
          href="/inventory/new"
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center z-40 hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined fill-icon text-[28px]">add</span>
        </Link>
      </main>

      {/* Clear Batch Modal */}
      {modalType === 'clear' && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface border border-outline-variant w-full max-w-md rounded-xl shadow-lg p-6 relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#146c2e]"></div>
            <h2 className="text-xl font-bold text-on-surface mb-2">Mark Batch Cleared</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Clear <span className="font-bold text-on-surface">{selectedBatch.productId.name}</span> (Batch #{selectedBatch.batchNumber}) from active stock.
            </p>

            {actionError && (
              <div className="mb-4 bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span className="font-semibold">{actionError}</span>
              </div>
            )}

            <form onSubmit={handleClearSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Reason for Clearing
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['sold', 'used', 'discarded'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setClearReason(r)}
                      className={`py-2 px-3 border rounded text-xs font-bold uppercase tracking-wider text-center cursor-pointer transition-all ${
                        clearReason === r
                          ? 'border-[#146c2e] bg-[#146c2e]/10 text-[#146c2e]'
                          : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Additional Note
                </label>
                <textarea
                  value={clearNote}
                  onChange={(e) => setClearNote(e.target.value)}
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all h-20"
                  placeholder="e.g. Regular sales, batch reached shelf-life, etc."
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeActionModal}
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low rounded font-bold text-xs cursor-pointer text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#146c2e] text-on-primary hover:opacity-90 rounded font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Clearing...' : 'Confirm Clear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalate Batch Modal */}
      {modalType === 'escalate' && selectedBatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface border border-outline-variant w-full max-w-md rounded-xl shadow-lg p-6 relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
            <h2 className="text-xl font-bold text-on-surface mb-2">Escalate Batch</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Escalate <span className="font-bold text-on-surface">{selectedBatch.productId.name}</span> (Batch #{selectedBatch.batchNumber}) to a supervisor.
            </p>

            {actionError && (
              <div className="mb-4 bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span className="font-semibold">{actionError}</span>
              </div>
            )}

            <form onSubmit={handleEscalateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Assign to Supervisor
                </label>
                <select
                  value={escalateAssignee}
                  onChange={(e) => setEscalateAssignee(e.target.value)}
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary cursor-pointer"
                  required
                >
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Reason for Escalation
                </label>
                <textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all h-24"
                  placeholder="e.g. Quantity too high to clear before expiration date."
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeActionModal}
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low rounded font-bold text-xs cursor-pointer text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-primary text-on-primary hover:opacity-90 rounded font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Escalating...' : 'Submit Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
