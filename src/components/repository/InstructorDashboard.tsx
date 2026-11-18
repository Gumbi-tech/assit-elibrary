'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLibrary } from '@/context/LibraryContext';
import { Department } from '@/types/elibrary';
import type { RepositoryDocument } from '@/types/repository';
import {
  FileUp,
  Search,
  ShieldCheck,
  Trash2,
  Filter,
  X,
  Upload,
  FileText,
  AlertCircle,
  LayoutGrid,
  List,
  BookOpen,
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

const COURSE_METADATA: Record<Department, { code: string; title: string; label: string }> = {
  SOFTWARE_ENGINEERING: {
    code: 'CSC-301',
    title: 'Software Engineering & Architecture',
    label: 'Software Engineering',
  },
  CYBER_SECURITY: {
    code: 'SEC-304',
    title: 'Network & Cyber Security',
    label: 'Cyber Security',
  },
  MULTIMEDIA: {
    code: 'MMD-202',
    title: 'Interactive Multimedia Systems',
    label: 'Multimedia',
  },
};

export const InstructorDashboard: React.FC<Props> = ({
  onSearch,
  onLogout,
  onNavigateHome,
}) => {
  const { currentUser, logout } = useAuth();
  const { documents, addDocument, deleteDocument } = useLibrary();

  // RBAC: Scope instructor strictly to their assigned course/department[cite: 5]
  const assignedDepartment: Department =
    currentUser?.department || 'SOFTWARE_ENGINEERING';
  const assignedCourse = COURSE_METADATA[assignedDepartment];

  // Modal & feedback state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [uploadError, setUploadError] = useState('');

  // PDF Upload Form state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Lecture Notes');
  const [topics, setTopics] = useState('');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);

  // Filter & View state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('table');

  // Selection & Preview state for shared components
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [previewDoc, setPreviewDoc] = useState<RepositoryDocument | null>(null);

  // Format file bytes to human-readable MB/KB
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // RBAC filter: Only PDF resources belonging to the instructor's assigned course[cite: 5]
  const courseDocuments = useMemo(() => {
    return documents.filter(
      (doc) =>
        doc.department === assignedDepartment &&
        doc.fileType?.toUpperCase() === 'PDF'
    );
  }, [documents, assignedDepartment]);

  // Adapt LibraryContext documents to RepositoryDocument shape
  const mappedDocuments: RepositoryDocument[] = useMemo(() => {
    return courseDocuments
      .filter((doc) => {
        const docCategory = (doc as any).category || 'Course PDF';
        const matchesCategory =
          categoryFilter === 'ALL' || docCategory === categoryFilter;
        const q = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !q ||
          doc.title.toLowerCase().includes(q) ||
          doc.description.toLowerCase().includes(q) ||
          doc.id.toLowerCase().includes(q);
        return matchesCategory && matchesQuery;
      })
      .map((doc) => ({
        docId: doc.id,
        courseCode: assignedCourse.code,
        courseTitle: assignedCourse.title,
        department: assignedCourse.label,
        title: doc.title,
        summary: doc.description,
        category: (doc as any).category || 'Course PDF',
        author: doc.uploaderName || currentUser?.name || 'Course Instructor',
        size: doc.fileSize || '2.4 MB',
        pages: (doc as any).pages || 12,
        uploadDate: doc.createdAt || new Date().toISOString().split('T')[0],
        topics: (doc as any).topics || `${assignedCourse.title} Core Syllabus`,
      }));
  }, [courseDocuments, categoryFilter, searchQuery, assignedCourse, currentUser]);

  const openUploadModal = () => {
    setUploadError('');
    setSelectedPdfFile(null);
    setTitle('');
    setDescription('');
    setTopics('');
    setIsUploadModalOpen(true);
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setUploadError('Invalid file format. Only PDF (.pdf) documents are permitted.');
      setSelectedPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedPdfFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '));
    }
  };

  const handlePublishPdf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!selectedPdfFile) {
      setUploadError('Please select a PDF file to upload.');
      return;
    }

    const objectUrl = URL.createObjectURL(selectedPdfFile);

    addDocument({
      title: title.trim(),
      description: description.trim(),
      department: assignedDepartment,
      fileUrl: objectUrl,
      fileSize: formatFileSize(selectedPdfFile.size),
      fileType: 'PDF',
      uploadedBy: currentUser.id,
      uploaderName: currentUser.name,
      ...( { category, topics: topics.trim() || assignedCourse.title } as Record<string, unknown> ),
    });

    setIsUploadModalOpen(false);
    setSelectedPdfFile(null);
    setTitle('');
    setDescription('');
    setTopics('');
    setSuccessMsg(`PDF published to ${assignedCourse.code} (${assignedCourse.title}).`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    selectedIds.forEach((id) => deleteDocument(id));
    setSelectedIds(new Set());
    if (previewDoc && selectedIds.has(previewDoc.docId)) {
      setPreviewDoc(null);
    }
    setSuccessMsg(`Removed ${count} PDF resource${count === 1 ? '' : 's'} from ${assignedCourse.code}.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDownloadDoc = (doc: RepositoryDocument) => {
    const source = documents.find((d) => d.id === doc.docId);
    const link = document.createElement('a');
    link.href = source?.fileUrl && source.fileUrl !== '#' ? source.fileUrl : '#';
    link.setAttribute('download', `${doc.title}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="repo-page">
      {/* Shared PortalHeader Component */}
      <PortalHeader
        appName="Digital Resource Library"
        workspaceName={`Instructor Workspace · ${assignedCourse.code}`}
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
          {/* Page Header aligned with AdminDashboard */}
          <div className="repo-heading">
            <div>
              <small>INSTRUCTOR COURSE REPOSITORY · {assignedCourse.code}</small>
              <h2>{assignedCourse.title}</h2>
              <p>
                Upload, inspect, and remove official PDF learning materials scoped strictly to your assigned course.
              </p>
            </div>
            <div className="repo-heading-right">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleDeleteSelected}
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
                  style={{ height: '32px', padding: '0 14px', fontSize: '11px' }}
                >
                  <FileUp size={14} aria-hidden="true" />
                  <span>Upload Course PDF</span>
                </button>
              </div>
              <div className="repo-count">
                <strong>{courseDocuments.length}</strong>
                <span>COURSE PDFs</span>
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

          {/* Filter & View Switcher Panel */}
          <section className="repo-panel">
            <div className="repo-panel-head">
              <strong>
                <Filter size={15} aria-hidden="true" /> COURSE RESOURCE FILTERS
              </strong>
              <span>RBAC SCOPE: {assignedCourse.label.toUpperCase()} ONLY</span>
            </div>
            <div className="repo-filters">
              <label>
                <span>Assigned Course</span>
                <div
                  style={{
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0 9px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '2px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  <BookOpen size={13} className="text-[#1E5F9A]" />
                  <span>
                    {assignedCourse.code} · {assignedCourse.label}
                  </span>
                </div>
              </label>

              <label>
                <span>Material Type</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Course PDFs</option>
                  <option value="Lecture Notes">Lecture Notes</option>
                  <option value="Lab Manual">Lab Manual</option>
                  <option value="Syllabus & Guide">Syllabus &amp; Guide</option>
                  <option value="Past Assessment">Past Assessment</option>
                </select>
              </label>

              <label className="repo-search">
                <span>Search course PDFs</span>
                <div>
                  <Search size={15} aria-hidden="true" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Title, summary or document ID..."
                  />
                </div>
              </label>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
                <button
                  type="button"
                  className="repo-reset"
                  onClick={() => {
                    setCategoryFilter('ALL');
                    setSearchQuery('');
                  }}
                >
                  Reset
                </button>
                <div
                  role="group"
                  aria-label="Layout view"
                  style={{ display: 'inline-flex', border: '1px solid #AAB7C6', borderRadius: '2px' }}
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

          {/* Reused Shared Document Table / Gallery Components */}
          {viewMode === 'table' ? (
            <DocumentsTable
              documents={mappedDocuments}
              total={courseDocuments.length}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPreview={setPreviewDoc}
              onDownload={handleDownloadDoc}
            />
          ) : (
            <DocumentsGallery
              documents={mappedDocuments}
              total={courseDocuments.length}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPreview={setPreviewDoc}
              onDownload={handleDownloadDoc}
            />
          )}
        </div>
      </main>

      {/* Reused Shared DocumentPreviewModal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownloadDoc}
      />

      {/* On-Demand Upload Course PDF Modal matching globals.css modal structure */}
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
                <FileUp size={15} aria-hidden="true" />
                UPLOAD COURSE PDF · {assignedCourse.code}
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
              <small>RBAC RESTRICTED · PDF REPOSITORY ONLY</small>
              <h2>Publish Course Material</h2>
              <p>
                Uploaded PDFs are published directly to <strong>{assignedCourse.title}</strong> ({assignedCourse.code}) for student download.
              </p>

              <form id="course-pdf-form" onSubmit={handlePublishPdf} style={{ marginTop: '16px' }}>
                {/* PDF File Picker */}
                <div className="login-field" style={{ marginBottom: '14px' }}>
                  <label htmlFor="course-pdf-file">
                    Select PDF Document (.pdf only)
                  </label>
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
                    <p style={{ margin: '6px 0 0', fontSize: '10px', color: '#64748B' }}>
                      Strictly PDF format. Non-PDF files are blocked by repository policy.
                    </p>
                  </div>
                </div>

                {uploadError && (
                  <div
                    style={{
                      marginBottom: '14px',
                      padding: '8px 10px',
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      color: '#B91C1C',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="login-field" style={{ marginBottom: '14px' }}>
                  <label htmlFor="pdf-title">
                    Resource Title
                  </label>
                  <div className="login-input-wrap" style={{ height: '36px' }}>
                    <input
                      id="pdf-title"
                      type="text"
                      required
                      placeholder="e.g. Week 04 — Distributed Systems & Consensus"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div className="login-field">
                    <label htmlFor="pdf-course-locked">
                      Assigned Course (Locked)
                    </label>
                    <div className="login-input-wrap" style={{ height: '36px', background: '#F1F5F9' }}>
                      <input
                        id="pdf-course-locked"
                        type="text"
                        disabled
                        value={`${assignedCourse.code} · ${assignedCourse.label}`}
                        style={{ color: '#475467', cursor: 'not-allowed' }}
                      />
                    </div>
                  </div>

                  <div className="login-field">
                    <label htmlFor="pdf-category">
                      Resource Category
                    </label>
                    <div className="login-input-wrap" style={{ height: '36px' }}>
                      <select
                        id="pdf-category"
                        style={{ width: '100%', border: 0, outline: 0, background: 'transparent', fontSize: '11px', color: '#1E293B' }}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      >
                        <option value="Lecture Notes">Lecture Notes</option>
                        <option value="Lab Manual">Lab Manual</option>
                        <option value="Syllabus & Guide">Syllabus &amp; Guide</option>
                        <option value="Past Assessment">Past Assessment</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="pdf-summary">
                    Executive Summary &amp; Description
                  </label>
                  <textarea
                    id="pdf-summary"
                    required
                    rows={3}
                    placeholder="Concise overview of the PDF contents for students..."
                    style={{
                      width: '100%',
                      border: '1px solid #AAB7C6',
                      borderRadius: '2px',
                      background: '#FFFFFF',
                      color: '#0F172A',
                      font: '12px Arial, Helvetica, sans-serif',
                      padding: '8px',
                      outline: 0,
                    }}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </form>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setIsUploadModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="course-pdf-form"
                className="primary"
              >
                <FileText size={13} aria-hidden="true" />
                <span>Publish Course PDF</span>
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};