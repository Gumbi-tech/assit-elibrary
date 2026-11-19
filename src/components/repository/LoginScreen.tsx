'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Lock, ArrowRight, Command } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, users } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(identifier, password);
      if (!result.ok) {
        setError(
          result.error ||
            'Account not found or inactive. Verify your Student ID or work email and password.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSandboxLaunch = async (email: string, userPassword?: string) => {
    setError('');
    setIdentifier(email);
    const pwd = userPassword || 'password123';
    setPassword(pwd);
    setIsSubmitting(true);
    try {
      const result = await login(email, pwd);
      if (!result.ok) {
        setError(result.error || 'Unable to launch sandbox user.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#E9EEF4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#0F172A',
      }}
    >
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                display: 'grid',
                placeItems: 'center',
                backgroundColor: '#1B365D',
                color: '#FFFFFF',
                borderRadius: '2px',
              }}
            >
              <Command size={14} strokeWidth={2.2} />
            </div>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                letterSpacing: '0.12em',
                color: '#1E5F9A',
                textTransform: 'uppercase',
              }}
            >
              Digital Resource Repository
            </span>
          </div>
          <h1
            style={{
              margin: '0 0 4px 0',
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#0F294A',
            }}
          >
            Workspace Sign In
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#475467', lineHeight: 1.4 }}>
            Sign in using your Student ID or institutional email address and password.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginBottom: '14px',
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label
              htmlFor="login-identifier"
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#334155',
              }}
            >
              Student ID or Institutional Email
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '34px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #AAB7C6',
                borderRadius: '2px',
                padding: '0 10px',
                gap: '8px',
              }}
            >
              <User size={14} style={{ color: '#64748B', flexShrink: 0 }} />
              <input
                id="login-identifier"
                type="text"
                required
                placeholder="e.g. STU-2026-004 or name@college.ac.sz"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{
                  width: '100%',
                  border: 0,
                  outline: 0,
                  background: 'transparent',
                  fontSize: '12px',
                  color: '#0F172A',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label
              htmlFor="login-password"
              style={{
                fontSize: '11px',
                fontWeight: 'bold',
                color: '#334155',
              }}
            >
              Password
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                height: '34px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #AAB7C6',
                borderRadius: '2px',
                padding: '0 10px',
                gap: '8px',
              }}
            >
              <Lock size={14} style={{ color: '#64748B', flexShrink: 0 }} />
              <input
                id="login-password"
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  border: 0,
                  outline: 0,
                  background: 'transparent',
                  fontSize: '12px',
                  color: '#0F172A',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              height: '32px',
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '0 12px',
              border: '1px solid #003D82',
              borderRadius: '2px',
              background: 'linear-gradient(#0062CC, #004B9E)',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 'bold',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.75 : 1,
            }}
          >
            <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight size={13} />
          </button>
        </form>

        <div
          style={{
            marginTop: '20px',
            paddingTop: '14px',
            borderTop: '1px solid #CBD5E1',
          }}
        >
          <span
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Sandbox Role Access
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSandboxLaunch(u.email, u.password)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '2px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: '11px', color: '#1B365D' }}>
                    {u.name}
                  </strong>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      color: '#64748B',
                      fontFamily: 'Consolas, monospace',
                    }}
                  >
                    {u.studentId ? `${u.studentId} · ` : ''}
                    {u.role} {u.department ? `(${u.department.replace('_', ' ')})` : ''}
                  </span>
                </div>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#004085' }}>
                  Launch &rarr;
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};