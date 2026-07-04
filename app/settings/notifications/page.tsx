'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';

export default function NotificationSettingsPage() {
  const [digestFrequency, setDigestFrequency] = useState<'daily' | 'weekly' | 'none'>('daily');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [alertThresholdDays, setAlertThresholdDays] = useState(7);
  const [enabledColors, setEnabledColors] = useState<string[]>(['red', 'maroon']);
  
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchConfig = () => {
    fetch('/api/settings/notifications')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .then((data) => {
        setDigestFrequency(data.digestFrequency);
        setRecipients(data.recipients || []);
        setAlertThresholdDays(data.alertThresholdDays);
        setEnabledColors(data.enabledUrgencyColors || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const saveConfig = async (updatedRecipients: string[]) => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digestFrequency,
          recipients: updatedRecipients,
          alertThresholdDays,
          enabledUrgencyColors: enabledColors,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      setSuccess('Saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (recipients.includes(newEmail.trim())) {
      setError('Email already in list');
      return;
    }
    const updated = [...recipients, newEmail.trim()];
    setRecipients(updated);
    setNewEmail('');
    setError('');
    saveConfig(updated);
  };

  const handleRemoveEmail = (email: string) => {
    const updated = recipients.filter((r) => r !== email);
    setRecipients(updated);
    saveConfig(updated);
  };

  const handleColorToggle = (color: string) => {
    if (enabledColors.includes(color)) {
      setEnabledColors(enabledColors.filter((c) => c !== color));
    } else {
      setEnabledColors([...enabledColors, color]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digestFrequency,
          recipients,
          alertThresholdDays,
          enabledUrgencyColors: enabledColors,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');

      setSuccess('Notification configurations saved successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    setTesting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/settings/notifications/test', {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger test send');

      setSuccess('Test Resend digest sent successfully! Check developer terminal logs to verify output.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col md:flex-row">
      <Sidebar />

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col w-full max-w-[1440px] mx-auto overflow-hidden bg-surface-bright relative p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Notification Settings</h1>
          <p className="text-sm text-on-surface-variant font-medium">Configure scheduled email digests, warning day thresholds, and urgency criteria.</p>
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
            {/* Form Settings */}
            <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden space-y-6 shadow-xs h-fit">
              <div className="absolute top-0 left-0 w-full h-1 bg-secondary"></div>
              
              <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-secondary fill-icon">notifications</span>
                Digest Subscription Policies
              </h2>

              <form onSubmit={handleSave} className="space-y-6">
                
                {/* digest frequency */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                    Digest Frequency
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['daily', 'weekly', 'none'] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setDigestFrequency(freq)}
                        className={`py-2 px-3 border rounded text-xs font-bold uppercase tracking-wider text-center cursor-pointer transition-all ${
                          digestFrequency === freq
                            ? 'border-secondary bg-urgency-yellow-bg text-secondary'
                            : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>

                {/* alert days threshold */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1 font-mono">
                      Expiry Warning Threshold (Days)
                    </label>
                    <input
                      type="number"
                      value={alertThresholdDays}
                      onChange={(e) => setAlertThresholdDays(Number(e.target.value))}
                      required
                      min={1}
                      className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                    />
                  </div>
                </div>

                {/* enabled colors */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2 font-mono">
                    Include Urgency Colors
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['maroon', 'red', 'orange', 'yellow', 'green'].map((color) => {
                      const isChecked = enabledColors.includes(color);
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleColorToggle(color)}
                          className={`py-1.5 px-3 rounded-full text-xs font-bold uppercase tracking-wider border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-primary text-on-primary border-transparent'
                              : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                          }`}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex gap-2 justify-end border-t border-outline-variant/30">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-primary text-on-primary rounded font-bold text-xs cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>

              </form>
            </div>

            {/* Recipients list card */}
            <div className="space-y-6">
              
              {/* Add Recipient */}
              <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden space-y-4 shadow-xs">
                <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
                
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary fill-icon">group</span>
                  Subscriber Recipients
                </h2>

                <form onSubmit={handleAddEmail} className="flex gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter manager email..."
                    className="block w-full px-3 py-2 border border-outline-variant rounded bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-secondary text-on-primary rounded font-bold text-xs cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap"
                  >
                    Add
                  </button>
                </form>

                <div className="pt-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 font-mono">
                    Recipient Mailing List ({recipients.length})
                  </span>
                  
                  {recipients.length === 0 ? (
                    <p className="text-xs text-on-surface-variant font-medium">No recipients added yet. Configuration must have at least one to deliver digests.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {recipients.map((email) => (
                        <span 
                          key={email} 
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded text-xs font-medium text-on-surface border border-outline-variant/50"
                        >
                          <span>{email}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(email)}
                            className="text-urgency-red-text hover:opacity-80 font-bold cursor-pointer"
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Send Trigger */}
              <div className="bg-surface border border-outline-variant rounded-xl p-6 relative overflow-hidden space-y-3 shadow-xs">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#146c2e]"></div>
                
                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#146c2e] fill-icon">send</span>
                  Manual Run / Test Email
                </h2>
                
                <p className="text-xs text-on-surface-variant font-medium">
                  Manually trigger a Resend email digest right now. This evaluates active stock against current configurations and emails the recipient list.
                </p>

                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={handleTestSend}
                    disabled={testing || recipients.length === 0}
                    className="px-4 py-2 bg-[#146c2e] text-on-primary font-bold text-xs rounded hover:opacity-90 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">mail</span>
                    <span>{testing ? 'Sending...' : 'Send Test Digest'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
