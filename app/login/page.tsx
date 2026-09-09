'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server connection error (${res.status} ${res.statusText})`);
      }

      if (!res.ok) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Login failed');
        throw new Error(errorMsg);
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

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="material-symbols-outlined text-primary fill-icon text-5xl mb-2">
          inventory_2
        </span>
        <h2 className="text-3xl font-bold tracking-tight text-primary">
          Genesis Expiry360
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant font-medium">
          Genesis Group Inventory & Expiry Risk Tracker
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
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[20px] select-none">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
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
        </div>
      </div>
    </div>
  );
}
