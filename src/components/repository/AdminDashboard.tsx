'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Role, Department } from '@/types/elibrary';
import {
  Users,
  UserPlus,
  Check,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  UserCog,
  Filter,
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
} from 'lucide-react';
import PortalHeader from './PortalHeader';

/**
 * ============================================================================
 * BULK USER IMPORT SPECIFICATION (CSV / EXCEL TEMPLATE FORMAT)
 * ============================================================================
 * To support rapid onboarding of hundreds of existing college students or staff,
 * upload a CSV file (.csv) or Excel file (.xlsx / .xls - saved/exported as CSV
 * or parsed client-side) structured with the following headers in Row 1:
 *
 *   name,email,role,department
 *
 * Example CSV Content:
 * ----------------------------------------------------------------------------
 * name,email,role,department
 * Thabo Mthethwa,thabo.mthethwa@college.ac.sz,STUDENT,SOFTWARE_ENGINEERING
 * Zanele Dlamini,zanele.dlamini@college.ac.sz,STUDENT,CYBER_SECURITY
 * Sipho Nkosi,sipho.nkosi@college.ac.sz,STUDENT,MULTIMEDIA
 * Dr. B. Zwane,b.zwane@college.ac.sz,INSTRUCTOR,SOFTWARE_ENGINEERING
 * ----------------------------------------------------------------------------
 *
 * Column Rules:
 * 1. name       (Required) : Full name of the student or staff member.
 * 2. email      (Required) : Unique institutional email address.
 * 3. role       (Optional) : STUDENT | INSTRUCTOR | SYSTEM_ADMIN (Defaults to STUDENT)
 * 4. department (Optional) : SOFTWARE_ENGINEERING | CYBER_SECURITY | MULTIMEDIA
 *                            (Defaults to SOFTWARE_ENGINEERING if omitted for non-admins)
 * ============================================================================
 */

type Props = {
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  onNavigateHome?: () => void;
};

type ParsedBulkUser = {
  name: string;
  email: string;
  role: Role;
  department?: Department;
};

