'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Department, Role } from '@/types/elibrary';
import type { ProvisionedUser } from '@/app/api/auth';
import {
  AlertCircle,
  Check,
  Download,
  FileSpreadsheet,
  Filter,
  KeyRound,
  Loader2,
  Search,
  Upload,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';

type Props = {
  externalSearch?: string;
  onNotify: (type: 'success' | 'error', message: string) => void;
  openCreateSignal?: number;
};

type ParsedBulkRow = Record<string, unknown> & {
  studentId?: string;
  name: string;
  email: string;
  role: Role;
  department?: Department;
};

const EXCEL_SAMPLE_ROWS = [
  {
    rowNum: 2,
    studentId: 'STU-2026-101',
    name: 'Thabo Mthethwa',
    email: 'thabo.mthethwa@college.ac.sz',
    role: 'STUDENT',
    department: 'SOFTWARE_ENGINEERING',
  },
  {
    rowNum: 3,
    studentId: 'STU-2026-102',
    name: 'Zanele Dlamini',
    email: 'zanele.dlamini@college.ac.sz',
    role: 'STUDENT',
    department: 'CYBER_SECURITY',
  },
  {
    rowNum: 4,
    studentId: 'STF-2026-201',
    name: 'Dr. B. Zwane',
    email: 'b.zwane@college.ac.sz',
    role: 'INSTRUCTOR',
    department: 'MULTIMEDIA',
  },
];

export const AdminUsersSection: React.FC<Props> = ({
  externalSearch = '',
  onNotify,
  openCreateSignal = 0,
}) => {
  const { users, createUser, bulkImportUsers, updateUserStatus } = useAuth();

  // Single user form state
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');
  const [department, setDepartment] = useState<Department>('SOFTWARE_ENGINEERING');
  const [tempPasswordInput, setTempPasswordInput] = useState('');
  const [singleError, setSingleError] = useState('');
  const [isCreatingSingle, setIsCreatingSingle] = useState(false);

  // Modal state & mode
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'single' | 'bulk'>('single');

  // Bulk import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkPreview, setBulkPreview] = useState<ParsedBulkRow[]>([]);
  const [bulkTempPassword, setBulkTempPassword] = useState('password123');
  const [bulkError, setBulkError] = useState('');
  const [onDuplicate, setOnDuplicate] = useState<'skip' | 'update'>('skip');
  const [isImporting, setIsImporting] = useState(false);

  // Temporary credentials report
  const [provisionedReport, setProvisionedReport] = useState<ProvisionedUser[]>([]);

  // Filter & selection state
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  useEffect(() => {
    setSearchQuery(externalSearch);
  }, [externalSearch]);

  useEffect(() => {
    if (openCreateSignal > 0) {
      setModalTab('single');
      setSingleError('');
      setBulkError('');
      setIsCreateModalOpen(true);
    }
  }, [openCreateSignal]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.isActive) ||
        (statusFilter === 'DISABLED' && !u.isActive);
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.studentId && u.studentId.toLowerCase().includes(q)) ||
        u.id.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q));
      return matchesRole && matchesStatus && matchesQuery;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  const visibleIds = useMemo(() => filteredUsers.map((u) => u.id), [filteredUsers]);
  const selectedUsers = useMemo(
    () => filteredUsers.filter((u) => selectedIds.has(u.id)),
    [filteredUsers, selectedIds]
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleOne = (userId: string) => {
    const next = new Set(selectedIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedIds(next);
  };

  const toggleAllVisible = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      visibleIds.forEach((id) => next.delete(id));
    } else {
      visibleIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  const handleToggleSingleStatus = async (userId: string, nextActive: boolean) => {
    setTogglingUserId(userId);
    try {
      await Promise.resolve(updateUserStatus(userId, nextActive));
      onNotify('success', `Account ${nextActive ? 'activated' : 'deactivated'}.`);
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleBulkStatus = async (isActive: boolean) => {
    if (selectedUsers.length === 0) return;
    setIsBatchUpdating(true);
    try {
      for (const u of selectedUsers) {
        await Promise.resolve(updateUserStatus(u.id, isActive));
      }
      const count = selectedUsers.length;
      setSelectedIds(new Set());
      onNotify('success', `${isActive ? 'Activated' : 'Deactivated'} ${count} account(s).`);
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const openModal = (tab: 'single' | 'bulk') => {
    setModalTab(tab);
    setSingleError('');
    setBulkError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError('');

    const trimmedId = studentId.trim().toUpperCase();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (role === 'STUDENT' && !trimmedId) {
      setSingleError('Student ID is required for STUDENT accounts.');
      return;
    }

    const duplicate = users.find(
      (u) =>
        u.email.toLowerCase() === trimmedEmail ||
        (trimmedId && u.studentId && u.studentId.toUpperCase() === trimmedId)
    );
    if (duplicate) {
      setSingleError('An account with this Email or Student ID already exists.');
      return;
    }

    setIsCreatingSingle(true);
    try {
      const initialPassword = tempPasswordInput.trim() || 'password123';
      await Promise.resolve(
        createUser({
          studentId: trimmedId || undefined,
          name: trimmedName,
          email: trimmedEmail,
          role,
          department: role === 'SYSTEM_ADMIN' ? undefined : department,
          password: initialPassword,
          mustChangePassword: true,
          isActive: true,
        })
      );

      setStudentId('');
      setName('');
      setEmail('');
      setTempPasswordInput('');
      setIsCreateModalOpen(false);
      onNotify(
        'success',
        `Account created for ${trimmedName} (temp password: ${initialPassword}).`
      );
    } finally {
      setIsCreatingSingle(false);
    }
  };

  const normalizeDepartment = (raw?: string): Department => {
    const val = (raw || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (val === 'CYBER_SECURITY' || val === 'CYBERSECURITY') return 'CYBER_SECURITY';
    if (val === 'MULTIMEDIA' || val === 'MULTI_MEDIA') return 'MULTIMEDIA';
    return 'SOFTWARE_ENGINEERING';
  };

  const normalizeRole = (raw?: string): Role => {
    const val = (raw || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (val === 'SYSTEM_ADMIN' || val === 'ADMIN') return 'SYSTEM_ADMIN';
    if (val === 'INSTRUCTOR' || val === 'LECTURER' || val === 'STAFF') return 'INSTRUCTOR';
    return 'STUDENT';
  };

  const parseSpreadsheetRows = (text: string): ParsedBulkRow[] => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error('The uploaded file is empty.');
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const rawHeaders = lines[0]
      .split(delimiter)
      .map((c) => c.replace(/^"|"$/g, '').trim());
    const lowerHeaders = rawHeaders.map((h) => h.toLowerCase().replace(/\s+/g, '_'));

    const hasHeader =
      lowerHeaders.includes('name') ||
      lowerHeaders.includes('full_name') ||
      lowerHeaders.includes('email');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const findCol = (aliases: string[], fallback: number) => {
      if (!hasHeader) return fallback;
      for (const alias of aliases) {
        const idx = lowerHeaders.indexOf(alias);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const studentIdIdx = findCol(['student_id', 'studentid', 'student_number', 'reg_no'], -1);
    const nameIdx = findCol(['name', 'full_name', 'fullname'], studentIdIdx === 0 ? 1 : 0);
    const emailIdx = findCol(['email', 'email_address'], studentIdIdx === 0 ? 2 : 1);
    const roleIdx = findCol(['role', 'user_type'], -1);
    const deptIdx = findCol(['department', 'dept'], -1);

    const parsed: ParsedBulkRow[] = [];

    dataLines.forEach((line, idx) => {
      const cols = line.split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim());
      const rowStudentId =
        studentIdIdx >= 0 && cols[studentIdIdx] ? cols[studentIdIdx].toUpperCase() : undefined;
      const rowName = nameIdx >= 0 ? cols[nameIdx] || '' : '';
      const rowEmail = emailIdx >= 0 ? (cols[emailIdx] || '').toLowerCase() : '';

      if (!rowName || !rowEmail || !rowEmail.includes('@')) {
        throw new Error(`Invalid name or email on data row ${idx + 1}: "${line}"`);
      }

      const parsedRole = normalizeRole(roleIdx >= 0 ? cols[roleIdx] : undefined);
      if (parsedRole === 'STUDENT' && !rowStudentId) {
        throw new Error(`Missing student_id for STUDENT on row ${idx + 1} (${rowEmail}).`);
      }

      const parsedDept =
        parsedRole === 'SYSTEM_ADMIN'
          ? undefined
          : normalizeDepartment(deptIdx >= 0 ? cols[deptIdx] : undefined);

      parsed.push({
        studentId: rowStudentId,
        name: rowName,
        email: rowEmail,
        role: parsedRole,
        department: parsedDept,
      });
    });

    if (parsed.length === 0) {
      throw new Error('No valid student or staff records found in the file.');
    }

    return parsed;
  };

  const handleBulkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setBulkError('');
    setBulkPreview([]);
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv' || ext === 'txt' || ext === 'tsv') {
        const text = await file.text();
        setBulkPreview(parseSpreadsheetRows(text));
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const rawText = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
        if (rawText.startsWith('PK')) {
          setBulkError(
            'Binary .xlsx detected. Save your sheet as "CSV (Comma delimited) (*.csv)" to import.'
          );
          return;
        }
        setBulkPreview(parseSpreadsheetRows(rawText));
      } else {
        setBulkError('Unsupported file format. Please upload a .csv or Excel file.');
      }
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : 'Unable to parse the uploaded file.');
    }
  };

  const handleConfirmBulkImport = async () => {
    if (bulkPreview.length === 0) return;
    setIsImporting(true);
    setBulkError('');

    try {
      const result = await bulkImportUsers(bulkPreview, {
        onDuplicate,
        ...(bulkTempPassword.trim() ? { defaultTempPassword: bulkTempPassword.trim() } : {}),
      });
      setProvisionedReport(result.created);
      setBulkPreview([]);
      setBulkFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsCreateModalOpen(false);
      onNotify(
        'success',
        `Bulk import complete: ${result.created.length} created, ${result.updated.length} updated, ${result.skipped.length} skipped.`
      );
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : 'Bulk import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadCredentialsCsv = () => {
    if (provisionedReport.length === 0) return;
    const header = 'student_id,name,email,role,department,temporary_password,must_change_password';
    const rows = provisionedReport.map((u) =>
      [
        u.studentId || '',
        `"${u.name.replace(/"/g, '""')}"`,
        u.email,
        u.role,
        u.department || '',
        u.tempPassword,
        'true',
      ].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'provisioned_temp_credentials.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = [
      'student_id,name,email,role,department',
      'STU-2026-101,Thabo Mthethwa,thabo.mthethwa@college.ac.sz,STUDENT,SOFTWARE_ENGINEERING',
      'STU-2026-102,Zanele Dlamini,zanele.dlamini@college.ac.sz,STUDENT,CYBER_SECURITY',
      'STF-2026-201,Dr. B. Zwane,b.zwane@college.ac.sz,INSTRUCTOR,MULTIMEDIA',
    ].join('\n');

    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'college_bulk_users_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDepartment = (dept?: Department) => {
    if (!dept) return 'System-Wide';
    return dept
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  };

  const formatRoleLabel = (r: Role) => {
    switch (r) {
      case 'SYSTEM_ADMIN':
        return 'System Admin';
      case 'INSTRUCTOR':
        return 'Instructor';
      default:
        return 'Student';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <strong style={{ fontSize: '13px' }}>User Directory &amp; Role Management</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="secondary" onClick={() => openModal('bulk')}>
            <FileSpreadsheet size={14} aria-hidden="true" />
            <span>Bulk Import (CSV / Excel)</span>
          </button>
          <button type="button" className="primary" onClick={() => openModal('single')}>
            <UserPlus size={14} aria-hidden="true" />
            <span>Provision Account</span>
          </button>
        </div>
      </div>

      {provisionedReport.length > 0 && (
        <section className="repo-panel">
          <div className="repo-panel-head">
            <strong>
              <KeyRound size={15} aria-hidden="true" /> NEWLY CREATED TEMPORARY CREDENTIALS ({provisionedReport.length})
            </strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="secondary"
                onClick={handleDownloadCredentialsCsv}
                style={{ minHeight: '24px', fontSize: '10px', padding: '0 8px' }}
              >
                <Download size={12} /> Download CSV
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setProvisionedReport([])}
                style={{ minHeight: '24px', fontSize: '10px', padding: '0 8px' }}
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="repo-table-wrap" style={{ maxHeight: '180px' }}>
            <table className="repo-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Temporary Password</th>
                </tr>
              </thead>
              <tbody>
                {provisionedReport.map((item) => (
                  <tr key={item.id}>
                    <td><code>{item.studentId || '—'}</code></td>
                    <td><strong>{item.name}</strong></td>
                    <td>{item.email}</td>
                    <td>{formatRoleLabel(item.role)}</td>
                    <td><code>{item.tempPassword}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="repo-panel">
        <div className="repo-panel-head">
          <strong>
            <Filter size={15} aria-hidden="true" /> REFINE USER DIRECTORY
          </strong>
          <span>FILTER BY ROLE, STATUS OR KEYWORD</span>
        </div>
        <div className="repo-filters">
          <label>
            <span>System role</span>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="ALL">All Roles</option>
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="SYSTEM_ADMIN">System Admin</option>
            </select>
          </label>
          <label>
            <span>Account status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </label>
          <label className="repo-search">
            <span>Search directory</span>
            <div>
              <Search size={15} aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Student ID, name, email or department..."
              />
            </div>
          </label>
          <button
            type="button"
            className="repo-reset"
            onClick={() => {
              setRoleFilter('ALL');
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
          >
            Reset filters
          </button>
        </div>
      </section>

      <section className="repo-panel">
        <div className="repo-panel-head">
          <strong>
            <Users size={15} aria-hidden="true" /> INSTITUTIONAL USER DIRECTORY
          </strong>
          <span>
            {filteredUsers.length} RECORD{filteredUsers.length === 1 ? '' : 'S'}
          </span>
        </div>

        {selectedUsers.length > 0 && (
          <div className="repo-selection-toolbar" aria-live="polite">
            <div className="repo-selection-summary">
              <span className="repo-selection-check">
                <Check size={13} aria-hidden="true" />
              </span>
              <strong>{selectedUsers.length} selected</strong>
              <span>Apply batch access status updates to selected accounts.</span>
            </div>
            <div className="repo-selection-actions">
              <button
                type="button"
                className="secondary"
                disabled={isBatchUpdating}
                onClick={() => void handleBulkStatus(false)}
              >
                {isBatchUpdating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <UserX size={13} aria-hidden="true" />
                )}
                <span>Deactivate selected</span>
              </button>
              <button
                type="button"
                className="primary repo-download-selected"
                disabled={isBatchUpdating}
                onClick={() => void handleBulkStatus(true)}
              >
                {isBatchUpdating ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <UserCheck size={13} aria-hidden="true" />
                )}
                <span>Activate selected</span>
              </button>
            </div>
          </div>
        )}

        <div className="repo-table-wrap">
          <table className="repo-table">
            <thead>
              <tr>
                <th className="repo-select-column">
                  <button
                    type="button"
                    className="repo-select-all"
                    onClick={toggleAllVisible}
                    aria-label={
                      allVisibleSelected
                        ? 'Deselect all visible users'
                        : 'Select all visible users'
                    }
                    disabled={filteredUsers.length === 0}
                  >
                    <span
                      className={`repo-checkbox-mark${allVisibleSelected ? ' is-checked' : ''}${
                        someVisibleSelected && !allVisibleSelected ? ' is-indeterminate' : ''
                      }`}
                      aria-hidden="true"
                    >
                      {allVisibleSelected ? <Check size={12} /> : null}
                      {someVisibleSelected && !allVisibleSelected ? <span /> : null}
                    </span>
                  </button>
                </th>
                <th>User / Account details</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((u) => {
                const isSelected = selectedIds.has(u.id);
                const isRowBusy = togglingUserId === u.id || isBatchUpdating;

                return (
                  <tr
                    key={u.id}
                    className={`repo-document-row${isSelected ? ' is-selected' : ''}`}
                    onClick={() => toggleOne(u.id)}
                  >
                    <td onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className={`repo-row-checkbox${isSelected ? ' is-checked' : ''}`}
                        onClick={() => toggleOne(u.id)}
                        aria-label={isSelected ? `Deselect ${u.name}` : `Select ${u.name}`}
                        aria-pressed={isSelected}
                      >
                        <span
                          className={`repo-checkbox-mark${isSelected ? ' is-checked' : ''}`}
                          aria-hidden="true"
                        >
                          {isSelected ? <Check size={12} /> : null}
                        </span>
                      </button>
                    </td>

                    <td>
                      <div className="repo-resource-cell">
                        <span className="repo-resource-icon">
                          <UserCog size={16} aria-hidden="true" />
                        </span>
                        <span>
                          <b className="resource-title">{u.name}</b>
                          <span className="course-title">
                            {u.studentId ? `${u.studentId} · ` : ''}
                            {u.email}
                          </span>
                          <small>
                            {u.id.toUpperCase()} · Created {u.createdAt}
                            {u.mustChangePassword ? ' · Must change password' : ''}
                          </small>
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="category">{formatRoleLabel(u.role)}</span>
                    </td>

                    <td className="nowrap">{formatDepartment(u.department)}</td>

                    <td className="nowrap">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-[#003060] font-bold text-[10px]">
                          <span className="w-[7px] h-[7px] rounded-full bg-[#42D392]" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#64748B] font-bold text-[10px]">
                          <span className="w-[7px] h-[7px] rounded-full bg-[#94A3B8]" />
                          Disabled
                        </span>
                      )}
                    </td>

                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="row-actions">
                        <button
                          type="button"
                          disabled={isRowBusy}
                          onClick={() => void handleToggleSingleStatus(u.id, !u.isActive)}
                          className={u.isActive ? 'secondary' : 'primary'}
                        >
                          {togglingUserId === u.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : u.isActive ? (
                            <UserX size={13} aria-hidden="true" />
                          ) : (
                            <UserCheck size={13} aria-hidden="true" />
                          )}
                          <span>{u.isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No user accounts match your search. Try changing the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="repo-table-foot">
          <span>
            Showing {filteredUsers.length} of {users.length} registered accounts
          </span>
          <span>
            {selectedUsers.length > 0
              ? `${selectedUsers.length} selected`
              : 'Select rows for batch actions · RBAC directory synchronized'}
          </span>
        </div>
      </section>

      {/* Provision Account Modal */}
      {isCreateModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isCreatingSingle && !isImporting) {
              setIsCreateModalOpen(false);
            }
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(680px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-modal-title"
          >
            <header>
              <strong id="create-modal-title">
                <UserPlus size={15} aria-hidden="true" />
                ACCOUNT PROVISIONING · RBAC
              </strong>

              <div className="repo-modal-tabs" role="group" aria-label="Provisioning mode">
                <button
                  type="button"
                  className={modalTab === 'single' ? 'active' : ''}
                  onClick={() => setModalTab('single')}
                >
                  <UserPlus size={13} /> Single Account
                </button>
                <button
                  type="button"
                  className={modalTab === 'bulk' ? 'active' : ''}
                  onClick={() => setModalTab('bulk')}
                >
                  <FileSpreadsheet size={13} /> Bulk Upload (CSV / Excel)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isCreatingSingle || isImporting}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              {modalTab === 'single' ? (
                <>
                  <small>INDIVIDUAL PROVISIONING</small>
                  <h2>Create Institutional Account</h2>
                  <p>
                    Create a student, instructor, or admin account. Users must set a new password on first sign-in.
                  </p>

                  {singleError && (
                    <div role="alert" className="repo-alert-error">
                      <AlertCircle size={14} aria-hidden="true" />
                      <span>{singleError}</span>
                    </div>
                  )}

                  <form id="single-user-form" onSubmit={handleCreateUser} className="repo-form">
                    <label className="repo-field">
                      <span>Student ID {role === 'STUDENT' ? '(Required)' : '(Optional)'}</span>
                      <input
                        id="modal-user-student-id"
                        type="text"
                        required={role === 'STUDENT'}
                        placeholder="e.g. STU-2026-105"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        disabled={isCreatingSingle}
                      />
                    </label>

                    <label className="repo-field">
                      <span>Full Name</span>
                      <input
                        id="modal-user-name"
                        type="text"
                        required
                        placeholder="e.g. Thabo Mthethwa"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isCreatingSingle}
                      />
                    </label>

                    <label className="repo-field">
                      <span>Institutional Email</span>
                      <input
                        id="modal-user-email"
                        type="email"
                        required
                        placeholder="e.g. thabo@college.ac.sz"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isCreatingSingle}
                      />
                    </label>

                    <span>Temporary Password (Optional · defaults to password123)</span>
                    <label className="repo-field">
                      <input
                        id="modal-user-temp-pass"
                        type="text"
                        placeholder="Leave blank to use default temporary password"
                        value={tempPasswordInput}
                        onChange={(e) => setTempPasswordInput(e.target.value)}
                        disabled={isCreatingSingle}
                      />
                    </label>

                    <label className="repo-field">
                      <span>System Role</span>
                      <select
                        id="modal-user-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as Role)}
                        disabled={isCreatingSingle}
                      >
                        <option value="STUDENT">Student (Browse &amp; Download)</option>
                        <option value="INSTRUCTOR">Instructor (Upload &amp; Manage)</option>
                        <option value="SYSTEM_ADMIN">System Administrator</option>
                      </select>
                    </label>

                    {role !== 'SYSTEM_ADMIN' && (
                      <label className="repo-field">
                        <span>Assigned Department</span>
                        <select
                          id="modal-user-dept"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value as Department)}
                          disabled={isCreatingSingle}
                        >
                          <option value="SOFTWARE_ENGINEERING">Software Engineering</option>
                          <option value="CYBER_SECURITY">Cyber Security</option>
                          <option value="MULTIMEDIA">Multimedia</option>
                        </select>
                      </label>
                    )}
                  </form>
                </>
              ) : (
                <>
                  <small>BATCH ENROLLMENT · CSV / EXCEL IMPORT</small>
                  <h2>Bulk Account Provisioning</h2>
                  <p>
                    Upload a CSV or Excel roster with student IDs, names, emails, and roles.
                  </p>

                  <div
                    style={{
                      marginTop: '14px',
                      marginBottom: '16px',
                      border: '1px solid #B4C6D8',
                      borderRadius: '2px',
                      background: '#FFFFFF',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        background: '#1E6B43',
                        color: '#FFFFFF',
                        fontSize: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                        <FileSpreadsheet size={13} />
                        <span>roster_template.xlsx — Sheet1 (Row 1 = Headers)</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownloadSampleCsv}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          height: '22px',
                          padding: '0 8px',
                          background: '#FFFFFF',
                          color: '#1E6B43',
                          border: '1px solid #145332',
                          borderRadius: '2px',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        <Download size={11} /> Download CSV Template
                      </button>
                    </div>

                    <div style={{ width: '100%', overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: '10px',
                          fontFamily: 'Consolas, monospace',
                          color: '#0F172A',
                        }}
                      >
                        <thead>
                          <tr style={{ background: '#E6ECF2', color: '#475569', textAlign: 'center' }}>
                            <th style={{ width: '28px', padding: '4px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', background: '#DCE4EC' }} />
                            {['A', 'B', 'C', 'D', 'E'].map((colLetter) => (
                              <th key={colLetter} style={{ padding: '4px 8px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', fontWeight: 'bold' }}>
                                {colLetter}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ background: '#EDF7F1', fontWeight: 'bold', color: '#145332' }}>
                            <td style={{ textAlign: 'center', padding: '5px 4px', background: '#E6ECF2', color: '#475569', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>1</td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>student_id</td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>name</td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>email</td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>role</td>
                            <td style={{ padding: '5px 8px', borderBottom: '1px solid #CBD5E1' }}>department</td>
                          </tr>
                          {EXCEL_SAMPLE_ROWS.map((sample) => (
                            <tr key={sample.rowNum} style={{ background: '#FFFFFF' }}>
                              <td style={{ textAlign: 'center', padding: '5px 4px', background: '#E6ECF2', color: '#475569', fontWeight: 'bold', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #E2E8F0' }}>{sample.rowNum}</td>
                              <td style={{ padding: '5px 8px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{sample.studentId}</td>
                              <td style={{ padding: '5px 8px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{sample.name}</td>
                              <td style={{ padding: '5px 8px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{sample.email}</td>
                              <td style={{ padding: '5px 8px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{sample.role}</td>
                              <td style={{ padding: '5px 8px', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{sample.department}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="repo-form" style={{ marginBottom: '12px' }}>
                    <label className="repo-field">
                      <span>Duplicate Account Handling</span>
                      <select
                        id="bulk-duplicate-mode"
                        value={onDuplicate}
                        onChange={(e) => setOnDuplicate(e.target.value as 'skip' | 'update')}
                        disabled={isImporting}
                      >
                        <option value="skip">Skip existing accounts (by Student ID or Email)</option>
                        <option value="update">Update existing profile details (keep existing password)</option>
                      </select>
                    </label>

                    <label className="repo-field">
                      <span>Batch Temporary Password (Optional)</span>
                      <input
                        id="bulk-temp-password"
                        type="text"
                        placeholder="Auto-generated if left blank"
                        value={bulkTempPassword}
                        onChange={(e) => setBulkTempPassword(e.target.value)}
                        disabled={isImporting}
                      />
                    </label>
                  </div>

                  <div>
                    <label
                      htmlFor="bulk-user-file"
                      className="block text-[10px] font-bold text-[#475467] mb-1.5 uppercase tracking-wider"
                    >
                      Select Roster File (.CSV or Excel)
                    </label>
                    <div
                      style={{
                        border: '1px dashed #94A3B8',
                        background: '#F8FAFC',
                        padding: '16px',
                        borderRadius: '2px',
                        textAlign: 'center',
                      }}
                    >
                      <input
                        ref={fileInputRef}
                        id="bulk-user-file"
                        type="file"
                        accept=".csv,.xlsx,.xls,.txt"
                        onChange={handleBulkFileChange}
                        disabled={isImporting}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        className="secondary"
                        disabled={isImporting}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={13} />
                        <span>{bulkFileName ? `Selected: ${bulkFileName}` : 'Choose CSV / Excel File'}</span>
                      </button>
                    </div>
                  </div>

                  {bulkError && (
                    <div role="alert" className="repo-alert-error">
                      <AlertCircle size={14} aria-hidden="true" />
                      <span>{bulkError}</span>
                    </div>
                  )}

                  {bulkPreview.length > 0 && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#003060', marginBottom: '6px' }}>
                        READY TO IMPORT: {bulkPreview.length} ACCOUNT{bulkPreview.length === 1 ? '' : 'S'}
                      </div>
                      <div className="repo-table-wrap" style={{ maxHeight: '160px', border: '1px solid #CBD5E1' }}>
                        <table className="repo-table">
                          <thead>
                            <tr>
                              <th>Student ID</th>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Department</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkPreview.slice(0, 50).map((row, i) => (
                              <tr key={`${row.email}-${i}`}>
                                <td><code>{row.studentId || '—'}</code></td>
                                <td><strong>{row.name}</strong></td>
                                <td>{row.email}</td>
                                <td><span className="category">{formatRoleLabel(row.role)}</span></td>
                                <td>{formatDepartment(row.department)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                disabled={isCreatingSingle || isImporting}
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              {modalTab === 'single' ? (
                <button
                  type="submit"
                  form="single-user-form"
                  className="primary"
                  disabled={isCreatingSingle}
                >
                  {isCreatingSingle ? (
                    <>
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={13} aria-hidden="true" />
                      <span>Create Account &amp; Assign Role</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="primary"
                  disabled={bulkPreview.length === 0 || isImporting}
                  onClick={() => void handleConfirmBulkImport()}
                >
                  {isImporting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={13} aria-hidden="true" />
                      <span>
                        {`Import ${bulkPreview.length > 0 ? `${bulkPreview.length} Accounts` : 'Accounts'}`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};