'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'store-hand' | 'supervisor' | 'manager' | 'quality-assurance' | 'superadmin';
  assignedLocations: string[];
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals state
  const [modalType, setModalType] = useState<'create' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'store-hand' | 'supervisor' | 'manager' | 'quality-assurance' | 'superadmin'>('store-hand');
  const [locationsInput, setLocationsInput] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = () => {
    fetch('/api/settings/users')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load users');
        return res.json();
      })
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('store-hand');
    setLocationsInput('');
    setModalType('create');
    setError('');
    setSuccess('');
  };

  const openEditModal = (u: User) => {
    setSelectedUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setLocationsInput(u.assignedLocations.join(', '));
    setModalType('edit');
    setError('');
    setSuccess('');
  };

  const closeModals = () => {
    setModalType(null);
    setSelectedUser(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccess('');

    const locations = locationsInput
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          password,
          assignedLocations: locations,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      setSuccess(`User "${name}" created successfully!`);
      closeModals();
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    const locations = locationsInput
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    try {
      const res = await fetch(`/api/settings/users/${selectedUser._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          assignedLocations: locations,
          password: password || undefined, // only send if filled
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setSuccess(`User "${name}" updated successfully!`);
      closeModals();
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Are you sure you want to delete user "${u.name}"? This action is permanent.`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/settings/users/${u._id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      setSuccess(`User "${u.name}" deleted successfully.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto overflow-hidden bg-surface-bright relative p-6 md:p-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">User Management</h1>
            <p className="text-sm text-on-surface-variant font-medium">Add, modify, and delete users or assign storage location scopes.</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-primary text-on-primary py-2 px-4 rounded font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] fill-icon">person_add</span>
            <span>Register New User</span>
          </button>
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

        {/* User list */}
        {loading ? (
          <p className="text-on-surface-variant font-medium">Loading users...</p>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Filters Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-surface border border-outline-variant rounded-xl p-4 shadow-xs max-w-4xl">
              <div className="flex-1 w-full relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
              <div className="w-full sm:w-48">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer font-mono"
                >
                  <option value="all">All Roles</option>
                  <option value="store-hand">STORE-HAND</option>
                  <option value="supervisor">SUPERVISOR</option>
                  <option value="manager">MANAGER</option>
                  <option value="quality-assurance">QUALITY ASSURANCE</option>
                  <option value="superadmin">SUPERADMIN</option>
                </select>
              </div>
            </div>

            <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden flex flex-col shadow-xs">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4">User Details</th>
                      <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-40">Role</th>
                      <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4">Assigned Locations</th>
                      <th className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider py-3 px-4 w-32 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-outline-variant/30 text-on-surface">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-on-surface-variant font-medium">
                          No users found matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr 
                          key={u._id}
                          className="hover:bg-surface-container-low/50 transition-colors group border-l-4 border-transparent hover:border-secondary"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-bold font-mono text-on-surface-variant">
                                {u.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-on-surface">{u.name}</div>
                                <div className="text-xs text-on-surface-variant font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold font-mono uppercase tracking-wider ${
                              u.role === 'superadmin' ? 'bg-purple-100 text-purple-800' :
                              u.role === 'quality-assurance' ? 'bg-teal-100 text-teal-800' :
                              u.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                              u.role === 'supervisor' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-on-surface-variant">
                            {u.assignedLocations && u.assignedLocations.length > 0
                              ? u.assignedLocations.join(', ')
                              : 'All Locations (unscoped)'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => openEditModal(u)}
                                className="text-on-surface-variant hover:text-secondary p-1.5 rounded hover:bg-surface-container-high cursor-pointer"
                                title="Edit User"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(u)}
                                className="text-on-surface-variant hover:text-urgency-red-text p-1.5 rounded hover:bg-surface-container-high cursor-pointer"
                                title="Delete User"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
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
        )}
      </main>

      {/* Create / Edit User Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-surface border border-outline-variant w-full max-w-md rounded-xl shadow-lg p-6 relative overflow-hidden animate-scale-up">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
            
            <h2 className="text-xl font-bold text-on-surface mb-4">
              {modalType === 'create' ? 'Register New User' : 'Edit User Profile'}
            </h2>

            {error && (
              <div className="mb-4 bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <form onSubmit={modalType === 'create' ? handleCreateSubmit : handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. John Doe"
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={modalType === 'edit'}
                  placeholder="e.g. john@example.com"
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm disabled:bg-surface-container disabled:text-on-surface-variant focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Password {modalType === 'edit' && '(Leave blank to keep current)'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={modalType === 'create'}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    User Role
                  </label>
                  <select
                    value={role}
                    onChange={(e: any) => setRole(e.target.value)}
                    className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary cursor-pointer"
                  >
                    <option value="store-hand">Store-hand</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="manager">Manager</option>
                    <option value="quality-assurance">Quality Assurance</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                  Location Scopes (Comma Separated)
                </label>
                <input
                  type="text"
                  value={locationsInput}
                  onChange={(e) => setLocationsInput(e.target.value)}
                  placeholder="Cold-A2, Shelf-B3 (or blank for all)"
                  className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low rounded font-bold text-xs cursor-pointer text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-primary text-on-primary rounded font-bold text-xs cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
