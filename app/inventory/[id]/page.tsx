'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface StatusHistoryItem {
  _id: string;
  fromStatus: string;
  toStatus: string;
  actorId: User;
  note: string;
  timestamp: string;
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
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryItem[];
}

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals state
  const [modalType, setModalType] = useState<'clear' | 'escalate' | null>(null);
  const [clearReason, setClearReason] = useState<'sold' | 'used' | 'discarded'>('sold');
  const [clearNote, setClearNote] = useState('');
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [escalateAssignee, setEscalateAssignee] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBatchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/batches/${id}`);
      if (!res.ok) throw new Error('Failed to load batch details');
      const data = await res.json();
      setBatch(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchSupervisors = async () => {
    try {
      const res = await fetch('/api/settings/users');
      if (res.ok) {
        const data = await res.json();
        const filtered = data
          .filter((u: any) => ['supervisor', 'manager', 'superadmin'].includes(u.role))
          .map((u: any) => ({
            id: u._id,
            name: `${u.name} (${u.role.charAt(0).toUpperCase() + u.role.slice(1)})`,
          }));
        setSupervisors(filtered);
      }
    } catch (e) {
      console.error('Failed to fetch supervisors:', e);
    }
  };

  useEffect(() => {
    fetchBatchDetails();
    fetchSupervisors();

    // Get current user to see roles
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, [id, fetchBatchDetails]);

  useEffect(() => {
    if (supervisors.length > 0 && !supervisors.some(s => s.id === escalateAssignee)) {
      setEscalateAssignee(supervisors[0].id);
    }
  }, [supervisors, escalateAssignee]);

  const openActionModal = (type: 'clear' | 'escalate') => {
    setModalType(type);
    setActionError('');
    setClearNote('');
    setEscalateReason('');
    if (type === 'escalate') {
      setEscalateAssignee(supervisors[0]?.id || '');
    }
  };

  const closeActionModal = () => {
    setModalType(null);
  };

  const handleClearSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/batches/${batch._id}/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: clearReason, note: clearNote }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to clear batch');

      closeActionModal();
      fetchBatchDetails();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/batches/${batch._id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: escalateAssignee, reason: escalateReason }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to escalate batch');

      closeActionModal();
      fetchBatchDetails();
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-8 bg-surface-bright">
          <p className="text-on-surface-variant font-medium">Loading batch details...</p>
        </main>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 p-8 bg-surface-bright space-y-4">
          <div className="bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-4">
            {error || 'Batch not found'}
          </div>
          <Link href="/inventory" className="text-primary font-bold hover:underline">
            Back to Inventory
          </Link>
        </main>
      </div>
    );
  }

  // Calculate days remaining
  const expiry = new Date(batch.expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryMidnight = new Date(expiry);
  expiryMidnight.setHours(0, 0, 0, 0);
  const diffTime = expiryMidnight.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const getUrgencyBadge = (color: string) => {
    switch (color) {
      case 'maroon':
        return (
          <span className="px-3 py-1 rounded-full bg-urgency-maroon-bg border border-urgency-maroon-border text-urgency-maroon-text font-mono text-xs font-bold uppercase tracking-wider">
            Expired
          </span>
        );
      case 'red':
        return (
          <span className="px-3 py-1 rounded-full bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text font-mono text-xs font-bold uppercase tracking-wider">
            Urgent
          </span>
        );
      case 'orange':
      case 'yellow':
        return (
          <span className="px-3 py-1 rounded-full bg-urgency-yellow-bg border border-urgency-yellow-border text-urgency-yellow-text font-mono text-xs font-bold uppercase tracking-wider">
            Monitor
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full bg-urgency-green-bg border border-urgency-green-border text-urgency-green-text font-mono text-xs font-bold uppercase tracking-wider">
            Fresh
          </span>
        );
    }
  };

  const getStatusColor = (color: string) => {
    if (color === 'maroon') return 'text-urgency-maroon-text';
    if (color === 'red') return 'text-urgency-red-text';
    if (color === 'orange' || color === 'yellow') return 'text-urgency-yellow-text';
    return 'text-urgency-green-text';
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto overflow-hidden bg-surface-bright relative p-6 md:p-8 space-y-6">
        
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-on-surface-variant uppercase tracking-wider">
            <Link href="/inventory" className="hover:underline">Inventory</Link>
            <span>/</span>
            <span>Batch Details</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary">
                Batch #{batch.batchNumber}
              </h1>
              <p className="text-sm text-on-surface-variant font-medium">
                Registered under Product: <span className="font-semibold text-on-surface">{batch.productId.name}</span>
              </p>
            </div>
            
            {/* Quick Actions Panel */}
            {batch.status !== 'cleared' && (
              <div className="flex gap-2">
                <button
                  onClick={() => openActionModal('clear')}
                  className="px-4 py-2 bg-[#146c2e] text-on-primary font-bold text-xs rounded hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] fill-icon">check_circle</span>
                  <span>Mark Cleared</span>
                </button>
                <button
                  onClick={() => openActionModal('escalate')}
                  className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  <span>Raise Escalation</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Expiry Countdown & Quick Specs (Left/Middle) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Status Panel Banner */}
            <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>
              
              <div className="space-y-1">
                <div className="text-xs text-on-surface-variant uppercase font-mono font-bold tracking-wide">
                  Operational Expiry Status
                </div>
                <div className="flex items-center gap-3">
                  {getUrgencyBadge(batch.currentUrgencyColor)}
                  <span className={`text-2xl font-bold ${getStatusColor(batch.currentUrgencyColor)}`}>
                    {diffDays <= 0 ? 'Expired' : `${diffDays} Days Remaining`}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-on-surface-variant uppercase font-mono font-bold tracking-wide">
                  Current Inventory Status
                </div>
                <span className={`inline-flex px-3 py-1 rounded text-sm font-bold uppercase tracking-wider mt-1 ${
                  batch.status === 'cleared' ? 'bg-green-100 text-green-800' :
                  batch.status === 'escalated' ? 'bg-orange-100 text-orange-800' :
                  batch.status === 'expired' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {batch.status}
                </span>
              </div>
            </div>

            {/* Core Specifications */}
            <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden shadow-xs space-y-4">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary fill-icon">inventory_2</span>
                Batch Specifications
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Product Name</span>
                  <span className="text-sm font-bold text-on-surface">{batch.productId.name}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Product SKU</span>
                  <span className="text-sm font-bold text-on-surface font-mono">{batch.productId.SKU}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Category</span>
                  <span className="text-sm font-bold text-on-surface">{batch.productId.category}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Batch Quantity</span>
                  <span className="text-sm font-bold text-on-surface">{batch.quantity} {batch.productId.unit}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Storage Location</span>
                  <span className="text-sm font-bold text-on-surface font-mono">{batch.location}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Registered By</span>
                  <span className="text-sm font-bold text-on-surface">{batch.createdBy.name}</span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Purchase Date</span>
                  <span className="text-sm font-semibold text-on-surface">{formatDate(batch.purchaseDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Manufacture Date</span>
                  <span className="text-sm font-semibold text-on-surface">{formatDate(batch.manufactureDate)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant font-mono">Expiry Date</span>
                  <span className="text-sm font-bold text-primary">{formatDate(batch.expiryDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: StatusHistory Audit Timeline */}
          <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden shadow-xs space-y-4">
            <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary fill-icon">history</span>
              Status Audit Trail
            </h2>

            {/* Vertical Timeline */}
            <div className="flow-root pt-2">
              <ul className="-mb-8">
                {batch.statusHistory && batch.statusHistory.length > 0 ? (
                  batch.statusHistory.map((item, idx) => (
                    <li key={item._id}>
                      <div className="relative pb-8">
                        {idx !== batch.statusHistory.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-outline-variant" aria-hidden="true" />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-surface ${
                              item.toStatus === 'cleared' ? 'bg-green-100 text-green-800' :
                              item.toStatus === 'escalated' ? 'bg-orange-100 text-orange-800' :
                              item.toStatus === 'expired' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              <span className="material-symbols-outlined text-[16px] fill-icon">
                                {item.toStatus === 'cleared' ? 'check_circle' :
                                 item.toStatus === 'escalated' ? 'warning' : 'fiber_manual_record'}
                              </span>
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5">
                            <p className="text-xs font-semibold text-on-surface">
                              Transition: <span className="font-mono uppercase font-bold text-[10px]">{item.fromStatus}</span> &rarr;{' '}
                              <span className="font-mono uppercase font-bold text-[10px]">{item.toStatus}</span>
                            </p>
                            <p className="text-xs text-on-surface-variant mt-0.5">
                              {item.note}
                            </p>
                            <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-mono mt-1">
                              <span>By: {item.actorId?.name || 'System'}</span>
                              <span>{formatDateTime(item.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-on-surface-variant font-medium">No status transitions recorded.</p>
                )}
              </ul>
            </div>
          </div>
        </div>

      </main>

      {/* Clear Batch Modal */}
      {modalType === 'clear' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface border border-outline-variant w-full max-w-md rounded-xl shadow-lg p-6 relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#146c2e]"></div>
            <h2 className="text-xl font-bold text-on-surface mb-2">Mark Batch Cleared</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Clear <span className="font-bold text-on-surface">{batch.productId.name}</span> (Batch #{batch.batchNumber}) from active stock.
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
      {modalType === 'escalate' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface border border-outline-variant w-full max-w-md rounded-xl shadow-lg p-6 relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
            <h2 className="text-xl font-bold text-on-surface mb-2">Escalate Batch</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Escalate <span className="font-bold text-on-surface">{batch.productId.name}</span> (Batch #{batch.batchNumber}) to a supervisor.
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
