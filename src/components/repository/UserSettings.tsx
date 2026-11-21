'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Lock,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  KeyRound,
  ArrowLeft,
  X,
  Mail,
  Phone,
  BadgeInfo,
  BookOpen,
} from 'lucide-react';
import PortalHeader from './PortalHeader';

type Props = {
  onBack?: () => void;
  onLogout?: () => void;
};

export const UserSettings: React.FC<Props> = ({ onBack, onLogout }) => {
  const { currentUser, logout, updateProfile, changePassword } = useAuth() as any;

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentOrStaffId, setStudentOrStaffId] = useState('');
  const [bio, setBio] = useState('');

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Feedback Banners
  const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Populate fields from currentUser
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.name || currentUser.fullName || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setStudentOrStaffId(currentUser.studentId || currentUser.staffId || currentUser.id || '');
      setBio(currentUser.bio || '');
    }
  }, [currentUser]);

  const formatDeptName = (dept?: string) => {
    if (!dept) return 'Unassigned';
    return dept
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  };

  // Handle Profile Details Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);

    if (!fullName.trim()) {
      setProfileStatus({ type: 'error', text: 'Full name is required.' });
      return;
    }

    setIsSavingProfile(true);
    try {
      if (typeof updateProfile === 'function') {
        await updateProfile({
          name: fullName.trim(),
          phone: phone.trim(),
          studentId: studentOrStaffId.trim(),
          bio: bio.trim(),
        });
      }
      setProfileStatus({ type: 'success', text: 'Profile details updated successfully.' });
      setTimeout(() => setProfileStatus(null), 4000);
    } catch (err: any) {
      setProfileStatus({
        type: 'error',
        text: err?.message || 'Failed to update profile details.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change Submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordStatus({
        type: 'error',
        text: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordStatus({
        type: 'error',
        text: 'New password must be different from your current password.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: 'error',
        text: 'New password and confirmation do not match.',
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      if (typeof changePassword === 'function') {
        await changePassword(currentPassword, newPassword);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus({
        type: 'success',
        text: 'Your password has been changed successfully.',
      });
      
      // Close modal automatically after short success notice
      setTimeout(() => {
        setPasswordStatus(null);
        setIsPasswordModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setPasswordStatus({
        type: 'error',
        text: err?.message || 'Current password is incorrect or update failed.',
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="repo-page">
      <PortalHeader
        appName="Digital Resource Library"
        workspaceName={`Account Settings · ${formatDeptName(currentUser?.department)}`}
        version="v1.0"
        systemStatus="Online"
        onLogout={onLogout || logout}
      />

      <main className="repo-main" style={{ marginTop: '24px' }}>
        <div className="repo-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Page Header */}
          <div className="repo-heading">
            <div>
              <small>USER ACCOUNT &amp; IDENTITY MANAGEMENT</small>
              <h2>My Profile Details</h2>
              <p>
                Review your institutional role, update your contact details, or securely change your password on demand.
              </p>
            </div>
            {onBack && (
              <div className="repo-heading-right">
                <button
                  type="button"
                  className="secondary"
                  onClick={onBack}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '32px', padding: '0 12px', fontSize: '11px' }}
                >
                  <ArrowLeft size={14} /> Back to Library
                </button>
              </div>
            )}
          </div>

          {/* Main Profile Panel */}
          <section className="repo-panel" style={{ borderTop: '3px solid #0F294A' }}>
            <div className="repo-panel-head">
              <strong>
                <User size={15} aria-hidden="true" /> ACCOUNT PROFILE INFORMATION
              </strong>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="badge" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                  {currentUser?.role || 'STUDENT'}
                </span>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {profileStatus && (
                <div
                  role="status"
                  className={`px-3 py-2 border text-[11px] flex items-center gap-2 ${
                    profileStatus.type === 'success'
                      ? 'bg-[#EDF4FC] border-[#D0DFF0] text-[#003060]'
                      : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                  }`}
                >
                  {profileStatus.type === 'success' ? (
                    <ShieldCheck size={14} className="text-[#1E5F9A] shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="text-[#DC2626] shrink-0" />
                  )}
                  <span>{profileStatus.text}</span>
                </div>
              )}

              {/* Read-Only System Details Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                  padding: '12px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: '11px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={16} className="text-[#64748B]" />
                  <div>
                    <span style={{ display: 'block', color: '#64748B', fontSize: '10px' }}>DEPARTMENT</span>
                    <strong style={{ color: '#0F294A' }}>{formatDeptName(currentUser?.department)}</strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BadgeInfo size={16} className="text-[#64748B]" />
                  <div>
                    <span style={{ display: 'block', color: '#64748B', fontSize: '10px' }}>ACCOUNT STATUS</span>
                    <strong style={{ color: currentUser?.isActive ? '#059669' : '#DC2626' }}>
                      {currentUser?.isActive ? 'Active & Verified' : 'Inactive'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Editable Profile Fields */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                <span style={{ fontWeight: 600, color: '#0F294A' }}>Full Name *</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                  <span style={{ fontWeight: 600, color: '#0F294A' }}>Institutional Email</span>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="email"
                      value={email}
                      disabled
                      title="Email address is managed by system administration"
                      style={{ width: '100%', background: '#F1F5F9', color: '#64748B', cursor: 'not-allowed' }}
                    />
                  </div>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                  <span style={{ fontWeight: 600, color: '#0F294A' }}>Student / Staff ID</span>
                  <input
                    type="text"
                    value={studentOrStaffId}
                    onChange={(e) => setStudentOrStaffId(e.target.value)}
                    placeholder="e.g. STU-2026-041"
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                <span style={{ fontWeight: 600, color: '#0F294A' }}>Phone Number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +268 7600 0000"
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                <span style={{ fontWeight: 600, color: '#0F294A' }}>Short Bio / Academic Focus</span>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Optional notes about your study group or research interests..."
                  style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '11px', padding: '6px 8px' }}
                />
              </label>

              {/* Action Bar (Save Profile + Trigger Password Modal) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setPasswordStatus(null);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setIsPasswordModalOpen(true);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '34px', padding: '0 12px', fontSize: '11px', color: '#0F294A' }}
                >
                  <KeyRound size={14} /> Change Password...
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={isSavingProfile}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '34px', padding: '0 16px', fontSize: '11px' }}
                >
                  <Save size={14} />
                  {isSavingProfile ? 'Saving Changes...' : 'Save Profile Details'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>

      {/* ON-DEMAND CHANGE PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 41, 74, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: '440px',
              borderRadius: '4px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              border: '1px solid #CBD5E1',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                
                alignItems: 'center',
                padding: '12px 16px',
                background: '#0F294A',
                color: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                <Lock size={15} /> CHANGE ACCOUNT PASSWORD
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: 0 }}
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handlePasswordSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {passwordStatus && (
                <div
                  role="status"
                  className={`px-3 py-2 border text-[11px] flex items-center gap-2 ${
                    passwordStatus.type === 'success'
                      ? 'bg-[#EDF4FC] border-[#D0DFF0] text-[#003060]'
                      : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                  }`}
                >
                  {passwordStatus.type === 'success' ? (
                    <ShieldCheck size={14} className="text-[#1E5F9A] shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="text-[#DC2626] shrink-0" />
                  )}
                  <span>{passwordStatus.text}</span>
                </div>
              )}

              {/* Current Password */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                <span style={{ fontWeight: 600, color: '#0F294A' }}>Current Password *</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    required
                    style={{ width: '100%', paddingRight: '34px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 0 }}
                  >
                    {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </label>

              {/* New Password */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                <span style={{ fontWeight: 600, color: '#0F294A' }}>New Password *</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    style={{ width: '100%', paddingRight: '34px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 0 }}
                  >
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </label>

              {/* Confirm New Password */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                <span style={{ fontWeight: 600, color: '#0F294A' }}>Confirm New Password *</span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    style={{ width: '100%', paddingRight: '34px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 0 }}
                  >
                    {showConfirmPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </label>

              <div style={{ fontSize: '10px', color: '#64748B', background: '#F8FAFC', padding: '8px 10px', border: '1px solid #E2E8F0' }}>
                Password must contain at least 8 characters and differ from your current password.
              </div>

              {/* Modal Footer Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsPasswordModalOpen(false)}
                  style={{ minHeight: '32px', padding: '0 12px', fontSize: '11px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={isUpdatingPassword}
                  style={{ minHeight: '32px', padding: '0 14px', fontSize: '11px' }}
                >
                  {isUpdatingPassword ? 'Updating...' : 'Confirm Password Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettings;