'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Role, Department } from '@/types/elibrary';
import type { ProvisionedUser } from '@/app/api/auth';
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
  KeyRound,
  Building2,
  BookOpen,
  Layers3,
} from 'lucide-react';
import PortalHeader from './PortalHeader';
import {
  createCourseRequest,
  createDepartmentRequest,
  deleteCourseRequest,
  deleteDepartmentRequest,
  fetchCoursesRequest,
  fetchDepartmentsRequest,
  updateCourseRequest,
  updateDepartmentRequest,
  type CourseRecord,
  type DepartmentRecord,
} from '@/lib/library-api';

/**
 * BULK USER IMPORT TEMPLATE FORMAT (ROW 1 HEADERS):
 *   student_id,name,email,role,department,program,year_of_study,phone
 *
 * - student_id : Required for STUDENT accounts (used as login identifier alongside email).
 * - name       : Required full name of student or staff member.
 * - email      : Required unique institutional email address.
 * - role       : Optional (STUDENT | INSTRUCTOR | SYSTEM_ADMIN). Defaults to STUDENT.
 * - department : Optional (SOFTWARE_ENGINEERING | CYBER_SECURITY | MULTIMEDIA).
 * - Extra columns are preserved automatically in profileData.
 */

type Props = {
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  onNavigateHome?: () => void;
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

export const AdminDashboard: React.FC<Props> = ({
  onSearch,
  onLogout,
  onNavigateHome,
}) => {
  const { users, createUser, bulkImportUsers, updateUserStatus, logout } = useAuth();

  // Single user form state
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');
  const [department, setDepartment] = useState<Department>('SOFTWARE_ENGINEERING');
  const [tempPasswordInput, setTempPasswordInput] = useState('');
  const [singleError, setSingleError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal state & mode ('single' | 'bulk')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'single' | 'bulk'>('single');

  // Academic catalogue management (departments and courses)
  const [isAcademicModalOpen, setIsAcademicModalOpen] = useState(false);
  const [academicTab, setAcademicTab] = useState<'departments' | 'courses'>('departments');
  const [academicDepartments, setAcademicDepartments] = useState<DepartmentRecord[]>([]);
  const [academicCourses, setAcademicCourses] = useState<CourseRecord[]>([]);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentCode, setDepartmentCode] = useState('');
  const [departmentDescription, setDepartmentDescription] = useState('');
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [deletingDepartmentId, setDeletingDepartmentId] = useState<string | null>(null);
  const [isDepartmentFormOpen, setIsDepartmentFormOpen] = useState(false);
  const [isCourseFormOpen, setIsCourseFormOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseDepartmentId, setCourseDepartmentId] = useState('');
  const [courseCredits, setCourseCredits] = useState(3);
  const [courseDescription, setCourseDescription] = useState('');
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [academicError, setAcademicError] = useState('');
  const [academicStatus, setAcademicStatus] = useState('');
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);

  // Bulk upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkPreview, setBulkPreview] = useState<ParsedBulkRow[]>([]);
  const [bulkError, setBulkError] = useState('');
  const [onDuplicate, setOnDuplicate] = useState<'skip' | 'update'>('skip');
  const [isImporting, setIsImporting] = useState(false);

  // One-time temporary credentials report after bulk creation
  const [provisionedReport, setProvisionedReport] = useState<ProvisionedUser[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Row selection state
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
    setSingleError('');
    setIsCreateModalOpen(true);
  };

  const openAcademicModal = async () => {
    setAcademicError('');
    setAcademicStatus('');
    setIsAcademicModalOpen(true);
    const [departmentResult, courseResult] = await Promise.all([
      fetchDepartmentsRequest(),
      fetchCoursesRequest(),
    ]);
    if (departmentResult.ok && departmentResult.departments) {
      setAcademicDepartments(departmentResult.departments);
      if (!courseDepartmentId && departmentResult.departments[0]) {
        setCourseDepartmentId(departmentResult.departments[0].id);
      }
    } else {
      setAcademicError(departmentResult.error || 'Unable to load departments.');
    }
    if (courseResult.ok && courseResult.courses) {
      setAcademicCourses(courseResult.courses);
    } else {
      setAcademicError((current) => current || courseResult.error || 'Unable to load courses.');
    }
  };

  const refreshAcademicCatalogue = async () => {
    const [departmentResult, courseResult] = await Promise.all([
      fetchDepartmentsRequest(),
      fetchCoursesRequest(),
    ]);
    if (departmentResult.ok && departmentResult.departments) {
      setAcademicDepartments(departmentResult.departments);
    }
    if (courseResult.ok && courseResult.courses) {
      setAcademicCourses(courseResult.courses);
    }
  };

  const handleStartEditDepartment = (dept: DepartmentRecord) => {
    setAcademicError('');
    setAcademicStatus('');
    setEditingDepartmentId(dept.id);
    setDepartmentName(dept.name);
    setDepartmentCode(dept.code || '');
    setDepartmentDescription(dept.description || '');
    setIsDepartmentFormOpen(true);
  };

  const handleOpenNewDepartmentForm = () => {
    setAcademicError('');
    setAcademicStatus('');
    setEditingDepartmentId(null);
    setDepartmentName('');
    setDepartmentCode('');
    setDepartmentDescription('');
    setIsDepartmentFormOpen(true);
  };

  const handleCancelEditDepartment = () => {
    setEditingDepartmentId(null);
    setDepartmentName('');
    setDepartmentCode('');
    setDepartmentDescription('');
    setIsDepartmentFormOpen(false);
  };

  const handleOpenNewCourseForm = () => {
    setAcademicError('');
    setAcademicStatus('');
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseCode('');
    setCourseCredits(3);
    setCourseDescription('');
    if (!courseDepartmentId && academicDepartments[0]) {
      setCourseDepartmentId(academicDepartments[0].id);
    }
    setIsCourseFormOpen(true);
  };

  const handleStartEditCourse = (course: CourseRecord) => {
    setAcademicError('');
    setAcademicStatus('');
    setEditingCourseId(course.id);
    setCourseTitle(course.title);
    setCourseCode(course.code);
    setCourseDepartmentId(course.departmentId);
    setCourseCredits(course.credits);
    setCourseDescription(course.description || '');
    setIsCourseFormOpen(true);
  };

  const handleCancelEditCourse = () => {
    setEditingCourseId(null);
    setCourseTitle('');
    setCourseCode('');
    setCourseCredits(3);
    setCourseDescription('');
    setIsCourseFormOpen(false);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcademicError('');
    setAcademicStatus('');
    setIsSavingAcademic(true);
    try {
      if (editingDepartmentId) {
        const result = await updateDepartmentRequest(editingDepartmentId, {
          name: departmentName.trim(),
          code: departmentCode.trim() ? departmentCode.trim().toUpperCase() : null,
          description: departmentDescription.trim() ? departmentDescription.trim() : null,
        });
        if (!result.ok || !result.department) {
          setAcademicError(result.error || 'Could not update department.');
          return;
        }
        const updatedName = result.department.name;
        setEditingDepartmentId(null);
        setDepartmentName('');
        setDepartmentCode('');
        setDepartmentDescription('');
        setIsDepartmentFormOpen(false);
        setAcademicStatus(`Department “${updatedName}” updated successfully.`);
        await refreshAcademicCatalogue();
        return;
      }

      const result = await createDepartmentRequest({
        name: departmentName.trim(),
        code: departmentCode.trim() || undefined,
        description: departmentDescription.trim() || undefined,
      });
      if (!result.ok || !result.department) {
        setAcademicError(result.error || 'Could not create department.');
        return;
      }
      setDepartmentName('');
      setDepartmentCode('');
      setDepartmentDescription('');
      setIsDepartmentFormOpen(false);
      setCourseDepartmentId(result.department.id);
      setAcademicStatus(`Department “${result.department.name}” created successfully.`);
      await refreshAcademicCatalogue();
    } catch {
      setAcademicError('A network error occurred while saving the department.');
    } finally {
      setIsSavingAcademic(false);
    }
  };

  const handleDeleteDepartment = async (dept: DepartmentRecord) => {
    setAcademicError('');
    setAcademicStatus('');
    setDeletingDepartmentId(dept.id);
    try {
      const result = await deleteDepartmentRequest(dept.id);
      if (!result.ok) {
        setAcademicError(result.error || 'Could not delete department.');
        return;
      }
      if (editingDepartmentId === dept.id) {
        handleCancelEditDepartment();
      }
      if (courseDepartmentId === dept.id) {
        setCourseDepartmentId('');
      }
      setAcademicStatus(`Department “${dept.name}” deleted.`);
      await refreshAcademicCatalogue();
    } catch {
      setAcademicError('A network error occurred while deleting the department.');
    } finally {
      setDeletingDepartmentId(null);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcademicError('');
    setAcademicStatus('');
    setIsSavingAcademic(true);
    try {
      if (editingCourseId) {
        const result = await updateCourseRequest(editingCourseId, {
          title: courseTitle.trim(),
          code: courseCode.trim().toUpperCase(),
          departmentId: courseDepartmentId,
          credits: courseCredits,
          description: courseDescription.trim() ? courseDescription.trim() : null,
        });
        if (!result.ok || !result.course) {
          setAcademicError(result.error || 'Could not update course.');
          return;
        }
        const updatedLabel = `${result.course.code} — ${result.course.title}`;
        setEditingCourseId(null);
        setCourseTitle('');
        setCourseCode('');
        setCourseCredits(3);
        setCourseDescription('');
        setIsCourseFormOpen(false);
        setAcademicStatus(`Course “${updatedLabel}” updated successfully.`);
        await refreshAcademicCatalogue();
        return;
      }

      const result = await createCourseRequest({
        title: courseTitle.trim(),
        code: courseCode.trim(),
        departmentId: courseDepartmentId,
        credits: courseCredits,
        description: courseDescription.trim() || undefined,
      });
      if (!result.ok || !result.course) {
        setAcademicError(result.error || 'Could not create course.');
        return;
      }
      setCourseTitle('');
      setCourseCode('');
      setCourseDescription('');
      setIsCourseFormOpen(false);
      setAcademicStatus(`Course “${result.course.code} — ${result.course.title}” created successfully.`);
      await refreshAcademicCatalogue();
    } catch {
      setAcademicError('A network error occurred while saving the course.');
    } finally {
      setIsSavingAcademic(false);
    }
  };

  const handleDeleteCourse = async (course: CourseRecord) => {
    setAcademicError('');
    setAcademicStatus('');
    setDeletingCourseId(course.id);
    try {
      const result = await deleteCourseRequest(course.id);
      if (!result.ok) {
        setAcademicError(result.error || 'Could not delete course.');
        return;
      }
      if (editingCourseId === course.id) {
        handleCancelEditCourse();
      }
      setAcademicStatus(`Course “${course.code} — ${course.title}” deleted.`);
      await refreshAcademicCatalogue();
    } catch {
      setAcademicError('A network error occurred while deleting the course.');
    } finally {
      setDeletingCourseId(null);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
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

    const initialPassword = tempPasswordInput.trim() || 'password123';

    createUser({
      studentId: trimmedId || undefined,
      name: trimmedName,
      email: trimmedEmail,
      role,
      department: role === 'SYSTEM_ADMIN' ? undefined : department,
      password: initialPassword,
      mustChangePassword: true,
      isActive: true,
    });

    setStudentId('');
    setName('');
    setEmail('');
    setTempPasswordInput('');
    setIsCreateModalOpen(false);
    setSuccessMsg(
      `Account created for ${trimmedName} (temp password: ${initialPassword}; forced password change on first login).`
    );
    setTimeout(() => setSuccessMsg(''), 6000);
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

    const knownIndices = new Set(
      [studentIdIdx, nameIdx, emailIdx, roleIdx, deptIdx].filter((i) => i >= 0)
    );

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

      const extraProfile: Record<string, unknown> = {};
      cols.forEach((colVal, colIndex) => {
        if (!knownIndices.has(colIndex) && colVal !== '') {
          const key = hasHeader
            ? rawHeaders[colIndex] || `column_${colIndex + 1}`
            : `column_${colIndex + 1}`;
          extraProfile[key] = colVal;
        }
      });

      parsed.push({
        studentId: rowStudentId,
        name: rowName,
        email: rowEmail,
        role: parsedRole,
        department: parsedDept,
        ...(Object.keys(extraProfile).length > 0 ? { profileData: extraProfile } : {}),
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
        const buffer = await file.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const rawText = decoder.decode(buffer);
        if (rawText.startsWith('PK')) {
          setBulkError(
            'Binary .xlsx detected. Save your Excel sheet as "CSV (Comma delimited) (*.csv)" to parse cleanly in the browser.'
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

  const handleConfirmBulkImport = async () => {
    if (bulkPreview.length === 0) return;
    setIsImporting(true);
    setBulkError('');

    try {
      const result = await bulkImportUsers(bulkPreview, { onDuplicate });
      setProvisionedReport(result.created);
      setBulkPreview([]);
      setBulkFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsCreateModalOpen(false);
      setSuccessMsg(
        `Bulk import complete: ${result.created.length} created, ${result.updated.length} updated, ${result.skipped.length} skipped.`
      );
      setTimeout(() => setSuccessMsg(''), 6000);
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
      'STU-2026-103,Sipho Nkosi,sipho.nkosi@college.ac.sz,STUDENT,MULTIMEDIA',
      'STF-2026-201,Dr. B. Zwane,b.zwane@college.ac.sz,INSTRUCTOR,SOFTWARE_ENGINEERING',
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
          <div className="repo-heading">
            <div>
              <small>SYSTEM ADMINISTRATION · ACCESS CONTROL</small>
              <h2>User Directory &amp; Role Management</h2>
              <p>
                Provision individual or bulk institutional accounts with temporary passwords and first-login password enforcement.
              </p>
            </div>
            <div className="repo-heading-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={openAcademicModal}
                  style={{ height: '32px', padding: '0 12px', fontSize: '11px' }}
                >
                  <Layers3 size={14} aria-hidden="true" />
                  <span>Departments &amp; Courses</span>
                </button>
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

          {/* One-Time Temporary Credentials Handout Panel */}
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

          {/* Filter Bar Panel */}
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

      {/* Provision Account Modal (Single Entry & Bulk CSV/Excel Import) */}
      {isCreateModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
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
                      />
                    </label>

                    <label className="repo-field">
                      <span>Temporary Password (Optional · defaults to password123)</span>
                      <input
                        id="modal-user-temp-pass"
                        type="text"
                        placeholder="Leave blank to use default temporary password"
                        value={tempPasswordInput}
                        onChange={(e) => setTempPasswordInput(e.target.value)}
                      />
                    </label>

                    <label className="repo-field">
                      <span>System Role</span>
                      <select
                        id="modal-user-role"
                        value={role}
                        onChange={(e) => setRole(e.target.value as Role)}
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
                    Upload a CSV or Excel roster with student IDs, names, emails, and roles. New accounts get a temporary password and must change it on first login.
                  </p>

                  {/* Real Excel-Style Spreadsheet Template Grid */}
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

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 8px',
                        background: '#F3F6F9',
                        borderBottom: '1px solid #CBD5E1',
                        fontSize: '10px',
                        fontFamily: 'Consolas, monospace',
                        color: '#475569',
                      }}
                    >
                      <span
                        style={{
                          padding: '1px 6px',
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          fontWeight: 'bold',
                          color: '#0F172A',
                        }}
                      >
                        A1
                      </span>
                      <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>fx</span>
                      <span>student_id</span>
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
                            <th
                              style={{
                                width: '28px',
                                padding: '4px',
                                borderRight: '1px solid #CBD5E1',
                                borderBottom: '1px solid #CBD5E1',
                                background: '#DCE4EC',
                              }}
                            />
                            {['A', 'B', 'C', 'D', 'E'].map((colLetter) => (
                              <th
                                key={colLetter}
                                style={{
                                  padding: '4px 8px',
                                  borderRight: '1px solid #CBD5E1',
                                  borderBottom: '1px solid #CBD5E1',
                                  fontWeight: 'bold',
                                }}
                              >
                                {colLetter}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ background: '#EDF7F1', fontWeight: 'bold', color: '#145332' }}>
                            <td
                              style={{
                                textAlign: 'center',
                                padding: '5px 4px',
                                background: '#E6ECF2',
                                color: '#475569',
                                borderRight: '1px solid #CBD5E1',
                                borderBottom: '1px solid #CBD5E1',
                              }}
                            >
                              1
                            </td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>
                              student_id
                            </td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>
                              name
                            </td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>
                              email
                            </td>
                            <td style={{ padding: '5px 8px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1' }}>
                              role
                            </td>
                            <td style={{ padding: '5px 8px', borderBottom: '1px solid #CBD5E1' }}>
                              department
                            </td>
                          </tr>

                          {EXCEL_SAMPLE_ROWS.map((sample) => (
                            <tr key={sample.rowNum} style={{ background: '#FFFFFF' }}>
                              <td
                                style={{
                                  textAlign: 'center',
                                  padding: '5px 4px',
                                  background: '#E6ECF2',
                                  color: '#475569',
                                  fontWeight: 'bold',
                                  borderRight: '1px solid #CBD5E1',
                                  borderBottom: '1px solid #E2E8F0',
                                }}
                              >
                                {sample.rowNum}
                              </td>
                              <td style={{ padding: '5px 8px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                                {sample.studentId}
                              </td>
                              <td style={{ padding: '5px 8px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                                {sample.name}
                              </td>
                              <td style={{ padding: '5px 8px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                                {sample.email}
                              </td>
                              <td style={{ padding: '5px 8px', borderRight: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                                {sample.role}
                              </td>
                              <td style={{ padding: '5px 8px', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                                {sample.department}
                              </td>
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
                      >
                        <option value="skip">Skip existing accounts (by Student ID or Email)</option>
                        <option value="update">Update existing profile details (keep existing password)</option>
                      </select>
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
                        Extra columns in your spreadsheet are automatically saved in profileData.
                      </p>
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
                  disabled={bulkPreview.length === 0 || isImporting}
                  onClick={handleConfirmBulkImport}
                >
                  <Upload size={13} aria-hidden="true" />
                  <span>
                    {isImporting
                      ? 'Importing...'
                      : `Import ${bulkPreview.length > 0 ? `${bulkPreview.length} Accounts` : 'Accounts'}`}
                  </span>
                </button>
              )}
            </footer>
          </section>
        </div>
      )}

      {/* Academic Catalogue Modal */}
      {isAcademicModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsAcademicModalOpen(false);
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(760px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="academic-modal-title"
          >
            <header>
              <strong id="academic-modal-title">
                <Layers3 size={15} aria-hidden="true" />
                ACADEMIC CATALOGUE · STRUCTURE
              </strong>
              <div className="repo-modal-tabs" role="group" aria-label="Catalogue management">
                <button
                  type="button"
                  className={academicTab === 'departments' ? 'active' : ''}
                  onClick={() => { setAcademicTab('departments'); setAcademicError(''); setAcademicStatus(''); }}
                >
                  <Building2 size={13} /> Departments
                </button>
                <button
                  type="button"
                  className={academicTab === 'courses' ? 'active' : ''}
                  onClick={() => { setAcademicTab('courses'); setAcademicError(''); setAcademicStatus(''); }}
                >
                  <BookOpen size={13} /> Courses
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsAcademicModalOpen(false)}
                aria-label="Close academic catalogue"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <small>INSTITUTIONAL STRUCTURE</small>
              <h2>{academicTab === 'departments' ? 'Manage Departments' : 'Manage Courses'}</h2>
              <p>
                {academicTab === 'departments'
                  ? 'Create, update, or delete departments to organise the institution’s academic catalogue.'
                  : 'Create, update, or delete courses and assign each course to its owning department.'}
              </p>

              {academicError && (
                <div role="alert" className="repo-alert-error">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{academicError}</span>
                </div>
              )}
              {academicStatus && (
                <div role="status" className="repo-alert-error" style={{ borderColor: "#B7D8C4", background: "#F0F8F3", color: "#245C3B" }}>
                  <Check size={14} aria-hidden="true" />
                  <span>{academicStatus}</span>
                </div>
              )}

              {academicTab === 'departments' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '12px' }}>Existing Departments</strong>
                      <span className="repo-count"><strong>{academicDepartments.length}</strong><span>DEPARTMENTS</span></span>
                    </div>
                    {!isDepartmentFormOpen && (
                      <button
                        type="button"
                        className="primary"
                        onClick={handleOpenNewDepartmentForm}
                      >
                        <Building2 size={13} aria-hidden="true" />
                        <span>New Department</span>
                      </button>
                    )}
                  </div>

                  {isDepartmentFormOpen && (
                    <form
                      className="repo-form"
                      onSubmit={handleSaveDepartment}
                      style={{ padding: '14px', border: '1px solid #CBD5E1', borderRadius: '2px', background: '#F8FAFC' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '12px' }}>
                          {editingDepartmentId ? 'Edit Department' : 'Create New Department'}
                        </strong>
                        <button
                          type="button"
                          className="secondary"
                          onClick={handleCancelEditDepartment}
                          disabled={isSavingAcademic}
                        >
                          Hide Form
                        </button>
                      </div>
                      <label className="repo-field">
                        <span>Department Name</span>
                        <input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} required placeholder="e.g. Engineering" />
                      </label>
                      <label className="repo-field">
                        <span>Department Code <small>(Optional)</small></span>
                        <input value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())} placeholder="e.g. ENG" />
                      </label>
                      <label className="repo-field">
                        <span>Description <small>(Optional)</small></span>
                        <textarea value={departmentDescription} onChange={(e) => setDepartmentDescription(e.target.value)} rows={3} placeholder="Briefly describe this department" />
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button type="submit" className="primary" disabled={isSavingAcademic || !departmentName.trim()}>
                          <Building2 size={13} aria-hidden="true" />
                          <span>
                            {isSavingAcademic
                              ? 'Saving...'
                              : editingDepartmentId
                                ? 'Update Department'
                                : 'Create Department'}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={handleCancelEditDepartment}
                          disabled={isSavingAcademic}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="repo-table-wrap" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    <table className="repo-table">
                      <thead><tr><th>Department</th><th>Code</th><th>Actions</th></tr></thead>
                      <tbody>
                        {academicDepartments.length ? academicDepartments.map((item) => (
                          <tr key={item.id}>
                            <td><strong>{item.name}</strong>{item.description ? <div style={{ color: '#68737D', fontSize: '11px', marginTop: '3px' }}>{item.description}</div> : null}</td>
                            <td>{item.code || '—'}</td>
                            <td>
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => handleStartEditDepartment(item)}
                                  disabled={deletingDepartmentId === item.id}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => handleDeleteDepartment(item)}
                                  disabled={deletingDepartmentId === item.id}
                                >
                                  {deletingDepartmentId === item.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : <tr><td colSpan={3}>No departments created yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '12px' }}>Existing Courses</strong>
                      <span className="repo-count"><strong>{academicCourses.length}</strong><span>COURSES</span></span>
                    </div>
                    {!isCourseFormOpen && (
                      <button
                        type="button"
                        className="primary"
                        onClick={handleOpenNewCourseForm}
                      >
                        <BookOpen size={13} aria-hidden="true" />
                        <span>New Course</span>
                      </button>
                    )}
                  </div>

                  {isCourseFormOpen && (
                    <form
                      className="repo-form"
                      onSubmit={handleSaveCourse}
                      style={{ padding: '14px', border: '1px solid #CBD5E1', borderRadius: '2px', background: '#F8FAFC' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '12px' }}>
                          {editingCourseId ? 'Edit Course' : 'Create New Course'}
                        </strong>
                        <button
                          type="button"
                          className="secondary"
                          onClick={handleCancelEditCourse}
                          disabled={isSavingAcademic}
                        >
                          Hide Form
                        </button>
                      </div>
                      <label className="repo-field">
                        <span>Course Title</span>
                        <input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} required placeholder="e.g. Introduction to Programming" />
                      </label>
                      <label className="repo-field">
                        <span>Course Code</span>
                        <input value={courseCode} onChange={(e) => setCourseCode(e.target.value.toUpperCase())} required placeholder="e.g. CMP101" />
                      </label>
                      <label className="repo-field">
                        <span>Department</span>
                        <select value={courseDepartmentId} onChange={(e) => setCourseDepartmentId(e.target.value)} required disabled={academicDepartments.length === 0}>
                          <option value="">Select a department</option>
                          {academicDepartments.map((item) => <option key={item.id} value={item.id}>{item.name}{item.code ? ` (${item.code})` : ''}</option>)}
                        </select>
                        {academicDepartments.length === 0 && <small>Create a department before adding courses.</small>}
                      </label>
                      <label className="repo-field">
                        <span>Credits</span>
                        <input type="number" min={1} step={1} value={courseCredits} onChange={(e) => setCourseCredits(Math.max(1, Number(e.target.value) || 1))} required />
                      </label>
                      <label className="repo-field">
                        <span>Description <small>(Optional)</small></span>
                        <textarea value={courseDescription} onChange={(e) => setCourseDescription(e.target.value)} rows={3} placeholder="Brief course description" />
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button type="submit" className="primary" disabled={isSavingAcademic || !courseTitle.trim() || !courseCode.trim() || !courseDepartmentId}>
                          <BookOpen size={13} aria-hidden="true" />
                          <span>
                            {isSavingAcademic
                              ? 'Saving...'
                              : editingCourseId
                                ? 'Update Course'
                                : 'Create Course'}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={handleCancelEditCourse}
                          disabled={isSavingAcademic}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="repo-table-wrap" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                    <table className="repo-table">
                      <thead><tr><th>Course</th><th>Code</th><th>Department</th><th>Actions</th></tr></thead>
                      <tbody>
                        {academicCourses.length ? academicCourses.map((item) => (
                          <tr key={item.id}>
                            <td><strong>{item.title}</strong><div style={{ color: '#68737D', fontSize: '11px', marginTop: '3px' }}>{item.credits} credits</div></td>
                            <td>{item.code}</td>
                            <td>{item.department?.name || academicDepartments.find((d) => d.id === item.departmentId)?.name || '—'}</td>
                            <td>
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => handleStartEditCourse(item)}
                                  disabled={deletingCourseId === item.id}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => handleDeleteCourse(item)}
                                  disabled={deletingCourseId === item.id}
                                >
                                  {deletingCourseId === item.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )) : <tr><td colSpan={4}>No courses created yet.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <footer>
              <button type="button" className="secondary" onClick={() => setIsAcademicModalOpen(false)}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};