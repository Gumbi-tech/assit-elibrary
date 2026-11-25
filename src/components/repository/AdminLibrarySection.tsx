'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileUp,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  uploadDocumentRequest,
  fetchDocumentsRequest,
  updateDocumentRequest,
  deleteDocumentRequest,
  fetchAuthorizedDocumentBlobUrl,
  triggerAuthenticatedPdfDownload,
  type DocumentRecord,
} from '@/lib/library-api';
import { UploadPdfModal, type UploadPdfMetadata } from './UploadPdfModal';

type Props = {
  dbCategories: string[];
  availablePrograms?: string[];
  isLoadingCategories?: boolean;
  externalSearch?: string;
  onNotify: (type: 'success' | 'error', message: string) => void;
  onDocumentsLoaded?: (docs: DocumentRecord[]) => void;
  openUploadSignal?: number;
};

type TagLike = string | { name: string };
type ProgramLike = string | { name: string };

export type ExtendedDocumentRecord = DocumentRecord & {
  author?: string | null;
  tags?: TagLike[];
  programs?: ProgramLike[];
  description?: string | null;
};

interface RelatedBookMatch {
  doc: ExtendedDocumentRecord;
  score: number;
  sharedPrograms: string[];
  sharedTags: string[];
  isAdjacentProgramMatch: boolean;
  reasonSummary: string;
}

function extractNames(items?: Array<string | { name: string }>): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item : item?.name || ''))
    .map((v) => v.trim())
    .filter(Boolean);
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Computes related books using:
 * 1. Shared Program badges (especially across adjacent categories, e.g., Cyber Security -> Networking)
 * 2. Shared Topic Tags
 * 3. Same Category fallback signal
 */
