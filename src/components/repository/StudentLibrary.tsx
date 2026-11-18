'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLibrary } from '@/context/LibraryContext';
import { Department } from '@/types/elibrary';
import type { RepositoryDocument } from '@/types/repository';
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  ShieldCheck,
  Lock,
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

export const StudentLibrary: React.FC<Props> = ({
  onSearch,
  onLogout,
  onNavigateHome,
}) => {
  const { currentUser, logout } = useAuth();
  const { documents, incrementDownload } = useLibrary();

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>(currentUser?.department || 'ALL');
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('gallery');
  const [successMsg, setSuccessMsg] = useState('');

  // Selection & Preview state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [previewDoc, setPreviewDoc] = useState<RepositoryDocument | null>(null);

  // Filter documents based on RBAC & department access
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (currentUser?.role === 'STUDENT' && doc.department !== currentUser.department) {
        return false;
      }
      if (departmentFilter !== 'ALL' && doc.department !== departmentFilter) {
        return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (
        q &&
        !doc.title.toLowerCase().includes(q) &&
        !doc.description.toLowerCase().includes(q) &&
        !doc.id.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [documents, currentUser, departmentFilter, searchQuery]);

  // Map to RepositoryDocument shape required by shared views
  const mappedDocuments: RepositoryDocument[] = useMemo(() => {
    return filteredDocuments.map((doc) => {
      const meta = COURSE_METADATA[doc.department as Department] || {
        code: 'LIB-101',
        title: doc.title,
        label: doc.department.replace('_', ' '),
      };
      return {
        docId: doc.id,
        courseCode: meta.code,
        courseTitle: meta.title,
        department: meta.label,
        title: doc.title,
        summary: doc.description,
        category: (doc as any).category || 'Course PDF',
        author: doc.uploaderName || 'Instructor',
        size: doc.fileSize || '2.4 MB',
        pages: (doc as any).pages || 14,
        uploadDate: doc.createdAt || new Date().toISOString().split('T')[0],
        topics: (doc as any).topics || `${meta.title} Curriculum`,
      };
    });
  }, [filteredDocuments]);

  const handleDownload = (doc: RepositoryDocument) => {
    incrementDownload(doc.docId);
    const source = documents.find((d) => d.id === doc.docId);
    const link = document.createElement('a');
    link.href = source?.fileUrl && source.fileUrl !== '#' ? source.fileUrl : '#';
    link.setAttribute('download', `${doc.title}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessMsg(`Successfully downloaded: "${doc.title}"`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDownloadSelected = (docs: RepositoryDocument[]) => {
    docs.forEach((doc) => handleDownload(doc));
    setSelectedIds(new Set());
  };

  const formatDeptName = (dept?: string) => {
    if (!dept || dept === 'ALL') return 'All Accessible Departments';
    return dept
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="repo-page">
      {/* Shared PortalHeader Component */}
      <PortalHeader
        appName="Digital Resource Library"
        workspaceName={`Student Portal · ${formatDeptName(currentUser?.department)}`}
        version="v1.0"
        systemStatus="Online"
        onSearch={(q) => {
          setSearchQuery(q);
          onSearch?.(q);
        }}
        onLogout={onLogout || logout}
        onSettings={onNavigateHome}
      />

      <main className="repo-main" style={{ marginTop: '24px' }}>
        <div className="repo-content">
          {/* Page Header aligned with Admin & Instructor Dashboards */}
          <div className="repo-heading">
            <div>
              <small>STUDENT RESOURCE E-LIBRARY · RBAC SECURED</small>
              <h2>Learning Materials &amp; Course PDFs</h2>
              <p>
                Browse, preview, and download verified educational documents assigned to your department group.
              </p>
            </div>
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

          {successMsg && (
            <div
              role="status"
              className="px-3 py-2 bg-[#EDF4FC] border border-[#D0DFF0] text-[#003060] text-[11px] flex items-center gap-2"
            >
              <ShieldCheck size={14} className="text-[#1E5F9A] shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Filter Bar Panel */}
          <section className="repo-panel">
            <div className="repo-panel-head">
              <strong>
                <Filter size={15} aria-hidden="true" /> SEARCH &amp; DEPARTMENT FILTERS
              </strong>
              <span>RBAC ENFORCED: {formatDeptName(currentUser?.department).toUpperCase()}</span>
            </div>
            <div className="repo-filters">
              <label>
                <span>Department group</span>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  disabled={currentUser?.role === 'STUDENT'}
                >
                  <option value="ALL">All Accessible Departments</option>
                  <option value="SOFTWARE_ENGINEERING">Software Engineering</option>
                  <option value="CYBER_SECURITY">Cyber Security</option>
                  <option value="MULTIMEDIA">Multimedia</option>
                </select>
              </label>

              <label className="repo-search" style={{ gridColumn: 'span 2' }}>
                <span>Search library resources</span>
                <div>
                  <Search size={15} aria-hidden="true" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents by title, description or keyword..."
                  />
                </div>
              </label>

              <button
                type="button"
                className="repo-reset"
                onClick={() => {
                  setDepartmentFilter(currentUser?.department || 'ALL');
                  setSearchQuery('');
                }}
              >
                Reset filters
              </button>
            </div>
          </section>

          {/* Documents Table or Gallery View */}
          {filteredDocuments.length === 0 ? (
            <section className="repo-panel">
              <div className="empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
                <Lock size={32} style={{ margin: '0 auto 12px', color: '#64748B' }} />
                <h3 style={{ margin: '0 0 6px', color: '#0F294A', fontSize: '16px', fontWeight: 'bold' }}>
                  No Accessible Documents Found
                </h3>
                <p style={{ margin: 0, color: '#64748B', fontSize: '11px', maxWidth: '420px', marginInline: 'auto' }}>
                  You can only view and download resources assigned to your department group ({formatDeptName(currentUser?.department)}). Contact your instructor if additional course PDFs are required.
                </p>
              </div>
            </section>
          ) : viewMode === 'gallery' ? (
            <DocumentsGallery
              documents={mappedDocuments}
              total={filteredDocuments.length}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPreview={setPreviewDoc}
              onDownload={handleDownload}
              onDownloadSelected={handleDownloadSelected}
            />
          ) : (
            <DocumentsTable
              documents={mappedDocuments}
              total={filteredDocuments.length}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              onPreview={setPreviewDoc}
              onDownload={handleDownload}
              onDownloadSelected={handleDownloadSelected}
            />
          )}
        </div>
      </main>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownload}
      />
    </div>
  );
};