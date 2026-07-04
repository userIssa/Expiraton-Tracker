'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear session on mount to ensure clean state
  useEffect(() => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent, customEmail?: string, customPass?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    const targetEmail = customEmail || email;
    const targetPassword = customPass || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Redirect based on role
      const role = data.user.role;
      if (role === 'store-hand') {
        router.push('/inventory');
      } else if (role === 'supervisor') {
        router.push('/escalations');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123');
    handleLogin(null as any, roleEmail, 'Password123');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="material-symbols-outlined text-primary fill-icon text-5xl mb-2">
          inventory_2
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-primary">
          ExpireGuard Pro
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant font-medium">
          Product Expiration & Inventory Risk Tracker
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-surface py-8 px-4 border border-outline-variant rounded-xl sm:px-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary"></div>
          
          {error && (
            <div className="mb-4 bg-urgency-red-bg border border-urgency-red-border text-urgency-red-text rounded p-3 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span className="font-semibold">{error}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={(e) => handleLogin(e)}>
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                placeholder="storehand1@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded font-bold text-sm text-on-primary bg-primary hover:opacity-90 transition-opacity focus:outline-none cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Quick Login Section */}
          <div className="mt-8 pt-6 border-t border-outline-variant">
            <span className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 font-mono text-center">
              Quick Login (Dev Seeds)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('storehand1@example.com')}
                disabled={loading}
                className="py-2 px-3 border border-outline-variant hover:border-secondary rounded text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>Store-hand</span>
                <span className="material-symbols-outlined text-secondary text-[16px]">chevron_right</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('supervisor1@example.com')}
                disabled={loading}
                className="py-2 px-3 border border-outline-variant hover:border-secondary rounded text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>Supervisor</span>
                <span className="material-symbols-outlined text-secondary text-[16px]">chevron_right</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('manager1@example.com')}
                disabled={loading}
                className="py-2 px-3 border border-outline-variant hover:border-secondary rounded text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>Manager</span>
                <span className="material-symbols-outlined text-secondary text-[16px]">chevron_right</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin1@example.com')}
                disabled={loading}
                className="py-2 px-3 border border-outline-variant hover:border-secondary rounded text-xs font-bold text-on-surface hover:bg-surface-container-low transition-all text-left flex items-center justify-between cursor-pointer"
              >
                <span>Superadmin</span>
                <span className="material-symbols-outlined text-secondary text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
