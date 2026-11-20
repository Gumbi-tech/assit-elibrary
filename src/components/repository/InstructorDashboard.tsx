'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  deleteDocumentRequest,
  fetchAuthorizedDocumentBlobUrl,
  fetchCoursesRequest,
  fetchDepartmentsRequest,
  fetchDocumentsRequest,
  updateDocumentRequest,
  uploadDocumentRequest,
  type CourseRecord,
  type DepartmentRecord,
  type DocumentRecord,
} from '@/lib/library-api';
import type { RepositoryDocument } from '@/types/repository';
import {
  FileUp,
  Search,
  ShieldCheck,
  Filter,
  X,
  Upload,
  FileText,
  AlertCircle,
  LayoutGrid,
  List,
  BookOpen,
  Pencil,
  Trash2,
} from 'lucide-react';
import PortalHeader from './PortalHeader';
import DocumentsTable from './DocumentsTable';
import DocumentsGallery from './DocumentsGallery';
import DocumentPreviewModal from './DocumentPreviewModal';

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

const CATEGORIES = [
  'Lecture Notes',
  'Lab Manual',
  'Syllabus & Guide',
  'Past Assessment',
];

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

export const InstructorDashboard: React.FC<Props> = ({
  onSearch,
  onLogout,
  onNavigateHome,
}) => {
  const { currentUser, logout } = useAuth();

  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecordWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    'Assigned Department';
  const assignedDepartmentCode = assignedDepartmentRecord?.code || 'DEPT';

  const departmentDoesNotExist =
    Boolean(currentUser?.department?.trim()) &&
    !isLoading &&
    departments.length > 0 &&
    !assignedDepartmentId;

  const [successMsg, setSuccessMsg] = useState('');
  const [pageError, setPageError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [editError, setEditError] = useState('');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);

  const [editingDoc, setEditingDoc] = useState<DocumentRecordWithUrl | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState(CATEGORIES[0]);
  const [editCourseId, setEditCourseId] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [courseFilter, setCourseFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [previewDoc, setPreviewDoc] = useState<PreviewableRepositoryDocument | null>(
    null
  );

  const notify = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const closePreviewModal = useCallback(() => {
    setPreviewDoc((prev) => {
      if (prev?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  }, []);

  const loadWorkspaceData = useCallback(
    async (opts?: { deptId?: string; courseId?: string; showSpinner?: boolean }) => {
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

        const matchedDept =
          opts?.deptId
            ? loadedDepts.find((d) => d.id === opts.deptId) ?? null
            : userDeptId
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
            `Department "${currentUser.department.trim()}" does not exist in the database.`
          );
          return;
        }

        const effectiveDeptId = matchedDept?.id ?? opts?.deptId ?? '';
        const targetCourseId = opts?.courseId ?? courseFilter;

        const [courseRes, docRes] = await Promise.all([
          fetchCoursesRequest(effectiveDeptId || undefined),
          fetchDocumentsRequest({
            ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
            ...(targetCourseId !== 'ALL' ? { courseId: targetCourseId } : {}),
          }),
        ]);

        if (courseRes.ok && courseRes.courses) {
          setCourses(courseRes.courses);
        } else if (courseRes.error) {
          setPageError((prev) => prev || courseRes.error || '');
        }

        if (docRes.ok && docRes.documents) {
          const scopedDocs = (docRes.documents as DocumentRecordWithUrl[]).filter(
            (doc) => {
              if (!effectiveDeptId) return true;
              const docDeptId = getDocDepartmentId(doc);
              return docDeptId === effectiveDeptId;
            }
          );
          setDocuments(scopedDocs);
        } else if (docRes.error) {
          setPageError((prev) => prev || docRes.error || '');
        }
      } catch (err) {
        setPageError(
          err instanceof Error ? err.message : 'Failed to load instructor workspace.'
        );
      } finally {
        setIsLoading(false);
        setHasLoadedOnce(true);
      }
    },
    [courseFilter, currentUser, hasLoadedOnce]
  );

  useEffect(() => {
    void loadWorkspaceData({ showSpinner: !hasLoadedOnce });
  }, [currentUser?.id, currentUser?.department, courseFilter, loadWorkspaceData, hasLoadedOnce]);

  useEffect(() => {
    if (
      courseFilter !== 'ALL' &&
      courses.length > 0 &&
      !courses.some((c) => c.id === courseFilter)
    ) {
      setCourseFilter('ALL');
    }
  }, [courses, courseFilter]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (assignedDepartmentId) {
        const docDeptId = getDocDepartmentId(doc);
        if (docDeptId !== assignedDepartmentId) return false;
      }

      if (courseFilter !== 'ALL' && doc.courseId !== courseFilter) {
        return false;
      }

      const isPdf =
        doc.mimeType === 'application/pdf' ||
        doc.filename.toLowerCase().endsWith('.pdf');
      if (!isPdf) return false;

      const docCategory = doc.category || 'Course PDF';
      if (categoryFilter !== 'ALL' && docCategory !== categoryFilter) {
        return false;
      }

      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesFile = doc.filename.toLowerCase().includes(q);
        const matchesCourse =
          doc.course?.code?.toLowerCase().includes(q) ||
          doc.course?.title?.toLowerCase().includes(q);
        if (!matchesName && !matchesFile && !matchesCourse) return false;
      }

      return true;
    });
  }, [documents, assignedDepartmentId, courseFilter, categoryFilter, searchQuery]);

  const mappedDocuments: RepositoryDocument[] = useMemo(() => {
    return filteredDocuments.map((doc) => ({
      docId: doc.id,
      courseCode: doc.course?.code || assignedDepartmentCode,
      courseTitle: doc.course?.title || assignedDepartmentLabel,
      department: doc.department?.name || assignedDepartmentLabel,
      title: doc.name,
      summary: `${doc.category || 'Course PDF'} · ${doc.filename}`,
      category: doc.category || 'Course PDF',
      author: doc.uploadedBy?.fullName || currentUser?.name || 'Course Instructor',
      size: formatFileSize(doc.size),
      pages: 1,
      uploadDate: doc.createdAt
        ? doc.createdAt.split('T')[0]
        : new Date().toISOString().split('T')[0],
      topics: doc.course
        ? `${doc.course.code} - ${doc.course.title}`
        : assignedDepartmentLabel,
    }));
  }, [
    filteredDocuments,
    assignedDepartmentCode,
    assignedDepartmentLabel,
    currentUser?.name,
  ]);

  const resolveStreamUrl = (doc: DocumentRecordWithUrl, download = false): string => {
    const base = doc.signedUrl || `/api/documents/${encodeURIComponent(doc.id)}/file`;
    if (!download) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}download=1`;
  };

  // Load real PDF via authorized fetch so browser/iframe never prints raw JSON "Unauthorized."
  const handlePreviewDoc = useCallback(
    async (doc: RepositoryDocument) => {
      setPageError('');
      const match = documents.find((item) => item.id === doc.docId);
      if (!match) {
        setPreviewDoc({ ...doc, previewUrl: undefined });
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
        setPreviewDoc({ ...doc, previewUrl: undefined });
        return;
      }

      setPreviewDoc({
        ...doc,
        previewUrl: fetched.blobUrl,
      });
    },
    [documents]
  );

  // Download real PDF using authorized fetch + Blob download link
  const handleDownloadDoc = useCallback(
    async (doc: RepositoryDocument) => {
      setPageError('');
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
    },
    [documents]
  );

  const openUploadModal = () => {
    if (departmentDoesNotExist) {
      setPageError(
        `Cannot upload PDF because department "${currentUser?.department}" does not exist in the database.`
      );
      return;
    }
    setUploadError('');
    setSelectedPdfFile(null);
    setTitle('');
    setCategory(CATEGORIES[0]);
    setSelectedCourseId(courseFilter !== 'ALL' ? courseFilter : courses[0]?.id ?? '');
    setIsUploadModalOpen(true);
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setUploadError('Only PDF (.pdf) files are allowed.');
      setSelectedPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedPdfFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '));
    }
  };

  const handlePublishPdf = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');

    if (!selectedPdfFile) {
      setUploadError('Please select a PDF file to upload.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await uploadDocumentRequest({
        file: selectedPdfFile,
        name: title.trim() || selectedPdfFile.name,
        category,
        departmentId: assignedDepartmentId || undefined,
        courseId: selectedCourseId || undefined,
      });

      if (!res.ok || !res.document) {
        setUploadError(res.error || 'Failed to upload PDF document.');
        return;
      }

      setIsUploadModalOpen(false);
      notify(`Uploaded PDF "${res.document.name}".`);
      await loadWorkspaceData({
        deptId: assignedDepartmentId || undefined,
        showSpinner: false,
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Unexpected error while uploading PDF.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (doc: DocumentRecordWithUrl) => {
    setEditError('');
    setEditingDoc(doc);
    setEditTitle(doc.name);
    setEditCategory(doc.category || CATEGORIES[0]);
    setEditCourseId(doc.courseId || '');
  };

  const handleEditSingleSelected = () => {
    if (selectedIds.size !== 1) return;
    const targetId = Array.from(selectedIds)[0];
    const match = documents.find((d) => d.id === targetId);
    if (match) openEditModal(match);
  };

  const handleUpdatePdf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setEditError('');

    if (!editTitle.trim()) {
      setEditError('Document title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateDocumentRequest(editingDoc.id, {
        name: editTitle.trim(),
        category: editCategory,
        courseId: editCourseId || null,
        departmentId: assignedDepartmentId || editingDoc.departmentId,
      });

      if (!res.ok) {
        setEditError(res.error || 'Failed to update PDF metadata.');
        return;
      }

      setEditingDoc(null);
      notify(`Updated "${editTitle.trim()}".`);
      await loadWorkspaceData({
        deptId: assignedDepartmentId || undefined,
        showSpinner: false,
      });
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Unexpected error while updating PDF.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setPageError('');

    const count = selectedIds.size;
    const confirmed = window.confirm(
      `Delete ${count} selected PDF${count === 1 ? '' : 's'}? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const ids = Array.from(selectedIds);
      const results = await Promise.all(ids.map((id) => deleteDocumentRequest(id)));
      const failed = results.filter((r) => !r.ok);

      if (failed.length > 0) {
        setPageError(
          failed[0].error || `Failed to delete ${failed.length} selected PDF(s).`
        );
      } else {
        notify(`Deleted ${count} PDF${count === 1 ? '' : 's'}.`);
      }

      setSelectedIds(new Set());
      if (previewDoc && selectedIds.has(previewDoc.docId)) {
        closePreviewModal();
      }
      await loadWorkspaceData({
        deptId: assignedDepartmentId || undefined,
        showSpinner: false,
      });
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : 'Unexpected error while deleting PDFs.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="repo-page">
      <PortalHeader
        appName="Digital Resource Library"
        workspaceName={`Instructor Workspace · ${assignedDepartmentCode}`}
        version="v1.0"
        systemStatus="Online"
        onSearch={(q) => {
          setSearchQuery(q);
          onSearch?.(q);
        }}
        onLogout={onLogout || logout}
        onNewItem={openUploadModal}
        onSettings={onNavigateHome}
      />

      <main className="repo-main" style={{ marginTop: '24px' }}>
        <div className="repo-content">
          <div className="repo-heading">
            <div>
             
              <p>
                Manage PDF materials for{' '}
                <strong>{assignedDepartmentLabel}</strong> and its courses.
              </p>
            </div>
            <div className="repo-heading-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedIds.size === 1 && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleEditSingleSelected}
                    disabled={isSubmitting}
                    style={{ height: '32px', padding: '0 12px', fontSize: '11px' }}
                  >
                    <Pencil size={13} aria-hidden="true" />
                    <span>Edit Selected</span>
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void handleDeleteSelected()}
                    disabled={isSubmitting}
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      fontSize: '11px',
                      color: '#B91C1C',
                      borderColor: '#FECACA',
                      background: '#FEF2F2',
                    }}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Delete Selected ({selectedIds.size})</span>
                  </button>
                )}
                <button
                  type="button"
                  className="primary"
                  onClick={openUploadModal}
                  disabled={departmentDoesNotExist}
                  style={{ height: '32px', padding: '0 14px', fontSize: '11px' }}
                >
                  <FileUp size={14} aria-hidden="true" />
                  <span>Upload PDF</span>
                </button>
              </div>
              <div className="repo-count">
                <strong>{filteredDocuments.length}</strong>
                <span>PDFs</span>
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

          <section className="repo-panel">
            <div className="repo-panel-head">
              <strong>
                <Filter size={15} aria-hidden="true" /> DEPARTMENT &amp; COURSE FILTERS
              </strong>
              <span>{assignedDepartmentLabel.toUpperCase()}</span>
            </div>

            <div className="repo-filters">
           

              <label>
                <span>Course</span>
                <select
                  value={courseFilter}
                  disabled={departmentDoesNotExist}
                  onChange={(e) => setCourseFilter(e.target.value)}
                >
                  <option value="ALL">All Department Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Category</span>
                <select
                  value={categoryFilter}
                  disabled={departmentDoesNotExist}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <label className="repo-search">
                <span>Search PDFs</span>
                <div>
                  <Search size={15} aria-hidden="true" />
                  <input
                    value={searchQuery}
                    disabled={departmentDoesNotExist}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Title, filename, or course code..."
                  />
                </div>
              </label>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                <button
                  type="button"
                  className="repo-reset"
                  onClick={() => {
                    setCategoryFilter('ALL');
                    setCourseFilter('ALL');
                    setSearchQuery('');
                  }}
                >
                  Reset
                </button>
                <div
                  role="group"
                  aria-label="Layout view"
                  style={{
                    display: 'inline-flex',
                    border: '1px solid #AAB7C6',
                    borderRadius: '2px',
                  }}
                >
                  <button
                    type="button"
                    className={viewMode === 'table' ? 'primary' : 'secondary'}
                    onClick={() => setViewMode('table')}
                    style={{ border: 'none', minHeight: '32px', padding: '0 8px' }}
                    title="Table View"
                  >
                    <List size={14} />
                  </button>
                  <button
                    type="button"
                    className={viewMode === 'gallery' ? 'primary' : 'secondary'}
                    onClick={() => setViewMode('gallery')}
                    style={{ border: 'none', minHeight: '32px', padding: '0 8px' }}
                    title="Gallery View"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {departmentDoesNotExist ? (
            <section className="repo-panel">
              <div className="repo-panel-head">
                <strong>DEPARTMENT STATUS</strong>
                <span>DOES NOT EXIST</span>
              </div>
              <div style={{ padding: '24px', fontSize: '12px', color: '#B91C1C' }}>
                Department &ldquo;{currentUser?.department}&rdquo; does not exist in the database.
              </div>
            </section>
          ) : isLoading ? (
            <section className="repo-panel">
              <div className="repo-panel-head">
                <strong>DEPARTMENT &amp; COURSE PDFS</strong>
                <span>LOADING</span>
              </div>
              <div style={{ padding: '24px', fontSize: '12px', color: '#475569' }}>
                Loading PDFs for {assignedDepartmentLabel}...
              </div>
            </section>
          ) : filteredDocuments.length === 0 ? (
            <section className="repo-panel">
              <div className="repo-panel-head">
                <strong>DEPARTMENT &amp; COURSE PDFS</strong>
                <span>0 RECORDS</span>
              </div>
              <div
                style={{
                  padding: '28px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#64748B',
                }}
              >
                There is no data for {assignedDepartmentLabel} yet.
              </div>
            </section>
          ) : viewMode === 'table' ? (
            <DocumentsTable
              documents={mappedDocuments}
              total={filteredDocuments.length}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPreview={(d) => void handlePreviewDoc(d)}
              onDownload={(d) => void handleDownloadDoc(d)}
            />
          ) : (
            <DocumentsGallery
              documents={mappedDocuments}
              total={filteredDocuments.length}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPreview={(d) => void handlePreviewDoc(d)}
              onDownload={(d) => void handleDownloadDoc(d)}
            />
          )}
        </div>
      </main>

      <DocumentPreviewModal
        document={previewDoc}
        onClose={closePreviewModal}
        onDownload={(d) => void handleDownloadDoc(d)}
      />

      {isUploadModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsUploadModalOpen(false);
          }}
        >
          <section
            className="repo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-pdf-modal-title"
          >
            <header>
              <strong id="upload-pdf-modal-title">
                <FileUp size={15} aria-hidden="true" /> UPLOAD PDF · {assignedDepartmentCode}
              </strong>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <form id="course-pdf-form" onSubmit={handlePublishPdf}>
                <div className="login-field" style={{ marginBottom: '14px' }}>
                  <label htmlFor="course-pdf-file">PDF File (.pdf only)</label>
                  <div
                    style={{
                      border: '1px dashed #94A3B8',
                      background: '#F8FAFC',
                      padding: '14px',
                      borderRadius: '2px',
                      textAlign: 'center',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      id="course-pdf-file"
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfFileChange}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={13} />
                      <span>
                        {selectedPdfFile
                          ? `${selectedPdfFile.name} (${formatFileSize(selectedPdfFile.size)})`
                          : 'Choose PDF File'}
                      </span>
                    </button>
                  </div>
                </div>

                {uploadError && (
                  <div className="mb-3 p-2 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[11px]">
                    {uploadError}
                  </div>
                )}

                <div className="login-field" style={{ marginBottom: '14px' }}>
                  <label htmlFor="pdf-title">Document Title</label>
                  <div className="login-input-wrap" style={{ height: '36px' }}>
                    <input
                      id="pdf-title"
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Week 03 Lecture Notes"
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                  }}
                >
                  <div className="login-field">
                    <label htmlFor="pdf-course">Course</label>
                    <div className="login-input-wrap" style={{ height: '36px' }}>
                      <select
                        id="pdf-course"
                        style={{
                          width: '100%',
                          border: 0,
                          outline: 0,
                          background: 'transparent',
                          fontSize: '11px',
                        }}
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                      >
                        <option value="">Department General</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} · {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="login-field">
                    <label htmlFor="pdf-category">Category</label>
                    <div className="login-input-wrap" style={{ height: '36px' }}>
                      <select
                        id="pdf-category"
                        style={{
                          width: '100%',
                          border: 0,
                          outline: 0,
                          background: 'transparent',
                          fontSize: '11px',
                        }}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="course-pdf-form"
                className="primary"
                disabled={isSubmitting}
              >
                <FileText size={13} aria-hidden="true" />
                <span>{isSubmitting ? 'Uploading...' : 'Upload PDF'}</span>
              </button>
            </footer>
          </section>
        </div>
      )}

      {editingDoc && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingDoc(null);
          }}
        >
          <section
            className="repo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-pdf-modal-title"
          >
            <header>
              <strong id="edit-pdf-modal-title">
                <Pencil size={14} aria-hidden="true" /> EDIT PDF METADATA
              </strong>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <form id="edit-pdf-form" onSubmit={handleUpdatePdf}>
                {editError && (
                  <div className="mb-3 p-2 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-[11px]">
                    {editError}
                  </div>
                )}

                <div className="login-field" style={{ marginBottom: '14px' }}>
                  <label htmlFor="edit-pdf-title">Document Title</label>
                  <div className="login-input-wrap" style={{ height: '36px' }}>
                    <input
                      id="edit-pdf-title"
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                  }}
                >
                  <div className="login-field">
                    <label htmlFor="edit-pdf-course">Course</label>
                    <div className="login-input-wrap" style={{ height: '36px' }}>
                      <select
                        id="edit-pdf-course"
                        style={{
                          width: '100%',
                          border: 0,
                          outline: 0,
                          background: 'transparent',
                          fontSize: '11px',
                        }}
                        value={editCourseId}
                        onChange={(e) => setEditCourseId(e.target.value)}
                      >
                        <option value="">Department General</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} · {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="login-field">
                    <label htmlFor="edit-pdf-category">Category</label>
                    <div className="login-input-wrap" style={{ height: '36px' }}>
                      <select
                        id="edit-pdf-category"
                        style={{
                          width: '100%',
                          border: 0,
                          outline: 0,
                          background: 'transparent',
                          fontSize: '11px',
                        }}
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setEditingDoc(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-pdf-form"
                className="primary"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};