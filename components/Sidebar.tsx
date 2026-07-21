'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface UserInfo {
  name: string;
  email: string;
  role: 'store-hand' | 'supervisor' | 'manager' | 'quality-assurance' | 'superadmin';
  assignedLocations: string[];
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // Fetch active session info
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not logged in');
      })
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  if (!user) return null;

  const roleLabels: Record<string, string> = {
    'store-hand': 'Store-hand View',
    'supervisor': 'Supervisor View',
    'manager': 'Manager View',
    'quality-assurance': 'Quality Assurance View',
    'superadmin': 'Superadmin View',
  };

  const isStorehand = user.role === 'store-hand';
  const isSupervisor = user.role === 'supervisor';
  const isManagerOrAdmin = user.role === 'manager' || user.role === 'quality-assurance' || user.role === 'superadmin';

  // Helper to determine active state
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="md:hidden flex justify-between items-center w-full px-4 h-16 bg-surface border-b border-outline-variant z-50 sticky top-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary fill-icon text-[24px]">inventory_2</span>
          <span className="text-xl font-bold text-primary">Genesis Expiry360</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-1 text-primary cursor-pointer focus:outline-none"
          >
            <span className="material-symbols-outlined text-[28px]">
              {isMobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-background/95 z-40 flex flex-col p-6 animate-fade-in">
          <div className="mb-6 pb-4 border-b border-outline-variant">
            <div className="font-bold text-lg text-primary">{user.name}</div>
            <div className="text-xs text-on-surface-variant uppercase font-mono font-bold tracking-wide">
              {roleLabels[user.role]}
            </div>
            {user.assignedLocations.length > 0 && (
              <div className="text-xs text-secondary mt-1">
                📍 {user.assignedLocations.join(', ')}
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2 flex-1">
            {isManagerOrAdmin && (
              <Link 
                href="/dashboard"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition-colors ${
                  isActive('/dashboard') 
                    ? 'text-secondary bg-surface-container-highest border-l-4 border-secondary' 
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined">dashboard</span>
                <span>Dashboard</span>
              </Link>
            )}

            {/* Inventory is available for all roles */}
            <Link 
              href="/inventory"
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition-colors ${
                isActive('/inventory') 
                  ? 'text-secondary bg-surface-container-highest border-l-4 border-secondary' 
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined">inventory_2</span>
              <span>Inventory</span>
            </Link>

            {/* Escalations for supervisor, manager, superadmin */}
            {!isStorehand && (
              <Link 
                href="/escalations"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition-colors ${
                  isActive('/escalations') 
                    ? 'text-secondary bg-surface-container-highest border-l-4 border-secondary' 
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined">warning</span>
                <span>Escalation Queue</span>
              </Link>
            )}

            {/* Threshold Settings for manager, superadmin */}
            {isManagerOrAdmin && (
              <Link 
                href="/settings/thresholds"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition-colors ${
                  isActive('/settings/thresholds') 
                    ? 'text-secondary bg-surface-container-highest border-l-4 border-secondary' 
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined">tune</span>
                <span>Category Thresholds</span>
              </Link>
            )}

            {/* Notification Settings for manager, superadmin */}
            {isManagerOrAdmin && (
              <Link 
                href="/settings/notifications"
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition-colors ${
                  isActive('/settings/notifications') 
                    ? 'text-secondary bg-surface-container-highest border-l-4 border-secondary' 
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined">notifications</span>
                <span>Notification Settings</span>
              </Link>
            )}

            {/* User Management for Superadmin */}
            {user.role === 'superadmin' && (
              <>
                <Link 
                  href="/settings/users"
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition-colors ${
                    isActive('/settings/users') 
                      ? 'text-secondary bg-surface-container-highest border-l-4 border-secondary' 
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined">manage_accounts</span>
                  <span>User Management</span>
                </Link>
                <Link 
                  href="/settings/costs"
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold transition-colors ${
                    isActive('/settings/costs') 
                      ? 'text-secondary bg-surface-container-highest border-l-4 border-secondary' 
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <span className="material-symbols-outlined">payments</span>
                  <span>Product Costs</span>
                </Link>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-outline-variant mt-auto">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold text-urgency-red-text hover:bg-urgency-red-bg/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation */}
      <nav className="hidden md:flex flex-col h-screen w-64 bg-surface-container-low border-r border-outline-variant py-6 sticky top-0 z-40">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary fill-icon text-[28px]">inventory_2</span>
            <span className="text-xl font-bold text-primary">Genesis Expiry360</span>
          </div>
          <div className="font-bold text-sm text-on-surface">{user.name}</div>
          <div className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            {roleLabels[user.role]}
          </div>
          {user.assignedLocations.length > 0 && (
            <div className="text-[11px] text-secondary mt-1 flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[13px]">location_on</span>
              <span>{user.assignedLocations.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Action Button for Store-hand/Supervisor/Manager/QA */}
        {['store-hand', 'supervisor', 'manager', 'quality-assurance', 'superadmin'].includes(user.role) && (
          <div className="px-4 mb-6">
            <Link 
              href="/inventory/new"
              className="w-full bg-primary text-on-primary py-2.5 rounded flex justify-center items-center gap-2 font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined fill-icon text-[18px]">add</span>
              <span>Register Stock</span>
            </Link>
          </div>
        )}

        <div className="flex-1 flex flex-col gap-1 px-2">
          {isManagerOrAdmin && (
            <Link 
              href="/dashboard"
              className={`flex items-center gap-3 px-4 py-2.5 rounded text-sm transition-all duration-150 ${
                isActive('/dashboard') 
                  ? 'text-secondary font-bold border-l-4 border-secondary bg-surface-container-highest' 
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span>Dashboard</span>
            </Link>
          )}

          <Link 
            href="/inventory"
            className={`flex items-center gap-3 px-4 py-2.5 rounded text-sm transition-all duration-150 ${
              isActive('/inventory') 
                ? 'text-secondary font-bold border-l-4 border-secondary bg-surface-container-highest' 
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined">inventory_2</span>
            <span>Inventory</span>
          </Link>

          {!isStorehand && (
            <Link 
              href="/escalations"
              className={`flex items-center gap-3 px-4 py-2.5 rounded text-sm transition-all duration-150 ${
                isActive('/escalations') 
                  ? 'text-secondary font-bold border-l-4 border-secondary bg-surface-container-highest' 
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined">warning</span>
              <span>Escalation Queue</span>
            </Link>
          )}

          {isManagerOrAdmin && (
            <div className="mt-4 pt-4 border-t border-outline-variant/50 mx-2">
              <span className="block px-2 mb-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                System Settings
              </span>
              <Link 
                href="/settings/thresholds"
                className={`flex items-center gap-3 px-4 py-2 rounded text-sm transition-all duration-150 ${
                  isActive('/settings/thresholds') 
                    ? 'text-secondary font-bold border-l-4 border-secondary bg-surface-container-highest' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined">tune</span>
                <span>Expiry Thresholds</span>
              </Link>
              <Link 
                href="/settings/notifications"
                className={`flex items-center gap-3 px-4 py-2 rounded text-sm transition-all duration-150 ${
                  isActive('/settings/notifications') 
                    ? 'text-secondary font-bold border-l-4 border-secondary bg-surface-container-highest' 
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined">notifications</span>
                <span>Notifications</span>
              </Link>
              {user.role === 'superadmin' && (
                <>
                  <Link 
                    href="/settings/users"
                    className={`flex items-center gap-3 px-4 py-2 rounded text-sm transition-all duration-150 ${
                      isActive('/settings/users') 
                        ? 'text-secondary font-bold border-l-4 border-secondary bg-surface-container-highest' 
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined">manage_accounts</span>
                    <span>User Manager</span>
                  </Link>
                  <Link 
                    href="/settings/costs"
                    className={`flex items-center gap-3 px-4 py-2 rounded text-sm transition-all duration-150 ${
                      isActive('/settings/costs') 
                        ? 'text-secondary font-bold border-l-4 border-secondary bg-surface-container-highest' 
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined">payments</span>
                    <span>Cost Manager</span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 px-2 mt-auto pt-4 border-t border-outline-variant mx-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 rounded text-sm font-semibold text-urgency-red-text hover:bg-urgency-red-bg/10 transition-colors cursor-pointer text-left"
          >
            <span className="material-symbols-outlined">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