export const AdminDashboard: React.FC<Props> = ({
  onSearch,
  onLogout,
  onNavigateHome,
}) => {
  const { users, createUser, updateUserStatus, logout } = useAuth();

  // Single user form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');
  const [department, setDepartment] = useState<Department>('SOFTWARE_ENGINEERING');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state & mode ('single' | 'bulk')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'single' | 'bulk'>('single');

  // Bulk upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkPreview, setBulkPreview] = useState<ParsedBulkUser[]>([]);
  const [bulkError, setBulkError] = useState('');

  // Filter state aligned with DocumentFilters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Row selection state aligned with DocumentsTable
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

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

  const activeCount = useMemo(
    () => users.filter((u) => u.isActive).length,
    [users]
  );

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

  const handleBulkStatus = (isActive: boolean) => {
    selectedUsers.forEach((u) => updateUserStatus(u.id, isActive));
    setSelectedIds(new Set());
  };

  const openModal = (tab: 'single' | 'bulk' = 'single') => {
    setModalTab(tab);
    setBulkError('');
    setIsCreateModalOpen(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUser({
      name: name.trim(),
      email: email.trim(),
      role,
      department: role === 'SYSTEM_ADMIN' ? undefined : department,
      isActive: true,
    });
    setName('');
    setEmail('');
    setIsCreateModalOpen(false);
    setSuccessMsg('Account provisioned and RBAC privileges assigned.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Normalize department strings from spreadsheets (e.g., "Software Engineering" -> "SOFTWARE_ENGINEERING")
  const normalizeDepartment = (raw?: string): Department => {
    const val = (raw || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (val === 'CYBER_SECURITY' || val === 'CYBERSECURITY') return 'CYBER_SECURITY';
    if (val === 'MULTIMEDIA' || val === 'MULTI_MEDIA') return 'MULTIMEDIA';
    return 'SOFTWARE_ENGINEERING';
  };

  // Normalize role strings from spreadsheets
  const normalizeRole = (raw?: string): Role => {
    const val = (raw || '').trim().toUpperCase().replace(/\s+/g, '_');
    if (val === 'SYSTEM_ADMIN' || val === 'ADMIN') return 'SYSTEM_ADMIN';
    if (val === 'INSTRUCTOR' || val === 'LECTURER' || val === 'STAFF') return 'INSTRUCTOR';
    return 'STUDENT';
  };

  // Parse CSV or tab-delimited text from uploaded file
  const parseSpreadsheetRows = (text: string): ParsedBulkUser[] => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error('The uploaded file is empty.');
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const firstCols = lines[0].split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim().toLowerCase());
    const hasHeader = firstCols.includes('name') || firstCols.includes('email');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const nameIdx = hasHeader && firstCols.indexOf('name') !== -1 ? firstCols.indexOf('name') : 0;
    const emailIdx = hasHeader && firstCols.indexOf('email') !== -1 ? firstCols.indexOf('email') : 1;
    const roleIdx = hasHeader && firstCols.indexOf('role') !== -1 ? firstCols.indexOf('role') : 2;
    const deptIdx = hasHeader && firstCols.indexOf('department') !== -1 ? firstCols.indexOf('department') : 3;

    const parsed: ParsedBulkUser[] = [];

    dataLines.forEach((line, idx) => {
      const cols = line.split(delimiter).map((c) => c.replace(/^"|"$/g, '').trim());
      const rowName = cols[nameIdx] || '';
      const rowEmail = cols[emailIdx] || '';

      if (!rowName || !rowEmail || !rowEmail.includes('@')) {
        throw new Error(`Invalid name or email on data row ${idx + 1}: "${line}"`);
      }

      const parsedRole = normalizeRole(cols[roleIdx]);
      const parsedDept =
        parsedRole === 'SYSTEM_ADMIN' ? undefined : normalizeDepartment(cols[deptIdx]);

      parsed.push({
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
        const records = parseSpreadsheetRows(text);
        setBulkPreview(records);
      } else if (ext === 'xlsx' || ext === 'xls') {
        // Attempt text extraction or prompt CSV export if binary XLSX library is not installed
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const rawText = decoder.decode(buffer);
        if (rawText.startsWith('PK')) {
          setBulkError(
            'Binary .xlsx detected. Please save your Excel spreadsheet as "CSV (Comma delimited) (*.csv)" before uploading, or install the "xlsx" parser package.'
          );
          return;
        }
        const records = parseSpreadsheetRows(rawText);
        setBulkPreview(records);
      } else {
        setBulkError('Unsupported file format. Please upload a .csv or Excel (.xlsx/.xls) file.');
      }
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : 'Unable to parse the uploaded file.');
    }
  };

  const handleConfirmBulkImport = () => {
    if (bulkPreview.length === 0) return;

    bulkPreview.forEach((record) => {
      createUser({
        name: record.name,
        email: record.email,
        role: record.role,
        department: record.department,
        isActive: true,
      });
    });

    const count = bulkPreview.length;
    setBulkPreview([]);
    setBulkFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsCreateModalOpen(false);
    setSuccessMsg(`Successfully provisioned ${count} institutional account${count === 1 ? '' : 's'} via bulk upload.`);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = [
      'name,email,role,department',
      'Thabo Mthethwa,thabo.mthethwa@college.ac.sz,STUDENT,SOFTWARE_ENGINEERING',
      'Zanele Dlamini,zanele.dlamini@college.ac.sz,STUDENT,CYBER_SECURITY',
      'Sipho Nkosi,sipho.nkosi@college.ac.sz,STUDENT,MULTIMEDIA',
      'Dr. B. Zwane,b.zwane@college.ac.sz,INSTRUCTOR,SOFTWARE_ENGINEERING',
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
    <div className="repo-page">
      {/* Shared PortalHeader Component */}
      <PortalHeader
        appName="Digital Resource Library"
        workspaceName="System Administration Workspace"
        version="v1.0"
        systemStatus="Online"
        onSearch={onSearch}
        onLogout={onLogout || logout}
        onNewItem={() => openModal('single')}
        onSettings={onNavigateHome}
      />

      <main className="repo-main" style={{ marginTop: '24px' }}>
        <div className="repo-content">
          {/* Page Header aligned with RepositoryContent */}
          <div className="repo-heading">
            <div>
              <small>SYSTEM ADMINISTRATION · ACCESS CONTROL</small>
              <h2>User Directory &amp; Role Management</h2>
              <p>
                Provision individual or bulk institutional accounts, assign role-based privileges, and manage active access.
              </p>
            </div>
            <div className="repo-heading-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => openModal('bulk')}
                  style={{ height: '32px', padding: '0 12px', fontSize: '11px' }}
                >
                  <FileSpreadsheet size={14} aria-hidden="true" />
                  <span>Bulk Import (CSV / Excel)</span>
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => openModal('single')}
                  style={{ height: '32px', padding: '0 14px', fontSize: '11px' }}
                >
                  <UserPlus size={14} aria-hidden="true" />
                  <span>Provision Account</span>
                </button>
              </div>
              <div className="repo-count">
                <strong>
                  {activeCount} / {users.length}
                </strong>
                <span>ACTIVE ACCOUNTS</span>
              </div>
            </div>
          </div>

          {successMsg && (
            <div
              role="status"
              className="px-3 py-2 bg-[#EDF4FC] border border-[#D0DFF0] text-[#003060] text-[11px] flex items-center gap-2"
            >
              <ShieldCheck size={14} className="text-[#1E5F9A] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Filter Bar Panel aligned with DocumentFilters */}
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
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="ALL">All Roles</option>
                  <option value="STUDENT">Student</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="SYSTEM_ADMIN">System Admin</option>
                </select>
              </label>
              <label>
                <span>Account status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
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
                    placeholder="Name, email, user ID or department..."
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

          {/* Registered Users Directory Table Panel */}
          <section className="repo-panel">
            <div className="repo-panel-head">
              <strong>
                <Users size={15} aria-hidden="true" />
                INSTITUTIONAL USER DIRECTORY
              </strong>
              <span>
                {filteredUsers.length} RECORD{filteredUsers.length === 1 ? '' : 'S'}
              </span>
            </div>

            {/* Bulk Selection Toolbar */}
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
                    onClick={() => handleBulkStatus(false)}
                  >
                    <UserX size={13} aria-hidden="true" />
                    Deactivate selected
                  </button>
                  <button
                    type="button"
                    className="primary repo-download-selected"
                    onClick={() => handleBulkStatus(true)}
                  >
                    <UserCheck size={13} aria-hidden="true" />
                    Activate selected
                  </button>
                </div>
              </div>
            )}

            {/* Structured Data Table */}
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
                        title={
                          allVisibleSelected
                            ? 'Deselect all visible'
                            : 'Select all visible'
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

                    return (
                      <tr
                        key={u.id}
                        className={`repo-document-row${isSelected ? ' is-selected' : ''}`}
                        onClick={() => toggleOne(u.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            if (event.target === event.currentTarget) {
                              event.preventDefault();
                              toggleOne(u.id);
                            }
                          }
                        }}
                        tabIndex={0}
                        aria-label={`Select ${u.name}`}
                      >
                        <td onClick={(event) => event.stopPropagation()}>
                          <button
                            type="button"
                            className={`repo-row-checkbox${isSelected ? ' is-checked' : ''}`}
                            onClick={() => toggleOne(u.id)}
                            aria-label={
                              isSelected ? `Deselect ${u.name}` : `Select ${u.name}`
                            }
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
                              <span className="course-title">{u.email}</span>
                              <small>
                                {u.id.toUpperCase()} · Created {u.createdAt}
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
                              onClick={() => updateUserStatus(u.id, !u.isActive)}
                              className={u.isActive ? 'secondary' : 'primary'}
                            >
                              {u.isActive ? (
                                <>
                                  <UserX size={13} aria-hidden="true" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck size={13} aria-hidden="true" />
                                  Activate
                                </>
                              )}
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
        </div>
      </main>

      {/* On-Demand Provision Account Modal (Single Entry & Bulk CSV/Excel Import) */}
      {isCreateModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(640px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-modal-title"
          >
            <header>
              <strong id="create-modal-title">
                <UserPlus size={15} aria-hidden="true" />
                ACCOUNT PROVISIONING · RBAC
              </strong>

              {/* Mode Switcher Tabs matching DocumentPreviewModal */}
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
                    Register a single student, instructor, or administrator account and assign role privileges.
                  </p>

                  <form id="single-user-form" onSubmit={handleCreateUser} className="space-y-4 mt-4">
                    <div>
                      <label
                        htmlFor="modal-user-name"
                        className="block text-[10px] font-bold text-[#475467] mb-1 uppercase tracking-wider"
                      >
                        Full Name
                      </label>
                      <input
                        id="modal-user-name"
                        type="text"
                        required
                        placeholder="e.g. Thabo Mthethwa"
                        className="h-[36px] w-full border border-[#AAB7C6] rounded-[2px] bg-white text-[#1E293B] text-[11px] px-[9px] focus:outline-2 focus:outline-[#C8D8F0] focus:border-[#1E5F9A]"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="modal-user-email"
                        className="block text-[10px] font-bold text-[#475467] mb-1 uppercase tracking-wider"
                      >
                        Institutional Email
                      </label>
                      <input
                        id="modal-user-email"
                        type="email"
                        required
                        placeholder="e.g. thabo@college.ac.sz"
                        className="h-[36px] w-full border border-[#AAB7C6] rounded-[2px] bg-white text-[#1E293B] text-[11px] px-[9px] focus:outline-2 focus:outline-[#C8D8F0] focus:border-[#1E5F9A]"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="modal-user-role"
                        className="block text-[10px] font-bold text-[#475467] mb-1 uppercase tracking-wider"
                      >
                        System Role
                      </label>
                      <select
                        id="modal-user-role"
                        className="h-[36px] w-full border border-[#AAB7C6] rounded-[2px] bg-white text-[#1E293B] text-[11px] px-[9px] focus:outline-2 focus:outline-[#C8D8F0] focus:border-[#1E5F9A]"
                        value={role}
                        onChange={(e) => setRole(e.target.value as Role)}
                      >
                        <option value="STUDENT">Student (Browse &amp; Download)</option>
                        <option value="INSTRUCTOR">Instructor (Upload &amp; Manage)</option>
                        <option value="SYSTEM_ADMIN">System Administrator</option>
                      </select>
                    </div>

                    {role !== 'SYSTEM_ADMIN' && (
                      <div>
                        <label
                          htmlFor="modal-user-dept"
                          className="block text-[10px] font-bold text-[#475467] mb-1 uppercase tracking-wider"
                        >
                          Assigned Department
                        </label>
                        <select
                          id="modal-user-dept"
                          className="h-[36px] w-full border border-[#AAB7C6] rounded-[2px] bg-white text-[#1E293B] text-[11px] px-[9px] focus:outline-2 focus:outline-[#C8D8F0] focus:border-[#1E5F9A]"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value as Department)}
                        >
                          <option value="SOFTWARE_ENGINEERING">Software Engineering</option>
                          <option value="CYBER_SECURITY">Cyber Security</option>
                          <option value="MULTIMEDIA">Multimedia</option>
                        </select>
                      </div>
                    )}
                  </form>
                </>
              ) : (
                <>
                  <small>BATCH ENROLLMENT · CSV / EXCEL IMPORT</small>
                  <h2>Bulk Account Provisioning</h2>
                  <p>
                    Upload a CSV or Excel spreadsheet containing existing college student or faculty rosters to create hundreds of accounts at once.
                  </p>

                  {/* Template Format Reference Box */}
                  <div className="topics" style={{ marginTop: '14px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <b>EXPECTED SPREADSHEET COLUMNS (ROW 1 HEADERS)</b>
                      <button
                        type="button"
                        className="secondary"
                        onClick={handleDownloadSampleCsv}
                        style={{ minHeight: '24px', fontSize: '9px', padding: '0 8px' }}
                      >
                        <Download size={11} /> Download CSV Template
                      </button>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '8px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        fontSize: '10px',
                        fontFamily: 'Consolas, monospace',
                        color: '#0F172A',
                        overflowX: 'auto',
                      }}
                    >
{`name,email,role,department
Thabo Mthethwa,thabo.mthethwa@college.ac.sz,STUDENT,SOFTWARE_ENGINEERING
Zanele Dlamini,zanele.dlamini@college.ac.sz,STUDENT,CYBER_SECURITY`}
                    </pre>
                  </div>

                  {/* File Upload Dropzone / Input */}
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
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={13} />
                        <span>{bulkFileName ? `Selected: ${bulkFileName}` : 'Choose CSV / Excel File'}</span>
                      </button>
                      <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#64748B' }}>
                        Role defaults to <code>STUDENT</code> and Department defaults to <code>SOFTWARE_ENGINEERING</code> if omitted.
                      </p>
                    </div>
                  </div>

                  {bulkError && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '8px 10px',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#B91C1C',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                      }}
                    >
                      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                      <span>{bulkError}</span>
                    </div>
                  )}

                  {/* Preview Parsed Records */}
                  {bulkPreview.length > 0 && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#003060', marginBottom: '6px' }}>
                        READY TO IMPORT: {bulkPreview.length} ACCOUNT{bulkPreview.length === 1 ? '' : 'S'}
                      </div>
                      <div className="repo-table-wrap" style={{ maxHeight: '160px', border: '1px solid #CBD5E1' }}>
                        <table className="repo-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Department</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bulkPreview.slice(0, 50).map((row, i) => (
                              <tr key={`${row.email}-${i}`}>
                                <td><strong>{row.name}</strong></td>
                                <td>{row.email}</td>
                                <td><span className="category">{formatRoleLabel(row.role)}</span></td>
                                <td>{formatDepartment(row.department)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {bulkPreview.length > 50 && (
                        <p style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
                          Showing first 50 of {bulkPreview.length} parsed records...
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              {modalTab === 'single' ? (
                <button
                  type="submit"
                  form="single-user-form"
                  className="primary"
                >
                  <UserPlus size={13} aria-hidden="true" />
                  <span>Create Account &amp; Assign Role</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="primary"
                  disabled={bulkPreview.length === 0}
                  onClick={handleConfirmBulkImport}
                >
                  <Upload size={13} aria-hidden="true" />
                  <span>Import {bulkPreview.length > 0 ? `${bulkPreview.length} Accounts` : 'Accounts'}</span>
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};