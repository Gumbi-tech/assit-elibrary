'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  fetchAuthorizedDocumentBlobUrl,
  fetchCoursesRequest,
  fetchDepartmentsRequest,
  fetchDocumentsRequest,
  type CourseRecord,
  type DepartmentRecord,
  type DocumentRecord,
} from '@/lib/library-api';
import type { RepositoryDocument } from '@/types/repository';
import {
  AlertCircle,
  LayoutGrid,
  List,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import PortalHeader from './PortalHeader';
import DocumentsTable from './DocumentsTable';
import DocumentsGallery from './DocumentsGallery';
import DocumentPreviewModal from './DocumentPreviewModal';
import DepartmentCourseFilter from './DepartmentCourseFilter';
import UserSettings from './UserSettings';

type Props = {
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  onNavigateHome?: () => void;
};

type DocumentRecordWithUrl = DocumentRecord & {
  signedUrl?: string;
  uploadedBy?: { id: string; fullName: string; email: string } | null;
};

type PreviewableRepositoryDocument = RepositoryDocument & {
  previewUrl?: string;
};

const STUDENT_CATEGORIES = [
  'Lecture Notes',
  'Lab Manual',
  'Syllabus & Guide',
  'Past Assessment',
] as const;

function normalizeDeptValue(val?: string | null): string {
  return (val || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function getDocDepartmentId(doc: DocumentRecordWithUrl): string | null {
  return doc.departmentId ?? doc.course?.departmentId ?? null;
}

export const StudentLibrary: React.FC<Props> = ({
  onSearch,
  onLogout,
  onNavigateHome: _onNavigateHome,
}) => {
  const { currentUser, logout } = useAuth();

  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecordWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('gallery');

  const [successMsg, setSuccessMsg] = useState('');
  const [pageError, setPageError] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [previewDoc, setPreviewDoc] = useState<PreviewableRepositoryDocument | null>(
    null
  );
  const [previewLoadingDocId, setPreviewLoadingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [isDownloadingSelected, setIsDownloadingSelected] = useState(false);

  // Resolve the student's assigned department strictly from database records
  const assignedDepartmentRecord = useMemo<DepartmentRecord | null>(() => {
    const userDeptId = (currentUser as { departmentId?: string | null } | null)
      ?.departmentId;
    if (userDeptId) {
      const byId = departments.find((d) => d.id === userDeptId);
      if (byId) return byId;
    }

    const normalizedUserDept = normalizeDeptValue(currentUser?.department);
    if (!normalizedUserDept) return null;

    return (
      departments.find((d) => {
        const normName = normalizeDeptValue(d.name);
        const normCode = normalizeDeptValue(d.code);
        const initials = normName
          .split(' ')
          .filter(Boolean)
          .map((w) => w[0])
          .join('');
        return (
          normName === normalizedUserDept ||
          normCode === normalizedUserDept ||
          initials === normalizedUserDept ||
          normName.includes(normalizedUserDept) ||
          normalizedUserDept.includes(normName)
        );
      }) ?? null
    );
  }, [currentUser, departments]);

  const assignedDepartmentId = assignedDepartmentRecord?.id ?? '';
  const assignedDepartmentLabel =
    assignedDepartmentRecord?.name ||
    currentUser?.department ||
    'Assigned Program';

  const departmentDoesNotExist =
    Boolean(currentUser?.department?.trim()) &&
    !isLoading &&
    departments.length > 0 &&
    !assignedDepartmentId;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const closePreviewModal = useCallback(() => {
    setPreviewLoadingDocId(null);
    setPreviewDoc((prev) => {
      if (prev?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  }, []);

  const loadStudentDocuments = useCallback(
    async (opts?: { showSpinner?: boolean }) => {
      const showSpinner = opts?.showSpinner ?? !hasLoadedOnce;
      if (showSpinner) setIsLoading(true);
      setPageError('');

      try {
        const deptRes = await fetchDepartmentsRequest();
        const loadedDepts =
          deptRes.ok && deptRes.departments ? deptRes.departments : [];

        if (deptRes.ok && deptRes.departments) {
          setDepartments(deptRes.departments);
        } else if (deptRes.error) {
          setPageError(deptRes.error);
        }

        const userDeptId = (currentUser as { departmentId?: string | null } | null)
          ?.departmentId;
        const normalizedUserDept = normalizeDeptValue(currentUser?.department);

        const matchedDept = userDeptId
          ? loadedDepts.find((d) => d.id === userDeptId) ?? null
          : normalizedUserDept
          ? loadedDepts.find((d) => {
              const normName = normalizeDeptValue(d.name);
              const normCode = normalizeDeptValue(d.code);
              const initials = normName
                .split(' ')
                .filter(Boolean)
                .map((w) => w[0])
                .join('');
              return (
                normName === normalizedUserDept ||
                normCode === normalizedUserDept ||
                initials === normalizedUserDept ||
                normName.includes(normalizedUserDept) ||
                normalizedUserDept.includes(normName)
              );
            }) ?? null
          : null;

        if (currentUser?.department?.trim() && loadedDepts.length > 0 && !matchedDept) {
          setCourses([]);
          setDocuments([]);
          setSelectedIds(new Set());
          setPageError(
            `Program "${currentUser.department.trim()}" does not exist in the database.`
          );
          return;
        }

        if (!matchedDept?.id) {
          setCourses([]);
          setDocuments([]);
          setSelectedIds(new Set());
          return;
        }

        const [courseRes, docRes] = await Promise.all([
          fetchCoursesRequest(matchedDept.id),
          fetchDocumentsRequest({
            departmentId: matchedDept.id,
            ...(courseFilter !== 'ALL' ? { courseId: courseFilter } : {}),
          }),
        ]);

        if (courseRes.ok && courseRes.courses) {
          setCourses(courseRes.courses);
        } else if (courseRes.error) {
          setPageError((prev) => prev || courseRes.error || '');
        }

        if (docRes.ok && docRes.documents) {
          // Strict client-side guard so only documents in the student's department appear
          const ownDeptDocs = (docRes.documents as DocumentRecordWithUrl[]).filter(
            (doc) => getDocDepartmentId(doc) === matchedDept.id
          );
          setDocuments(ownDeptDocs);
        } else if (docRes.error) {
          setPageError((prev) => prev || docRes.error || '');
        }
      } catch (err) {
        setPageError(
          err instanceof Error ? err.message : 'Failed to load Program library.'
        );
      } finally {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    },
    [courseFilter, currentUser, hasLoadedOnce]
  );

  useEffect(() => {
    void loadStudentDocuments({ showSpinner: !hasLoadedOnce });
  }, [currentUser?.id, currentUser?.department, courseFilter, loadStudentDocuments, hasLoadedOnce]);

  useEffect(() => {
    if (
      courseFilter !== 'ALL' &&
      courses.length > 0 &&
      !courses.some((c) => c.id === courseFilter)
    ) {
      setCourseFilter('ALL');
    }
  }, [courses, courseFilter]);

  const handleResetFilters = useCallback(() => {
    setCourseFilter('ALL');
    setCategoryFilter('ALL');
    setSearchQuery('');
  }, []);

  // Students only read and download PDFs belonging to their own department
  const filteredDocuments = useMemo(() => {
    if (!assignedDepartmentId) return [];

    return documents.filter((doc) => {
      if (getDocDepartmentId(doc) !== assignedDepartmentId) {
        return false;
      }

      if (courseFilter !== 'ALL' && doc.courseId !== courseFilter) {
        return false;
      }

      const isPdf =
        doc.mimeType === 'application/pdf' ||
        doc.filename.toLowerCase().endsWith('.pdf');
      if (!isPdf) return false;

      const docCategory = doc.category || 'Course PDF';
      if (
        categoryFilter !== 'ALL' &&
        docCategory.toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }

      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesFile = doc.filename.toLowerCase().includes(q);
        const matchesCourse =
          doc.course?.code?.toLowerCase().includes(q) ||
          doc.course?.title?.toLowerCase().includes(q) ||
          doc.id.toLowerCase().includes(q);
        if (!matchesName && !matchesFile && !matchesCourse) return false;
      }

      return true;
    });
  }, [documents, assignedDepartmentId, courseFilter, categoryFilter, searchQuery]);

  const mappedDocuments: RepositoryDocument[] = useMemo(() => {
    return filteredDocuments.map((doc) => ({
      docId: doc.id,
      courseCode: doc.course?.code || assignedDepartmentRecord?.code || 'DEPT',
      courseTitle: doc.course?.title || assignedDepartmentLabel,
      department: doc.department?.name || assignedDepartmentLabel,
      title: doc.name,
      summary: `${doc.category || 'Course PDF'} · ${doc.filename}`,
      category: doc.category || 'Course PDF',
      author: doc.uploadedBy?.fullName || 'Course Instructor',
      size: formatFileSize(doc.size),
      pages: 1,
      uploadDate: doc.createdAt
        ? doc.createdAt.split('T')[0]
        : new Date().toISOString().split('T')[0],
      topics: doc.course
        ? `${doc.course.code} - ${doc.course.title}`
        : assignedDepartmentLabel,
    }));
  }, [filteredDocuments, assignedDepartmentRecord?.code, assignedDepartmentLabel]);

  const resolveStreamUrl = (doc: DocumentRecordWithUrl, download = false): string => {
    const base = doc.signedUrl || `/api/documents/${encodeURIComponent(doc.id)}/file`;
    if (!download) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}download=1`;
  };

  const handlePreviewDoc = useCallback(
    async (doc: RepositoryDocument) => {
      setPageError('');
      setPreviewLoadingDocId(doc.docId);
      setPreviewDoc({ ...doc, previewUrl: undefined });

      try {
        const match = documents.find((item) => item.id === doc.docId);
        if (!match) {
          return;
        }

        const streamUrl = resolveStreamUrl(match, false);
        if (streamUrl.startsWith('blob:')) {
          setPreviewDoc({ ...doc, previewUrl: streamUrl });
          return;
        }

        const fetched = await fetchAuthorizedDocumentBlobUrl(streamUrl);
        if (!fetched.ok || !fetched.blobUrl) {
          setPageError(fetched.error || 'Unable to load PDF preview.');
          return;
        }

        setPreviewDoc({
          ...doc,
          previewUrl: fetched.blobUrl,
        });
      } finally {
        setPreviewLoadingDocId(null);
      }
    },
    [documents]
  );

  const handleDownload = useCallback(
    async (doc: RepositoryDocument) => {
      setPageError('');
      setDownloadingDocId(doc.docId);

      try {
        const match = documents.find((item) => item.id === doc.docId);
        if (!match) {
          setPageError('Document record not found.');
          return;
        }

        const downloadUrl = resolveStreamUrl(match, true);
        const fetched = await fetchAuthorizedDocumentBlobUrl(downloadUrl);
        if (!fetched.ok || !fetched.blobUrl) {
          setPageError(fetched.error || 'Failed to download PDF.');
          return;
        }

        const link = document.createElement('a');
        link.href = fetched.blobUrl;
        link.download = match.filename || `${doc.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(fetched.blobUrl!), 2000);

        setSuccessMsg(`Downloaded "${doc.title}".`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } finally {
        setDownloadingDocId((prev) => (prev === doc.docId ? null : prev));
      }
    },
    [documents]
  );

  const handleDownloadSelected = useCallback(
    async (docs: RepositoryDocument[]) => {
      if (docs.length === 0) return;
      setIsDownloadingSelected(true);
      try {
        for (const doc of docs) {
          await handleDownload(doc);
        }
        setSelectedIds(new Set());
      } finally {
        setIsDownloadingSelected(false);
      }
    },
    [handleDownload]
  );

  if (showSettings) {
    return (
      <UserSettings
        onBack={() => setShowSettings(false)}
        onLogout={onLogout || logout}
      />
    );
  }

  const hasActiveFilters =
    courseFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    searchQuery.trim().length > 0;

  return (
    <div className="repo-page">
      <PortalHeader
        appName="Digital Resource Library"
        workspaceName={`Student Portal · ${assignedDepartmentLabel}`}
        version="v1.0"
        systemStatus="Online"
        onSearch={(q) => {
          setSearchQuery(q);
          onSearch?.(q);
        }}
        onLogout={onLogout || logout}
        onSettings={() => setShowSettings(true)}
      />

      <main className="repo-main" style={{ marginTop: '24px' }}>
        <div className="repo-content">
          <div className="repo-heading">
            <div />
            <div className="repo-heading-right">
              <div
                role="group"
                aria-label="Layout view"
                style={{ display: 'inline-flex', border: '1px solid #AAB7C6', borderRadius: '2px' }}
              >
                <button
                  type="button"
                  className={viewMode === 'table' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('table')}
                  style={{ border: 'none', minHeight: '32px', padding: '0 10px', fontSize: '11px' }}
                  title="Table View"
                >
                  <List size={14} /> Table View
                </button>
                <button
                  type="button"
                  className={viewMode === 'gallery' ? 'primary' : 'secondary'}
                  onClick={() => setViewMode('gallery')}
                  style={{ border: 'none', minHeight: '32px', padding: '0 10px', fontSize: '11px' }}
                  title="Gallery View"
                >
                  <LayoutGrid size={14} /> Gallery View
                </button>
              </div>
              <div className="repo-count">
                <strong>{filteredDocuments.length}</strong>
                <span>AVAILABLE PDFs</span>
              </div>
            </div>
          </div>

          {pageError && (
            <div
              role="alert"
              className="px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[11px] flex items-center gap-2"
            >
              <AlertCircle size={14} className="shrink-0" />
              <span>{pageError}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="px-3 py-2 bg-[#EDF4FC] border border-[#D0DFF0] text-[#003060] text-[11px] flex items-center gap-2"
            >
              <ShieldCheck size={14} className="text-[#1E5F9A] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <DepartmentCourseFilter
            panelBadge={assignedDepartmentLabel.toUpperCase()}
            courses={courses}
            categories={STUDENT_CATEGORIES}
            courseFilter={courseFilter}
            categoryFilter={categoryFilter}
            searchQuery={searchQuery}
            disabled={departmentDoesNotExist || !assignedDepartmentId}
            onCourseChange={setCourseFilter}
            onCategoryChange={setCategoryFilter}
            onSearchChange={setSearchQuery}
            onReset={handleResetFilters}
          />

          {departmentDoesNotExist ? (
            <section className="repo-panel">
              <div className="empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
                <Lock size={32} style={{ margin: '0 auto 12px', color: '#B91C1C' }} />
                <h3 style={{ margin: '0 0 6px', color: '#B91C1C', fontSize: '16px', fontWeight: 'bold' }}>
                  Program Does Not Exist
                </h3>
                <p style={{ margin: 0, color: '#64748B', fontSize: '11px', maxWidth: '420px', marginInline: 'auto' }}>
                  Your program &ldquo;{currentUser?.department}&rdquo; does not exist in the database.
                </p>
              </div>
            </section>
          ) : isLoading ? (
            <section className="repo-panel">
              <div style={{ padding: '32px', textAlign: 'center', fontSize: '12px', color: '#475569' }}>
                Loading PDFs for {assignedDepartmentLabel}...
              </div>
            </section>
          ) : filteredDocuments.length === 0 ? (
            <section className="repo-panel">
              <div className="empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
                <Lock size={32} style={{ margin: '0 auto 12px', color: '#64748B' }} />
                <h3 style={{ margin: '0 0 6px', color: '#0F294A', fontSize: '16px', fontWeight: 'bold' }}>
                  {hasActiveFilters ? 'No Matching PDFs Found' : 'No Content in Your Program'}
                </h3>
                <p style={{ margin: 0, color: '#64748B', fontSize: '11px', maxWidth: '420px', marginInline: 'auto' }}>
                  {hasActiveFilters
                    ? `No PDFs match your active filters in ${assignedDepartmentLabel}.`
                    : `Your Program (${assignedDepartmentLabel}) currently has no content available.`}
                </p>
              </div>
            </section>
          ) : viewMode === 'gallery' ? (
            <DocumentsGallery
              documents={mappedDocuments}
              total={filteredDocuments.length}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPreview={(d) => void handlePreviewDoc(d)}
              onDownload={(d) => void handleDownload(d)}
              onDownloadSelected={(docs) => void handleDownloadSelected(docs)}
            />
          ) : (
            <DocumentsTable
              documents={mappedDocuments}
              total={filteredDocuments.length}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPreview={handlePreviewDoc}
              onDownload={handleDownload}
              onDownloadSelected={handleDownloadSelected}
              loadingDocId={previewLoadingDocId}
              downloadingDocId={downloadingDocId}
              isDownloadingSelected={isDownloadingSelected}
            />
          )}
        </div>
      </main>

      <DocumentPreviewModal
        document={previewDoc}
        onClose={closePreviewModal}
        onDownload={handleDownload}
        isLoading={Boolean(previewLoadingDocId && previewDoc?.docId === previewLoadingDocId)}
        isDownloading={Boolean(downloadingDocId && previewDoc?.docId === downloadingDocId)}
      />
    </div>
  );
};
