'use client';

import type { ExtendedUser } from '@/context/AuthContext';
import type { ProvisionedUser } from '@/app/api/auth';

export interface BulkImportResponseData {
  created: ProvisionedUser[];
  updated: ExtendedUser[];
  skipped: Array<{ email: string; studentId?: string; reason: string }>;
}

export async function fetchAccountsRequest(): Promise<{
  ok: boolean;
  users?: ExtendedUser[];
  error?: string;
}> {
  const res = await fetch('/api/accounts', { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to load accounts.' };
  }
  return { ok: true, users: data.users };
}

export async function createAccountRequest(payload: {
  studentId?: string;
  name: string;
  email: string;
  role: ExtendedUser['role'];
  department?: ExtendedUser['department'];
  password?: string;
  mustChangePassword?: boolean;
  isActive?: boolean;
  profileData?: Record<string, unknown>;
}): Promise<{
  ok: boolean;
  user?: ExtendedUser;
  tempPassword?: string;
  error?: string;
}> {
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to create account.' };
  }
  return { ok: true, user: data.user, tempPassword: data.tempPassword };
}

export async function bulkImportAccountsRequest(
  rows: Array<Record<string, unknown>>,
  options: { onDuplicate?: 'skip' | 'update'; defaultTempPassword?: string } = {}
): Promise<{
  ok: boolean;
  data?: BulkImportResponseData;
  error?: string;
}> {
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'bulk',
      rows,
      onDuplicate: options.onDuplicate || 'skip',
      defaultTempPassword: options.defaultTempPassword,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to import accounts.' };
  }
  return { ok: true, data: data.data };
}

export async function updateAccountStatusRequest(
  id: string,
  isActive: boolean
): Promise<{
  ok: boolean;
  user?: ExtendedUser;
  error?: string;
}> {
  const res = await fetch('/api/accounts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, isActive }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to update account status.' };
  }
  return { ok: true, user: data.user };
}