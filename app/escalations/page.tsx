'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';

interface Product {
  _id: string;
  name: string;
  SKU: string;
  category: string;
  unit: string;
}

interface Batch {
  _id: string;
  productId: Product;
  batchNumber: string;
  quantity: number;
  location: string;
  expiryDate: string;
  status: string;
  currentUrgencyColor: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Escalation {
  _id: string;
  batchId: Batch;
  raisedBy: User;
  assignedTo: User;
  reason: string;
  status: 'open' | 'in_review' | 'resolved';
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export default function EscalationQueuePage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'open' | 'in_review' | 'resolved'>('open');
  const [search, setSearch] = useState('');
  const [supervisors, setSupervisors] = useState<any[]>([]);

  // Action Modals State
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [modalType, setModalType] = useState<'resolve' | 'reassign' | null>(null);
  const [resolveActionType, setResolveActionType] = useState<'resolve_clear' | 'resolve_keep'>('resolve_clear');
  const [resolutionNote, setResolutionNote] = useState('');
  const [reassignAssignee, setReassignAssignee] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Status counts
  const [counts, setCounts] = useState({
    open: 0,
    inReview: 0,
    resolved: 0,
  });

  const fetchEscalations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/escalations?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEscalations(data);

        // Fetch counts for summary tabs
        const allOpenRes = await fetch('/api/escalations?status=open');
        const allReviewRes = await fetch('/api/escalations?status=in_review');
        const allResolvedRes = await fetch('/api/escalations?status=resolved');
        
        if (allOpenRes.ok && allReviewRes.ok && allResolvedRes.ok) {
          const openData = await allOpenRes.json();
          const reviewData = await allReviewRes.json();
          const resolvedData = await allResolvedRes.json();
          setCounts({
            open: openData.length,
            inReview: reviewData.length,
            resolved: resolvedData.length,
          });
        }
      }
    } catch (e) {
      console.error('Failed to load escalations:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchSupervisors = async () => {
    try {
      const res = await fetch('/api/settings/users');
      if (res.ok) {
        const data = await res.json();
        const filtered = data
          .filter((u: any) => ['supervisor', 'manager', 'quality-assurance', 'superadmin'].includes(u.role))
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
    fetchEscalations();
    fetchSupervisors();
  }, [fetchEscalations]);

  useEffect(() => {
    if (supervisors.length > 0 && !supervisors.some(s => s.id === reassignAssignee)) {
      setReassignAssignee(supervisors[0].id);
    }
  }, [supervisors, reassignAssignee]);

  const openResolveModal = (esc: Escalation) => {
    setSelectedEscalation(esc);
    setModalType('resolve');
    setResolveActionType('resolve_clear');
    setResolutionNote('');
    setActionError('');
  };

  const openReassignModal = (esc: Escalation) => {
    setSelectedEscalation(esc);
    setModalType('reassign');
    setReassignAssignee(esc.assignedTo._id);
    setActionError('');
  };

  const closeActionModal = () => {
    setModalType(null);
    setSelectedEscalation(null);
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEscalation) return;

    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/escalations/${selectedEscalation._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: resolveActionType, note: resolutionNote }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resolve escalation');

      setModalType(null);
      setSelectedEscalation(null);
      fetchEscalations();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEscalation) return;

    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/escalations/${selectedEscalation._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reassign', assignedTo: reassignAssignee }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reassign escalation');

      setModalType(null);
      setSelectedEscalation(null);
      fetchEscalations();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveToReview = async (esc: Escalation) => {
    try {
      const res = await fetch(`/api/escalations/${esc._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'in_review' }),
      });
      if (res.ok) {
        fetchEscalations();
      }
    } catch (e) {
      console.error(e);
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
      case 'red':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text font-mono text-[10px] font-bold uppercase tracking-wider">
            Critical
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-urgency-yellow-bg border border-urgency-yellow-border text-urgency-yellow-text font-mono text-[10px] font-bold uppercase tracking-wider">
            High
          </span>
        );
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto overflow-hidden bg-surface-bright relative p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Escalation Queue</h1>
          <p className="text-sm text-on-surface-variant font-medium">Supervisor overview of critical inventory alerts requiring immediate action.</p>
        </div>

        {/* Tab Filters & Search */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface border border-outline-variant p-4 rounded-lg">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-4 py-2 rounded text-xs font-bold font-mono tracking-wide transition-all cursor-pointer ${
                statusFilter === 'open'
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
              }`}
            >
              Open ({counts.open})
            </button>
            <button
              onClick={() => setStatusFilter('in_review')}
              className={`px-4 py-2 rounded text-xs font-bold font-mono tracking-wide transition-all cursor-pointer ${
                statusFilter === 'in_review'
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
              }`}
            >
              In Review ({counts.inReview})
            </button>
            <button
              onClick={() => setStatusFilter('resolved')}
              className={`px-4 py-2 rounded text-xs font-bold font-mono tracking-wide transition-all cursor-pointer ${
                statusFilter === 'resolved'
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant text-on-surface hover:bg-surface-container-low'
              }`}
            >
              Resolved ({counts.resolved})
            </button>
          </div>

          <div className="w-full md:w-64 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search escalations..."
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded text-sm text-on-surface focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden flex flex-col">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4">Item Name / SKU</th>
                  <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-32">Urgency</th>
                  <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-44">Escalated By</th>
                  <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4">Reason / Note</th>
                  <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-48 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-outline-variant/30 text-on-surface">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-on-surface-variant font-medium">
                      Loading escalations...
                    </td>
                  </tr>
                ) : escalations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-on-surface-variant font-medium">
                      No escalated batches found in this queue.
                    </td>
                  </tr>
                ) : (
                  escalations.map((esc) => (
                    <tr 
                      key={esc._id}
                      className="hover:bg-surface-container-low/50 transition-colors group border-l-4 border-transparent hover:border-secondary"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-semibold text-on-surface">{esc.batchId.productId.name}</div>
                          <div className="text-xs text-on-surface-variant font-mono">
                            SKU: {esc.batchId.productId.SKU} | Batch: #{esc.batchId.batchNumber}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getUrgencyBadge(esc.batchId.currentUrgencyColor)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant font-mono">
                            {esc.raisedBy.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="text-xs">
                            <div className="font-semibold">{esc.raisedBy.name}</div>
                            <div className="text-on-surface-variant font-mono text-[10px]">{esc.raisedBy.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-on-surface-variant max-w-xs">
                        <p className="line-clamp-2">{esc.reason}</p>
                        {esc.resolutionNote && (
                          <p className="text-[10px] text-green-700 font-semibold mt-1">
                            Resolution: {esc.resolutionNote}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {esc.status !== 'resolved' ? (
                          <div className="flex justify-end gap-1">
                            {esc.status === 'open' && (
                              <button
                                onClick={() => handleMoveToReview(esc)}
                                className="px-3 py-1.5 border border-outline-variant hover:bg-surface-container-low text-xs font-bold rounded cursor-pointer text-on-surface"
                              >
                                Review
                              </button>
                            )}
                            <button
                              onClick={() => openReassignModal(esc)}
                              className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded hover:bg-surface-container-low cursor-pointer"
                              title="Reassign"
                            >
                              <span className="material-symbols-outlined text-[20px]">person_add</span>
                            </button>
                            <button
                              onClick={() => openResolveModal(esc)}
                              className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded hover:opacity-90 transition-all cursor-pointer"
                            >
                              Resolve
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface-variant font-semibold font-mono uppercase">
                            Resolved on {esc.resolvedAt ? formatDate(esc.resolvedAt) : ''}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Resolve Escalation Modal */}
      {modalType === 'resolve' && selectedEscalation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface border border-outline-variant w-full max-w-md rounded-xl shadow-lg p-6 relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
            <h2 className="text-xl font-bold text-on-surface mb-2">Resolve Escalation</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Decide the inventory outcome for <span className="font-bold text-on-surface">{selectedEscalation.batchId.productId.name}</span> (Batch #{selectedEscalation.batchId.batchNumber}).
            </p>

            {actionError && (
              <div className="mb-4 bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span className="font-semibold">{actionError}</span>
              </div>
            )}

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Resolution Decision
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    key="clear"
                    type="button"
                    onClick={() => setResolveActionType('resolve_clear')}
                    className={`py-2 px-3 border rounded text-xs font-bold uppercase tracking-wider text-center cursor-pointer transition-all ${
                      resolveActionType === 'resolve_clear'
                        ? 'border-primary bg-urgency-maroon-bg text-primary'
                        : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    Resolve & Clear Batch
                  </button>
                  <button
                    key="keep"
                    type="button"
                    onClick={() => setResolveActionType('resolve_keep')}
                    className={`py-2 px-3 border rounded text-xs font-bold uppercase tracking-wider text-center cursor-pointer transition-all ${
                      resolveActionType === 'resolve_keep'
                        ? 'border-green-600 bg-urgency-green-bg text-green-700'
                        : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    Resolve & Keep Active
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Resolution / Audit Note
                </label>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all h-24"
                  placeholder="Explain why this decision was reached (e.g. Quarantined and disposed, temperature fluctuations verified as safe, etc.)"
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
                  {actionLoading ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reassign Escalation Modal */}
      {modalType === 'reassign' && selectedEscalation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface border border-outline-variant w-full max-w-md rounded-xl shadow-lg p-6 relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
            <h2 className="text-xl font-bold text-on-surface mb-2">Reassign Escalation</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Reassign <span className="font-bold text-on-surface">{selectedEscalation.batchId.productId.name}</span> to another supervisor.
            </p>

            {actionError && (
              <div className="mb-4 bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span className="font-semibold">{actionError}</span>
              </div>
            )}

            <form onSubmit={handleReassignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Select Supervisor / Manager
                </label>
                <select
                  value={reassignAssignee}
                  onChange={(e) => setReassignAssignee(e.target.value)}
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
                  {actionLoading ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