function getRelatedBooks(
  target: ExtendedDocumentRecord,
  catalog: ExtendedDocumentRecord[]
): RelatedBookMatch[] {
  const targetCat = (target.category || '').trim().toLowerCase();
  const targetPrograms = extractNames(target.programs).map((p) => p.toLowerCase());
  const targetTags = extractNames(target.tags).map((t) => t.toLowerCase());

  const matches: RelatedBookMatch[] = [];

  for (const candidate of catalog) {
    if (candidate.id === target.id) continue;

    const candCat = (candidate.category || '').trim().toLowerCase();
    const candProgramNames = extractNames(candidate.programs);
    const candTagNames = extractNames(candidate.tags);

    const sharedPrograms = candProgramNames.filter((p) =>
      targetPrograms.includes(p.toLowerCase())
    );
    const sharedTags = candTagNames.filter((t) =>
      targetTags.includes(t.toLowerCase())
    );
    const sameCategory = Boolean(targetCat && candCat && targetCat === candCat);
    const isAdjacentProgramMatch =
      sharedPrograms.length > 0 && Boolean(candCat && targetCat && candCat !== targetCat);

    let score = 0;
    if (sharedPrograms.length > 0) {
      score += sharedPrograms.length * (isAdjacentProgramMatch ? 6 : 4);
    }
    if (sharedTags.length > 0) {
      score += sharedTags.length * 3;
    }
    if (sameCategory) {
      score += 2;
    }

    if (score > 0) {
      const reasons: string[] = [];
      if (sharedPrograms.length > 0) {
        reasons.push(
          isAdjacentProgramMatch
            ? `Shared program badge (${sharedPrograms.join(', ')}) in ${candidate.category || 'adjacent category'}`
            : `Shared program badge (${sharedPrograms.join(', ')})`
        );
      }
      if (sharedTags.length > 0) {
        reasons.push(`Tags: ${sharedTags.map((t) => `#${t}`).join(', ')}`);
      }
      if (sameCategory && sharedPrograms.length === 0) {
        reasons.push(`Same category (${candidate.category})`);
      }

      matches.push({
        doc: candidate,
        score,
        sharedPrograms,
        sharedTags,
        isAdjacentProgramMatch,
        reasonSummary: reasons.join(' · '),
      });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score || a.doc.name.localeCompare(b.doc.name))
    .slice(0, 4);
}

export const AdminLibrarySection: React.FC<Props> = ({
  dbCategories,
  availablePrograms,
  isLoadingCategories = false,
  externalSearch = '',
  onNotify,
  onDocumentsLoaded,
  openUploadSignal = 0,
}) => {
  const [documents, setDocuments] = useState<ExtendedDocumentRecord[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [listError, setListError] = useState('');

  // Filter state
  const [searchQuery, setSearchQuery] = useState(externalSearch);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [programFilter, setProgramFilter] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Row selection & bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  // On-demand row action menu
  const [openActionDocId, setOpenActionDocId] = useState<string | null>(null);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Related Books drawer/modal state
  const [relatedTargetDoc, setRelatedTargetDoc] =
    useState<ExtendedDocumentRecord | null>(null);

  // Edit modal state
  const [editingDoc, setEditingDoc] = useState<ExtendedDocumentRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editProgramsText, setEditProgramsText] = useState('');
  const [editTagsText, setEditTagsText] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Single delete modal state
  const [deletingDoc, setDeletingDoc] = useState<ExtendedDocumentRecord | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Preview & single download state
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    doc: ExtendedDocumentRecord;
    blobUrl: string;
  } | null>(null);

  useEffect(() => {
    setSearchQuery(externalSearch);
  }, [externalSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, programFilter, pageSize]);

  useEffect(() => {
    if (openUploadSignal > 0) {
      setIsUploadModalOpen(true);
    }
  }, [openUploadSignal]);

  useEffect(() => {
    if (!openActionDocId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenActionDocId(null);
    };
    const handleClickOutside = () => setOpenActionDocId(null);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
    };
  }, [openActionDocId]);

  const loadDocuments = useCallback(async () => {
    setIsLoadingDocs(true);
    setListError('');
    try {
      const res = await fetchDocumentsRequest();
      if (!res.ok) {
        setListError(res.error || 'Failed to load library documents.');
        return;
      }
      const list = (res.documents || []) as ExtendedDocumentRecord[];
      setDocuments(list);
      onDocumentsLoaded?.(list);
    } catch {
      setListError('Network error while loading library documents.');
    } finally {
      setIsLoadingDocs(false);
    }
  }, [onDocumentsLoaded]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    return () => {
      if (previewDoc?.blobUrl) {
        URL.revokeObjectURL(previewDoc.blobUrl);
      }
    };
  }, [previewDoc]);

  const programFilterOptions = useMemo(() => {
    const names = new Set<string>(availablePrograms || []);
    documents.forEach((doc) => {
      extractNames(doc.programs).forEach((p) => names.add(p));
    });
    return Array.from(names);
  }, [availablePrograms, documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const docCat = (doc.category || '').trim();
      const docPrograms = extractNames(doc.programs);
      const docTags = extractNames(doc.tags);

      const matchesCategory =
        categoryFilter === 'ALL' ||
        docCat.toLowerCase() === categoryFilter.toLowerCase();

      const matchesProgram =
        programFilter === 'ALL' ||
        docPrograms.some((p) => p.toLowerCase() === programFilter.toLowerCase());

      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCategory && matchesProgram;

      const matchesQuery =
        doc.name.toLowerCase().includes(q) ||
        (doc.author || '').toLowerCase().includes(q) ||
        doc.filename.toLowerCase().includes(q) ||
        docCat.toLowerCase().includes(q) ||
        docTags.some((t) => t.toLowerCase().includes(q)) ||
        docPrograms.some((p) => p.toLowerCase().includes(q));

      return matchesCategory && matchesProgram && matchesQuery;
    });
  }, [documents, categoryFilter, programFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredDocuments.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedDocuments = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredDocuments.slice(start, start + pageSize);
  }, [filteredDocuments, safeCurrentPage, pageSize]);

  const rangeStart =
    filteredDocuments.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredDocuments.length);

  const relatedMatches = useMemo(() => {
    if (!relatedTargetDoc) return [];
    return getRelatedBooks(relatedTargetDoc, documents);
  }, [relatedTargetDoc, documents]);

  const previewRelatedMatches = useMemo(() => {
    if (!previewDoc?.doc) return [];
    return getRelatedBooks(previewDoc.doc, documents);
  }, [previewDoc, documents]);

  const visibleIds = useMemo(
    () => paginatedDocuments.map((d) => d.id),
    [paginatedDocuments]
  );

  const selectedDocuments = useMemo(
    () => filteredDocuments.filter((d) => selectedIds.has(d.id)),
    [filteredDocuments, selectedIds]
  );

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleOne = (docId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleUploadSubmit = async (
    payload: UploadPdfMetadata
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await uploadDocumentRequest({
        file: payload.file,
        name: payload.name,
        author: payload.author,
        category: payload.category,
        programs: payload.programs,
        tags: payload.tags,
        description: payload.description,
      } as Parameters<typeof uploadDocumentRequest>[0]);

      if (!res.ok || !res.document) {
        return { ok: false, error: res.error || 'Failed to upload PDF document.' };
      }

      onNotify(
        'success',
        `Uploaded "${res.document.name}" with ${payload.programs.length} program badge(s) and ${payload.tags.length} tag(s).`
      );
      await loadDocuments();
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error while uploading PDF document.' };
    }
  };

  const openEditModal = (doc: ExtendedDocumentRecord) => {
    setOpenActionDocId(null);
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditAuthor(doc.author || '');
    setEditCategory(doc.category || dbCategories[0] || '');
    setEditProgramsText(extractNames(doc.programs).join(', '));
    setEditTagsText(extractNames(doc.tags).join(', '));
    setEditDescription(doc.description || '');
    setEditError('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setEditError('');

    const cleanedTitle = editName.trim();
    if (!cleanedTitle) {
      setEditError('Document title is required.');
      return;
    }

    const parsedTags = Array.from(
      new Set(
        editTagsText
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      )
    );

    const parsedPrograms = Array.from(
      new Map(
        editProgramsText
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => [p.toLowerCase(), p])
      ).values()
    );

    setIsSavingEdit(true);
    try {
      const res = await updateDocumentRequest(editingDoc.id, {
        name: cleanedTitle,
        author: editAuthor.trim() || undefined,
        category: editCategory,
        programs: parsedPrograms,
        tags: parsedTags,
        description: editDescription.trim() || undefined,
      } as Parameters<typeof updateDocumentRequest>[1]);

      if (!res.ok || !res.document) {
        setEditError(res.error || 'Failed to update document.');
        return;
      }

      setEditingDoc(null);
      onNotify('success', `Updated "${res.document.name}".`);
      await loadDocuments();
    } catch {
      setEditError('Network error while updating document.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    setIsDeletingDoc(true);
    try {
      const res = await deleteDocumentRequest(deletingDoc.id);
      if (!res.ok) {
        onNotify('error', res.error || 'Failed to delete document.');
        setDeletingDoc(null);
        return;
      }
      const removedId = deletingDoc.id;
      const removedName = deletingDoc.name;
      setDocuments((prev) => prev.filter((item) => item.id !== removedId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(removedId);
        return next;
      });
      setDeletingDoc(null);
      onNotify('success', `Deleted "${removedName}".`);
    } catch {
      onNotify('error', 'Network error while deleting document.');
      setDeletingDoc(null);
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedDocuments.length === 0) return;
    setBulkDeleteError('');
    setIsBulkDeleting(true);

    let deletedCount = 0;
    const deletedIds = new Set<string>();
    const failedNames: string[] = [];

    try {
      for (const doc of selectedDocuments) {
        const res = await deleteDocumentRequest(doc.id);
        if (res.ok) {
          deletedCount += 1;
          deletedIds.add(doc.id);
        } else {
          failedNames.push(doc.name);
        }
      }

      if (deletedIds.size > 0) {
        setDocuments((prev) => prev.filter((d) => !deletedIds.has(d.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deletedIds.forEach((id) => next.delete(id));
          return next;
        });
      }

      if (failedNames.length > 0) {
        setBulkDeleteError(
          `Deleted ${deletedCount} file(s), but failed on: ${failedNames.join(', ')}.`
        );
        return;
      }

      setIsBulkDeleteModalOpen(false);
      onNotify('success', `Deleted ${deletedCount} selected document(s).`);
    } catch {
      setBulkDeleteError('Network error during bulk delete.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedDocuments.length === 0) return;
    setIsBulkDownloading(true);

    let downloadedCount = 0;
    const skipped: string[] = [];

    try {
      for (const doc of selectedDocuments) {
        if (!doc.signedUrl) {
          skipped.push(doc.name);
          continue;
        }
        const res = await triggerAuthenticatedPdfDownload(
          doc.signedUrl,
          doc.filename || `${doc.name}.pdf`
        );
        if (res.ok) {
          downloadedCount += 1;
        } else {
          skipped.push(doc.name);
        }
      }

      if (skipped.length > 0) {
        onNotify(
          'error',
          `Downloaded ${downloadedCount} file(s); unavailable for: ${skipped.join(', ')}.`
        );
      } else {
        onNotify('success', `Downloaded ${downloadedCount} selected PDF(s).`);
      }
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handlePreview = async (doc: ExtendedDocumentRecord) => {
    setOpenActionDocId(null);
    if (!doc.signedUrl) {
      onNotify('error', 'Preview URL unavailable. Refresh the catalog first.');
      return;
    }
    setBusyActionId(doc.id);
    try {
      const res = await fetchAuthorizedDocumentBlobUrl(doc.signedUrl);
      if (!res.ok || !res.blobUrl) {
        onNotify('error', res.error || 'Could not load PDF preview.');
        return;
      }
      if (previewDoc?.blobUrl) URL.revokeObjectURL(previewDoc.blobUrl);
      setPreviewDoc({ doc, blobUrl: res.blobUrl });
    } finally {
      setBusyActionId(null);
    }
  };

  const handleDownload = async (doc: ExtendedDocumentRecord) => {
    setOpenActionDocId(null);
    if (!doc.signedUrl) {
      onNotify('error', 'Download URL unavailable. Refresh the catalog first.');
      return;
    }
    setBusyActionId(doc.id);
    try {
      const res = await triggerAuthenticatedPdfDownload(
        doc.signedUrl,
        doc.filename || `${doc.name}.pdf`
      );
      if (!res.ok) {
        onNotify('error', res.error || 'Could not download PDF.');
        return;
      }
      onNotify('success', `Downloaded "${doc.name}".`);
    } finally {
      setBusyActionId(null);
    }
  };

  const isBatchBusy = isBulkDeleting || isBulkDownloading;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
      {/* Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <strong style={{ fontSize: '13px' }}>Open-Library PDF Catalog &amp; Recommendations</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary"
            onClick={() => void loadDocuments()}
            disabled={isLoadingDocs}
          >
            {isLoadingDocs ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={14} aria-hidden="true" />
            )}
            <span>{isLoadingDocs ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => setIsUploadModalOpen(true)}
            disabled={isLoadingCategories || dbCategories.length === 0}
          >
            <FileUp size={14} aria-hidden="true" />
            <span>Upload PDF</span>
          </button>
        </div>
      </div>

      {/* Filters & Catalog Panel */}
      <section className="repo-panel" style={{ overflow: 'visible' }}>
        <div className="repo-panel-head">
          <strong>
            <BookOpen size={15} aria-hidden="true" /> LIBRARY CATALOG ({filteredDocuments.length})
          </strong>
          <span>PAGINATED DATA TABLE</span>
        </div>

        <div className="repo-filters">
          <label>
            <span>Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              disabled={isLoadingCategories}
            >
              <option value="ALL">All Database Categories</option>
              {dbCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Program Badge</span>
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
            >
              <option value="ALL">All Program Badges</option>
              {programFilterOptions.map((prog) => (
                <option key={prog} value={prog}>
                  {prog}
                </option>
              ))}
            </select>
          </label>

          <label className="repo-search">
            <span>Search catalog</span>
            <div>
              <Search size={15} aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, author, program badge, tag or category..."
              />
            </div>
          </label>

          <button
            type="button"
            className="repo-reset"
            onClick={() => {
              setCategoryFilter('ALL');
              setProgramFilter('ALL');
              setSearchQuery('');
              setCurrentPage(1);
            }}
          >
            Reset
          </button>
        </div>

        {selectedDocuments.length > 0 && (
          <div className="repo-selection-toolbar" aria-live="polite">
            <div className="repo-selection-summary">
              <span className="repo-selection-check">
                <Check size={13} aria-hidden="true" />
              </span>
              <strong>{selectedDocuments.length} selected</strong>
              <span>Bulk download or delete selected PDFs.</span>
            </div>
            <div className="repo-selection-actions">
              <button
                type="button"
                className="secondary"
                disabled={isBatchBusy}
                onClick={() => void handleBulkDownload()}
              >
                {isBulkDownloading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Download size={13} aria-hidden="true" />
                )}
                <span>
                  {isBulkDownloading
                    ? 'Downloading...'
                    : `Download selected (${selectedDocuments.length})`}
                </span>
              </button>
              <button
                type="button"
                className="primary"
                disabled={isBatchBusy}
                onClick={() => {
                  setBulkDeleteError('');
                  setIsBulkDeleteModalOpen(true);
                }}
              >
                {isBulkDeleting ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} aria-hidden="true" />
                )}
                <span>Delete selected ({selectedDocuments.length})</span>
              </button>
            </div>
          </div>
        )}

        {listError && (
          <div role="alert" className="repo-alert-error" style={{ margin: '10px 14px' }}>
            <AlertCircle size={14} aria-hidden="true" />
            <span>{listError}</span>
          </div>
        )}

        <div
          className="repo-table-wrap"
          style={{ width: '100%', overflowX: 'auto', overflowY: 'visible' }}
        >
          <table className="repo-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="repo-select-column" style={{ width: '40px' }}>
                  <button
                    type="button"
                    className="repo-select-all"
                    onClick={toggleAllVisible}
                    disabled={paginatedDocuments.length === 0 || isLoadingDocs}
                    aria-label={
                      allVisibleSelected
                        ? 'Deselect all documents on current page'
                        : 'Select all documents on current page'
                    }
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
                <th className="nowrap">Document</th>
                <th className="nowrap">Author</th>
                <th className="nowrap">Category</th>
                <th className="nowrap">Size</th>
                <th className="nowrap" style={{ textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingDocs ? (
                <tr>
                  <td colSpan={6} className="empty">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={14} className="animate-spin" />
                      Loading library documents...
                    </span>
                  </td>
                </tr>
              ) : paginatedDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    No documents match your filter. Click &ldquo;Upload PDF&rdquo; to publish a resource.
                  </td>
                </tr>
              ) : (
                paginatedDocuments.map((doc) => {
                  const isSelected = selectedIds.has(doc.id);
                  const isBusy = busyActionId === doc.id || isBatchBusy;
                  const isMenuOpen = openActionDocId === doc.id;

                  return (
                    <tr
                      key={doc.id}
                      className={`repo-document-row${isSelected ? ' is-selected' : ''}`}
                      onClick={() => toggleOne(doc.id)}
                    >
                      <td
                        className="nowrap"
                        style={{ paddingTop: '8px', paddingBottom: '8px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className={`repo-row-checkbox${isSelected ? ' is-checked' : ''}`}
                          onClick={() => toggleOne(doc.id)}
                          aria-label={isSelected ? `Deselect ${doc.name}` : `Select ${doc.name}`}
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

                      <td
                        className="nowrap"
                        style={{
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          maxWidth: '280px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={doc.name}
                      >
                        <strong>{doc.name}</strong>
                      </td>

                      <td
                        className="nowrap"
                        style={{
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          maxWidth: '160px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          color: '#475569',
                        }}
                        title={doc.author || '—'}
                      >
                        {doc.author || '—'}
                      </td>

                      <td className="nowrap" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                        <span className="category">{doc.category || 'Uncategorized'}</span>
                      </td>

                      <td className="nowrap" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                        {formatBytes(doc.size)}
                      </td>

                      <td
                        className="nowrap"
                        style={{
                          paddingTop: '8px',
                          paddingBottom: '8px',
                          textAlign: 'right',
                          position: 'relative',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="secondary"
                          disabled={isBusy}
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          aria-label={`Actions for ${doc.name}`}
                          onClick={() =>
                            setOpenActionDocId((prev) => (prev === doc.id ? null : doc.id))
                          }
                        >
                          {busyActionId === doc.id ? (
                            <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                          ) : (
                            <MoreHorizontal size={14} aria-hidden="true" />
                          )}
                          <span>Actions</span>
                        </button>

                        {isMenuOpen && (
                          <div
                            role="menu"
                            aria-label={`Row actions for ${doc.name}`}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: 'calc(100% - 4px)',
                              zIndex: 30,
                              minWidth: '152px',
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '4px',
                              boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
                              padding: '4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              textAlign: 'left',
                            }}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isBusy}
                              onClick={() => {
                                setOpenActionDocId(null);
                                setRelatedTargetDoc(doc);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '12px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                color: '#0F172A',
                              }}
                            >
                              <Sparkles size={13} aria-hidden="true" />
                              <span>Related</span>
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              disabled={isBusy}
                              onClick={() => void handlePreview(doc)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '12px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                color: '#0F172A',
                              }}
                            >
                              <Eye size={13} aria-hidden="true" />
                              <span>View</span>
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              disabled={isBusy}
                              onClick={() => void handleDownload(doc)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '12px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                color: '#0F172A',
                              }}
                            >
                              <Download size={13} aria-hidden="true" />
                              <span>Download</span>
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              disabled={isBusy}
                              onClick={() => openEditModal(doc)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '12px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                color: '#0F172A',
                              }}
                            >
                              <Edit3 size={13} aria-hidden="true" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              disabled={isBusy}
                              onClick={() => {
                                setOpenActionDocId(null);
                                setDeletingDoc(doc);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '12px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer',
                                color: '#B91C1C',
                              }}
                            >
                              <Trash2 size={13} aria-hidden="true" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
            padding: '10px 14px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            fontSize: '12px',
          }}
        >
          <span style={{ color: '#475569' }}>
            Showing {rangeStart}–{rangeEnd} of {filteredDocuments.length}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#475569' }}>
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Rows per page"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </label>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                className="secondary"
                disabled={safeCurrentPage <= 1 || isLoadingDocs}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} aria-hidden="true" />
                <span>Prev</span>
              </button>

              <span style={{ padding: '0 6px', fontWeight: 600, color: '#0F172A' }}>
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="secondary"
                disabled={safeCurrentPage >= totalPages || isLoadingDocs}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <span>Next</span>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Related Books Recommendation Modal */}
      {relatedTargetDoc && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRelatedTargetDoc(null);
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(620px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="related-books-modal-title"
          >
            <header>
              <strong id="related-books-modal-title">
                <Sparkles size={15} aria-hidden="true" />
                RELATED BOOKS · CROSS-PROGRAM DISCOVERY
              </strong>
              <button
                type="button"
                onClick={() => setRelatedTargetDoc(null)}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <small>BASED ON SHARED PROGRAMS, TAGS &amp; CATEGORIES</small>
              <h2>Related to &ldquo;{relatedTargetDoc.name}&rdquo;</h2>
              <p>
                Surfaces books sharing program badges across adjacent categories or matching topic tags.
              </p>

              {relatedMatches.length === 0 ? (
                <div style={{ padding: '14px', fontSize: '12px', color: '#64748B' }}>
                  No related books found yet. Add program badges or topic tags to more PDFs to link recommendations.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                  {relatedMatches.map(({ doc: rel, reasonSummary, isAdjacentProgramMatch }) => (
                    <div
                      key={rel.id}
                      style={{
                        border: '1px solid #CBD5E1',
                        borderRadius: '2px',
                        padding: '10px 12px',
                        background: '#FFFFFF',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong>{rel.name}</strong>
                          <span className="category">{rel.category || 'Uncategorized'}</span>
                          {isAdjacentProgramMatch && (
                            <span
                              className="category"
                              style={{ background: '#ECFDF5', color: '#065F46' }}
                            >
                              Adjacent Category Match
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                          {reasonSummary}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => {
                          setRelatedTargetDoc(null);
                          void handlePreview(rel);
                        }}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setRelatedTargetDoc(null)}
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Upload PDF Modal */}
      <UploadPdfModal
        isOpen={isUploadModalOpen}
        categories={dbCategories}
        availablePrograms={programFilterOptions}
        defaultCategory={dbCategories[0] || ''}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmitUpload={handleUploadSubmit}
      />

      {/* Edit Document Modal */}
      {editingDoc && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSavingEdit) {
              setEditingDoc(null);
            }
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(580px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-doc-modal-title"
          >
            <header>
              <strong id="edit-doc-modal-title">
                <Edit3 size={15} aria-hidden="true" />
                UPDATE BOOK METADATA
              </strong>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                disabled={isSavingEdit}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <small>CATALOG &amp; RECOMMENDATION METADATA</small>
              <h2>Edit Document</h2>
              <p>Update title, category, informational program badges, or tags.</p>

              {editError && (
                <div role="alert" className="repo-alert-error">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{editError}</span>
                </div>
              )}

              <form id="edit-doc-form" onSubmit={handleSaveEdit} className="repo-form">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                  }}
                >
                  <label className="repo-field">
                    <span>Document Title</span>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={isSavingEdit}
                    />
                  </label>

                  <label className="repo-field">
                    <span>Author</span>
                    <input
                      type="text"
                      value={editAuthor}
                      onChange={(e) => setEditAuthor(e.target.value)}
                      disabled={isSavingEdit}
                    />
                  </label>
                </div>

                <label className="repo-field">
                  <span>Category (From Database)</span>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    disabled={isSavingEdit}
                  >
                    {dbCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="repo-field">
                  <span>Program Badges (Comma-separated · informational)</span>
                  <input
                    type="text"
                    placeholder="e.g. Cyber Security, Networking"
                    value={editProgramsText}
                    onChange={(e) => setEditProgramsText(e.target.value)}
                    disabled={isSavingEdit}
                  />
                </label>

                <label className="repo-field">
                  <span>Tags (Comma-separated)</span>
                  <input
                    type="text"
                    placeholder="e.g. tcp-ip, firewalls, cryptography"
                    value={editTagsText}
                    onChange={(e) => setEditTagsText(e.target.value)}
                    disabled={isSavingEdit}
                  />
                </label>

                <label className="repo-field">
                  <span>Summary / Notes</span>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    disabled={isSavingEdit}
                  />
                </label>
              </form>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setEditingDoc(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-doc-form"
                className="primary"
                disabled={isSavingEdit || !editName.trim()}
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} aria-hidden="true" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {deletingDoc && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeletingDoc) {
              setDeletingDoc(null);
            }
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(460px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-doc-modal-title"
          >
            <header>
              <strong id="delete-doc-modal-title">
                <Trash2 size={15} aria-hidden="true" />
                DELETE DOCUMENT
              </strong>
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                disabled={isDeletingDoc}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <small>PERMANENT REMOVAL</small>
              <h2>Delete &ldquo;{deletingDoc.name}&rdquo;?</h2>
              <p>
                Remove <strong>{deletingDoc.filename}</strong> ({formatBytes(deletingDoc.size)}) from the library catalog.
              </p>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setDeletingDoc(null)}
                disabled={isDeletingDoc}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={isDeletingDoc}
                onClick={() => void handleConfirmDelete()}
              >
                {isDeletingDoc ? (
                  <>
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} aria-hidden="true" />
                    <span>Delete Document</span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isBulkDeleting) {
              setIsBulkDeleteModalOpen(false);
            }
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(480px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-delete-doc-title"
          >
            <header>
              <strong id="bulk-delete-doc-title">
                <Trash2 size={15} aria-hidden="true" />
                BULK DELETE DOCUMENTS
              </strong>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <small>BATCH REMOVAL</small>
              <h2>Delete {selectedDocuments.length} Documents?</h2>
              <p>
                Permanently remove: <strong>{selectedDocuments.map((d) => d.name).join(', ')}</strong>.
              </p>

              {bulkDeleteError && (
                <div role="alert" className="repo-alert-error">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{bulkDeleteError}</span>
                </div>
              )}
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isBulkDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={isBulkDeleting}
                onClick={() => void handleBulkDeleteConfirm()}
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    <span>Deleting {selectedDocuments.length}...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} aria-hidden="true" />
                    <span>Delete {selectedDocuments.length} Selected</span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* PDF Preview Modal with Related Books */}
      {previewDoc && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreviewDoc(null);
          }}
        >
          <section
            className="repo-modal"
            style={{
              width: 'min(960px, 100%)',
              height: '84vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={previewDoc.doc.name}
          >
            <header>
              <strong>
                <Eye size={15} aria-hidden="true" />
                {previewDoc.doc.name}
              </strong>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                aria-label="Close preview"
              >
                <X size={18} />
              </button>
            </header>
            <div
              className="modal-body"
              style={{
                flex: 1,
                padding: 0,
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 260px',
              }}
            >
              <iframe
                src={previewDoc.blobUrl}
                title={previewDoc.doc.name}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
              <aside
                style={{
                  borderLeft: '1px solid #CBD5E1',
                  padding: '12px',
                  overflowY: 'auto',
                  background: '#F8FAFC',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
                  Related Books ({previewRelatedMatches.length})
                </div>
                {previewRelatedMatches.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#64748B' }}>
                    No related books matched yet.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {previewRelatedMatches.map(({ doc: item, reasonSummary }) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '8px',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '2px',
                        }}
                      >
                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{item.name}</div>
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                          {item.category || 'Uncategorized'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#334155', marginTop: '4px' }}>
                          {reasonSummary}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>
            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setPreviewDoc(null)}
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};
