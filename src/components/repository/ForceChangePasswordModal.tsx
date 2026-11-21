'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, Lock, LogOut, ShieldCheck } from 'lucide-react';

export const ForceChangePasswordModal: React.FC = () => {
  const { currentUser, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentUser || !currentUser.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-pwd-title"
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #94A3B8',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: '#1B365D',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          <span id="force-pwd-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <KeyRound size={14} /> PASSWORD CHANGE REQUIRED
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'transparent',
              color: '#E2E8F0',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '2px',
              padding: '3px 8px',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={12} /> Sign Out
          </button>
        </header>

        <div style={{ padding: '16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#334155', lineHeight: 1.45 }}>
            Signed in as <strong>{currentUser.name}</strong> ({currentUser.email}). You are using a
            temporary password and must set a new password (at least 8 characters) before accessing
            the workspace.
          </p>

          {error && (
            <div
              role="alert"
              style={{
                marginBottom: '12px',
                padding: '8px 10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '2px',
                color: '#B91C1C',
                fontSize: '11px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
              <span>Temporary / Current Password</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '34px',
                  border: '1px solid #AAB7C6',
                  borderRadius: '2px',
                  padding: '0 8px',
                  gap: '6px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Lock size={13} color="#64748B" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  style={{ width: '100%', border: 0, outline: 0, fontSize: '12px', fontWeight: 'normal' }}
                />
              </div>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
              <span>New Password</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '34px',
                  border: '1px solid #AAB7C6',
                  borderRadius: '2px',
                  padding: '0 8px',
                  gap: '6px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Lock size={13} color="#64748B" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  style={{ width: '100%', border: 0, outline: 0, fontSize: '12px', fontWeight: 'normal' }}
                />
              </div>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', fontWeight: 'bold' }}>
              <span>Confirm New Password</span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  height: '34px',
                  border: '1px solid #AAB7C6',
                  borderRadius: '2px',
                  padding: '0 8px',
                  gap: '6px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <Lock size={13} color="#64748B" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  style={{ width: '100%', border: 0, outline: 0, fontSize: '12px', fontWeight: 'normal' }}
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                marginTop: '4px',
                height: '34px',
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                border: '1px solid #003D82',
                borderRadius: '2px',
                background: 'linear-gradient(#0062CC, #004B9E)',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              <ShieldCheck size={14} />
              <span>{isSubmitting ? 'Updating Password...' : 'Set New Password & Continue'}</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};