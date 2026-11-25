'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  deleteDocumentRequest,
  fetchAuthorizedDocumentBlobUrl,
  fetchDocumentsRequest,
  fetchMyDocumentsRequest,
  triggerAuthenticatedPdfDownload,
  updateDocumentRequest,
  uploadDocumentRequest,
  type DocumentRecord,
} from '@/lib/library-api';
import type { RepositoryDocument } from '@/types/repository';
import {
  AlertCircle,
  BookMarked,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  FileUp,
  Filter,
  FolderKanban,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import { AsitBookLoader } from '@/components/AsitBookLoader';
import PortalHeader from './PortalHeader';
import DocumentPreviewModal from './DocumentPreviewModal';
import PdfThumbnail from './PdfThumbnail';
import {
  AdminCategoriesSection,
  type LibraryCategoryItem,
} from './AdminCategoriesSection';
import { UploadPdfModal, type UploadPdfMetadata } from './UploadPdfModal';

type Props = {
  onSearch?: (query: string) => void;
  onLogout?: () => void;
  onNavigateHome?: () => void;
};

type InstructorTab = 'shelf' | 'manage-uploads' | 'categories';

type InstructorBookRecord = DocumentRecord & {
  coverUrl?: string | null;
  uploadedById?: string | null;
};

type PreviewableRepositoryDocument = RepositoryDocument & {
  previewUrl?: string;
};

interface RelatedBookMatch {
  doc: InstructorBookRecord;
  score: number;
  sharedPrograms: string[];
  sharedTags: string[];
  isAdjacentCategoryMatch: boolean;
  reason: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function extractNames(items?: Array<string | { name: string }>): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item : item?.name || ''))
    .map((val) => val.trim())
    .filter(Boolean);
}

function getGroupLetter(title: string): string {
  const first = (title || '').trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : '#';
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getRelatedBooks(
  target: InstructorBookRecord,
  catalog: InstructorBookRecord[]
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
    const isAdjacentCategoryMatch =
      sharedPrograms.length > 0 &&
      Boolean(targetCat && candCat && targetCat !== candCat);

    let score = 0;
    if (sharedPrograms.length > 0) {
      score += sharedPrograms.length * (isAdjacentCategoryMatch ? 6 : 4);
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
          isAdjacentCategoryMatch
            ? `Program badge (${sharedPrograms.join(', ')}) in ${candidate.category || 'adjacent category'}`
            : `Program badge (${sharedPrograms.join(', ')})`
        );
      }
      if (sharedTags.length > 0) {
        reasons.push(`Tags: ${sharedTags.map((t) => `#${t}`).join(', ')}`);
      }
      if (sameCategory && sharedPrograms.length === 0) {
        reasons.push(`Category: ${candidate.category}`);
      }

      matches.push({
        doc: candidate,
        score,
        sharedPrograms,
        sharedTags,
        isAdjacentCategoryMatch,
        reason: reasons.join(' · '),
      });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score || a.doc.name.localeCompare(b.doc.name))
    .slice(0, 4);
}

async function resolveFallbackCoverBlob(
  doc: InstructorBookRecord
): Promise<string | null> {
  if (doc.coverUrl) return null;

  const streamUrl =
    doc.signedUrl || `/api/documents/${encodeURIComponent(doc.id)}/file`;

  if (streamUrl.startsWith('blob:')) {
    return streamUrl;
  }

  try {
    const fetched = await fetchAuthorizedDocumentBlobUrl(streamUrl);
    if (fetched.ok && fetched.blobUrl) {
      return fetched.blobUrl;
    }
  } catch (error) {
    console.error(
      `[InstructorDashboard] Thumbnail error for ${doc.name}:`,
      error
    );
  }

  return null;
}

export const InstructorDashboard: React.FC<Props> = ({
  onSearch,
  onLogout,
  onNavigateHome,
}) => {
  const { currentUser, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<InstructorTab>('shelf');
  const [openCategorySignal, setOpenCategorySignal] = useState(0);

  // Database categories
  const [categories, setCategories] = useState<LibraryCategoryItem[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Open library shelf books (picture-based view matching StudentLibrary)
  const [shelfBooks, setShelfBooks] = useState<InstructorBookRecord[]>([]);
  const [isLoadingShelf, setIsLoadingShelf] = useState(true);
  const [fallbackCoverUrls, setFallbackCoverUrls] = useState<Record<string, string>>({});
  const thumbnailBlobUrls = useRef<Set<string>>(new Set());

  // Only uploads belonging to this instructor (fetched from /api/documents/mine)
  const [myUploads, setMyUploads] = useState<InstructorBookRecord[]>([]);
  const [isLoadingUploads, setIsLoadingUploads] = useState(true);
  const [uploadsError, setUploadsError] = useState('');

  // Shelf filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [programFilter, setProgramFilter] = useState('ALL');
  const [activeLetter, setActiveLetter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'title' | 'recent'>('title');

  // Manage Uploads table filters, pagination & selection
  const [tableSearch, setTableSearch] = useState('');
  const [tableCategoryFilter, setTableCategoryFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openActionDocId, setOpenActionDocId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  // Upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Edit modal (own uploads only)
  const [editingDoc, setEditingDoc] = useState<InstructorBookRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editProgramsText, setEditProgramsText] = useState('');
  const [editTagsText, setEditTagsText] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  // Single delete modal (own uploads only)
  const [deletingDoc, setDeletingDoc] = useState<InstructorBookRecord | null>(
    null
  );
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Related & Preview modals
  const [relatedTargetDoc, setRelatedTargetDoc] =
    useState<InstructorBookRecord | null>(null);
  const [previewDoc, setPreviewDoc] = useState<PreviewableRepositoryDocument | null>(
    null
  );
  const [previewLoadingDocId, setPreviewLoadingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
  }, []);

  useEffect(() => {
    return () => {
      thumbnailBlobUrls.current.forEach((url) => URL.revokeObjectURL(url));
      thumbnailBlobUrls.current.clear();
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, tableCategoryFilter, pageSize]);

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

  const closePreviewModal = useCallback(() => {
    setPreviewLoadingDocId(null);
    setPreviewDoc((prev) => {
      if (prev?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  }, []);

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch('/api/categories', { cache: 'no-store' });
      if (!res.ok) {
        notify('error', 'Failed to load categories from database.');
        return;
      }
      const data = await res.json();
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.categories)
          ? data.categories
          : [];

      const normalized: LibraryCategoryItem[] = rawList.map(
        (
          item: {
            id?: string;
            name: string;
            slug?: string;
            description?: string | null;
          },
          idx: number
        ) => ({
          id: item.id || `cat-${idx}`,
          name: item.name,
          slug: item.slug,
          description:
            item.description || `Open library resources in ${item.name}.`,
        })
      );
      setCategories(normalized);
    } catch {
      notify('error', 'Network error while loading categories from database.');
    } finally {
      setIsLoadingCategories(false);
    }
  }, [notify]);

  const loadShelfBooks = useCallback(async () => {
    setIsLoadingShelf(true);
    try {
      const res = await fetchDocumentsRequest();
      if (res.ok && res.documents) {
        setShelfBooks(res.documents as InstructorBookRecord[]);
      } else if (res.error) {
        notify('error', res.error);
      }
    } catch {
      notify('error', 'Network error while loading open library shelf.');
    } finally {
      setIsLoadingShelf(false);
    }
  }, [notify]);

  // Fetches only uploads created by the current instructor via /api/documents/mine
  const loadMyUploads = useCallback(async () => {
    setIsLoadingUploads(true);
    setUploadsError('');
    try {
      const res = await fetchMyDocumentsRequest({
        category: tableCategoryFilter,
        q: tableSearch,
      });

      if (!res.ok) {
        setUploadsError(res.error || 'Failed to load your uploaded books.');
        return;
      }

      const docs = (res.documents || []) as InstructorBookRecord[];
      const strictlyOwned = currentUser?.id
        ? docs.filter((doc) => {
          const ownerId = doc.uploadedBy?.id || doc.uploadedById;
          return !ownerId || ownerId === currentUser.id;
        })
        : docs;

      setMyUploads(strictlyOwned);
    } catch {
      setUploadsError('Network error while loading your uploaded books.');
    } finally {
      setIsLoadingUploads(false);
    }
  }, [currentUser?.id, tableCategoryFilter, tableSearch]);

  useEffect(() => {
    void loadCategories();
    void loadShelfBooks();
  }, [loadCategories, loadShelfBooks]);

  useEffect(() => {
    void loadMyUploads();
  }, [loadMyUploads]);

  useEffect(() => {
    let cancelled = false;
    const pdfDocsWithoutCover = shelfBooks.filter(
      (doc) =>
        !doc.coverUrl &&
        !fallbackCoverUrls[doc.id] &&
        (doc.mimeType === 'application/pdf' ||
          doc.filename.toLowerCase().endsWith('.pdf'))
    );

    async function resolveFallbackCovers() {
      for (const doc of pdfDocsWithoutCover) {
        if (cancelled) break;
        const resolved = await resolveFallbackCoverBlob(doc);
        if (cancelled) {
          if (resolved?.startsWith('blob:')) URL.revokeObjectURL(resolved);
          break;
        }
        if (resolved) {
          if (resolved.startsWith('blob:')) {
            thumbnailBlobUrls.current.add(resolved);
          }
          setFallbackCoverUrls((prev) => ({ ...prev, [doc.id]: resolved }));
        }
      }
    }

    void resolveFallbackCovers();
    return () => {
      cancelled = true;
    };
  }, [shelfBooks, fallbackCoverUrls]);

  // Category CRUD handlers
  const handleCreateCategory = useCallback(
    async (
      name: string,
      description: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!name) return { ok: false, error: 'Category name is required.' };
      try {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: description || `Open library resources in ${name}.`,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            error: data?.error || 'Failed to save category to database.',
          };
        }
        await loadCategories();
        notify('success', `Created category "${name}".`);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error while creating category.' };
      }
    },
    [loadCategories, notify]
  );

  const handleUpdateCategory = useCallback(
    async (
      id: string,
      name: string,
      description: string
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!name) return { ok: false, error: 'Category name is required.' };
      try {
        const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: description || `Open library resources in ${name}.`,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data?.error || 'Failed to update category.' };
        }
        await loadCategories();
        notify('success', `Updated category to "${name}".`);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error while updating category.' };
      }
    },
    [loadCategories, notify]
  );

  const handleDeleteCategory = useCallback(
    async (item: LibraryCategoryItem): Promise<{ ok: boolean; error?: string }> => {
      try {
        const res = await fetch(`/api/categories/${encodeURIComponent(item.id)}`, {
          method: 'DELETE',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data?.error || 'Failed to delete category.' };
        }
        await loadCategories();
        notify('success', `Deleted category "${item.name}".`);
        return { ok: true };
      } catch {
        return { ok: false, error: 'Network error while deleting category.' };
      }
    },
    [loadCategories, notify]
  );

  const handleBulkDeleteCategories = useCallback(
    async (
      items: LibraryCategoryItem[]
    ): Promise<{ ok: boolean; error?: string }> => {
      if (items.length === 0) return { ok: false, error: 'No categories selected.' };
      try {
        const bulkRes = await fetch('/api/categories/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: items.map((i) => i.id) }),
        });

        if (!bulkRes.ok && bulkRes.status === 404) {
          for (const item of items) {
            const singleRes = await fetch(
              `/api/categories/${encodeURIComponent(item.id)}`,
              { method: 'DELETE' }
            );
            if (!singleRes.ok) {
              const errData = await singleRes.json().catch(() => ({}));
              return {
                ok: false,
                error: errData?.error || `Failed to delete "${item.name}".`,
              };
            }
          }
        } else if (!bulkRes.ok) {
          const errData = await bulkRes.json().catch(() => ({}));
          return { ok: false, error: errData?.error || 'Bulk delete failed.' };
        }

        await loadCategories();
        notify('success', `Deleted ${items.length} selected category(ies).`);
        return { ok: true };
      } catch {
        return {
          ok: false,
          error: 'Network error while deleting selected categories.',
        };
      }
    },
    [loadCategories, notify]
  );

  const dbCategoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories]
  );

  const programBadgeOptions = useMemo(() => {
    const merged = new Map<string, string>();
    for (const doc of shelfBooks) {
      for (const prog of extractNames(doc.programs)) {
        if (!merged.has(prog.toLowerCase())) {
          merged.set(prog.toLowerCase(), prog);
        }
      }
    }
    return Array.from(merged.values()).sort((a, b) => a.localeCompare(b));
  }, [shelfBooks]);

  // Open Library Shelf filtering & grouping
  const filteredShelfBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = shelfBooks.filter((doc) => {
      const isPdf =
        doc.mimeType === 'application/pdf' ||
        doc.filename.toLowerCase().endsWith('.pdf');
      if (!isPdf) return false;

      const docCat = (doc.category || 'Uncategorized').trim();
      if (
        categoryFilter !== 'ALL' &&
        docCat.toLowerCase() !== categoryFilter.toLowerCase()
      ) {
        return false;
      }

      const docPrograms = extractNames(doc.programs);
      if (
        programFilter !== 'ALL' &&
        !docPrograms.some((p) => p.toLowerCase() === programFilter.toLowerCase())
      ) {
        return false;
      }

      if (activeLetter !== 'ALL' && getGroupLetter(doc.name) !== activeLetter) {
        return false;
      }

      if (!q) return true;
      const docTags = extractNames(doc.tags);
      return (
        doc.name.toLowerCase().includes(q) ||
        (doc.author || '').toLowerCase().includes(q) ||
        docCat.toLowerCase().includes(q) ||
        doc.filename.toLowerCase().includes(q) ||
        docPrograms.some((p) => p.toLowerCase().includes(q)) ||
        docTags.some((t) => t.toLowerCase().includes(q))
      );
    });

    if (sortBy === 'recent') {
      return [...list].sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [
    shelfBooks,
    categoryFilter,
    programFilter,
    activeLetter,
    searchQuery,
    sortBy,
  ]);

  const shelfSections = useMemo(() => {
    const bucketMap = new Map<string, InstructorBookRecord[]>();
    for (const doc of filteredShelfBooks) {
      const key = getGroupLetter(doc.name);
      const list = bucketMap.get(key) || [];
      list.push(doc);
      bucketMap.set(key, list);
    }

    const sortedLetters = Array.from(bucketMap.keys()).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return sortedLetters.map((letter) => ({
      letter,
      books: bucketMap.get(letter) || [],
    }));
  }, [filteredShelfBooks]);

  // Pagination for instructor's own uploaded books
  const totalPages = Math.max(1, Math.ceil(myUploads.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUploads = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return myUploads.slice(start, start + pageSize);
  }, [myUploads, safeCurrentPage, pageSize]);

  const rangeStart =
    myUploads.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, myUploads.length);

  const visibleUploadIds = useMemo(
    () => paginatedUploads.map((d) => d.id),
    [paginatedUploads]
  );

  const selectedUploads = useMemo(
    () => myUploads.filter((d) => selectedIds.has(d.id)),
    [myUploads, selectedIds]
  );

  const allUploadsSelected =
    visibleUploadIds.length > 0 &&
    visibleUploadIds.every((id) => selectedIds.has(id));
  const someUploadsSelected = visibleUploadIds.some((id) => selectedIds.has(id));

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllUploads = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allUploadsSelected) {
        visibleUploadIds.forEach((id) => next.delete(id));
      } else {
        visibleUploadIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Upload new book linked to database category + tags + program badges
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
      });

      if (!res.ok || !res.document) {
        return { ok: false, error: res.error || 'Failed to upload book.' };
      }

      notify(
        'success',
        `Uploaded "${res.document.name}" linked to "${payload.category}".`
      );
      await Promise.all([loadMyUploads(), loadShelfBooks()]);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error while uploading book.' };
    }
  };

  const openEditModal = (doc: InstructorBookRecord) => {
    setOpenActionDocId(null);
    setEditingDoc(doc);
    setEditName(doc.name);
    setEditAuthor(doc.author || '');
    setEditCategory(doc.category || dbCategoryNames[0] || '');
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
      setEditError('Book title is required.');
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
      });

      if (!res.ok || !res.document) {
        setEditError(res.error || 'Failed to update upload.');
        return;
      }

      setEditingDoc(null);
      notify('success', `Updated "${res.document.name}".`);
      await Promise.all([loadMyUploads(), loadShelfBooks()]);
    } catch {
      setEditError('Network error while updating upload.');
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
        notify('error', res.error || 'Failed to delete upload.');
        setDeletingDoc(null);
        return;
      }
      const removedId = deletingDoc.id;
      const removedName = deletingDoc.name;
      setMyUploads((prev) => prev.filter((d) => d.id !== removedId));
      setShelfBooks((prev) => prev.filter((d) => d.id !== removedId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(removedId);
        return next;
      });
      setDeletingDoc(null);
      notify('success', `Deleted "${removedName}".`);
    } catch {
      notify('error', 'Network error while deleting upload.');
      setDeletingDoc(null);
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedUploads.length === 0) return;
    setBulkDeleteError('');
    setIsBulkDeleting(true);

    let deletedCount = 0;
    const deletedIds = new Set<string>();
    const failedNames: string[] = [];

    try {
      for (const doc of selectedUploads) {
        const res = await deleteDocumentRequest(doc.id);
        if (res.ok) {
          deletedCount += 1;
          deletedIds.add(doc.id);
        } else {
          failedNames.push(doc.name);
        }
      }

      if (deletedIds.size > 0) {
        setMyUploads((prev) => prev.filter((d) => !deletedIds.has(d.id)));
        setShelfBooks((prev) => prev.filter((d) => !deletedIds.has(d.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          deletedIds.forEach((id) => next.delete(id));
          return next;
        });
      }

      if (failedNames.length > 0) {
        setBulkDeleteError(
          `Deleted ${deletedCount} item(s), failed on: ${failedNames.join(', ')}.`
        );
        return;
      }

      setIsBulkDeleteModalOpen(false);
      notify('success', `Deleted ${deletedCount} selected upload(s).`);
    } catch {
      setBulkDeleteError('Network error during bulk delete.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const mapToRepositoryDocument = useCallback(
    (doc: InstructorBookRecord): RepositoryDocument => {
      const programs = extractNames(doc.programs);
      const tags = extractNames(doc.tags);
      return {
        docId: doc.id,
        courseCode: doc.category || 'OPEN',
        courseTitle: programs[0] || doc.category || 'Open Library',
        department: programs.join(', ') || 'Open Access',
        title: doc.name,
        summary: doc.description || `${doc.category || 'General'} · ${doc.filename}`,
        category: doc.category || 'General',
        author: doc.author || doc.uploadedBy?.fullName || 'Open Library',
        size: formatBytes(doc.size),
        pages: 1,
        uploadDate: doc.createdAt
          ? doc.createdAt.split('T')[0]
          : new Date().toISOString().split('T')[0],
        topics: tags.map((t) => `#${t}`).join(' '),
      };
    },
    []
  );

  const resolveStreamUrl = (
    doc: InstructorBookRecord,
    download = false
  ): string => {
    const base =
      doc.signedUrl || `/api/documents/${encodeURIComponent(doc.id)}/file`;
    if (!download) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}download=1`;
  };

  const handlePreviewRepoDoc = useCallback(
    async (doc: RepositoryDocument) => {
      setPreviewLoadingDocId(doc.docId);
      setPreviewDoc((prev) => {
        if (prev?.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(prev.previewUrl);
        }
        return { ...doc, previewUrl: undefined };
      });
      try {
        const match =
          shelfBooks.find((item) => item.id === doc.docId) ||
          myUploads.find((item) => item.id === doc.docId);
        if (!match) return;

        const streamUrl = resolveStreamUrl(match, false);
        if (streamUrl.startsWith('blob:')) {
          setPreviewDoc({ ...doc, previewUrl: streamUrl });
          return;
        }

        const fetched = await fetchAuthorizedDocumentBlobUrl(streamUrl);
        if (!fetched.ok || !fetched.blobUrl) {
          notify('error', fetched.error || 'Unable to load PDF preview.');
          return;
        }
        setPreviewDoc({ ...doc, previewUrl: fetched.blobUrl });
      } finally {
        setPreviewLoadingDocId(null);
      }
    },
    [shelfBooks, myUploads, notify]
  );

  const handleDownloadRepoDoc = useCallback(
    async (doc: RepositoryDocument) => {
      setDownloadingDocId(doc.docId);
      try {
        const match =
          shelfBooks.find((item) => item.id === doc.docId) ||
          myUploads.find((item) => item.id === doc.docId);
        if (!match) {
          notify('error', 'Book record not found.');
          return;
        }
        const res = await triggerAuthenticatedPdfDownload(
          resolveStreamUrl(match, true),
          match.filename || `${doc.title}.pdf`
        );
        if (!res.ok) {
          notify('error', res.error || 'Failed to download PDF.');
          return;
        }
        notify('success', `Downloaded "${doc.title}".`);
      } finally {
        setDownloadingDocId((prev) => (prev === doc.docId ? null : prev));
      }
    },
    [shelfBooks, myUploads, notify]
  );

  const handleTablePreview = async (doc: InstructorBookRecord) => {
    setOpenActionDocId(null);
    if (!doc.signedUrl) {
      notify('error', 'Preview URL unavailable. Refresh first.');
      return;
    }
    setBusyActionId(doc.id);
    try {
      const res = await fetchAuthorizedDocumentBlobUrl(doc.signedUrl);
      if (!res.ok || !res.blobUrl) {
        notify('error', res.error || 'Could not load PDF preview.');
        return;
      }
      if (previewDoc?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewDoc.previewUrl);
      }
      setPreviewDoc({
        ...mapToRepositoryDocument(doc),
        previewUrl: res.blobUrl,
      });
    } finally {
      setBusyActionId(null);
    }
  };

  const handleTableDownload = async (doc: InstructorBookRecord) => {
    setOpenActionDocId(null);
    if (!doc.signedUrl) {
      notify('error', 'Download URL unavailable. Refresh first.');
      return;
    }
    setBusyActionId(doc.id);
    try {
      const res = await triggerAuthenticatedPdfDownload(
        `${doc.signedUrl}${doc.signedUrl.includes('?') ? '&' : '?'}download=1`,
        doc.filename || `${doc.name}.pdf`
      );
      if (!res.ok) {
        notify('error', res.error || 'Could not download PDF.');
        return;
      }
      notify('success', `Downloaded "${doc.name}".`);
    } finally {
      setBusyActionId(null);
    }
  };

  const relatedMatches = useMemo(() => {
    if (!relatedTargetDoc) return [];
    return getRelatedBooks(relatedTargetDoc, shelfBooks);
  }, [relatedTargetDoc, shelfBooks]);

  const hasShelfFilters =
    categoryFilter !== 'ALL' ||
    programFilter !== 'ALL' ||
    activeLetter !== 'ALL' ||
    searchQuery.trim().length > 0;

  return (
    <div className="repo-page">
      <PortalHeader
        appName="Digital Resource Library"
        workspaceName="Instructor Library · Shelf & Manage Uploads"
        version="v1.0"
        systemStatus="Online"
        onSearch={(q) => {
          if (activeTab === 'manage-uploads') {
            setTableSearch(q);
          } else {
            setSearchQuery(q);
          }
          onSearch?.(q);
        }}
        onLogout={onLogout || logout}
        onNewItem={() => {
          if (activeTab === 'categories') {
            setOpenCategorySignal((n) => n + 1);
          } else {
            setIsUploadModalOpen(true);
          }
        }}
        onSettings={onNavigateHome}
      />

      <main className="repo-main" style={{ marginTop: '20px' }}>
        <div
          className="repo-content"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}
        >
          <div className="repo-heading">
            <div>
              <small>INSTRUCTOR WORKSPACE</small>
              <h2>Open Library &amp; Manage Uploads</h2>
              <p>
                Browse the open library shelf in picture form or switch to Manage Uploads to manage only content you uploaded.
              </p>
            </div>
            <div className="repo-heading-right">
              <div className="repo-count">
                <strong>{shelfBooks.length}</strong>
                <span>OPEN SHELF</span>
              </div>
              <div className="repo-count">
                <strong>{myUploads.length}</strong>
                <span>MY UPLOADS</span>
              </div>
            </div>
          </div>

          {/* Section Switcher */}
          <div
            role="tablist"
            aria-label="Instructor workspace sections"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '8px',
              background: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '2px',
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'shelf'}
              className={activeTab === 'shelf' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('shelf')}
            >
              <LayoutGrid size={14} aria-hidden="true" />
              <span>Open Library Shelf ({shelfBooks.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'manage-uploads'}
              className={activeTab === 'manage-uploads' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('manage-uploads')}
            >
              <Table2 size={14} aria-hidden="true" />
              <span>Manage Uploads ({myUploads.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'categories'}
              className={activeTab === 'categories' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('categories')}
            >
              <FolderKanban size={14} aria-hidden="true" />
              <span>Categories ({categories.length})</span>
            </button>
          </div>

          {feedback && (
            <div
              role={feedback.type === 'error' ? 'alert' : 'status'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '10px 12px',
                fontSize: '11px',
                borderRadius: '2px',
                border:
                  feedback.type === 'error'
                    ? '1px solid #FCA5A5'
                    : '1px solid #B7D8C4',
                background: feedback.type === 'error' ? '#FEF2F2' : '#F0F8F3',
                color: feedback.type === 'error' ? '#991B1B' : '#1E4620',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {feedback.type === 'error' ? (
                  <AlertCircle size={15} aria-hidden="true" />
                ) : (
                  <ShieldCheck size={15} aria-hidden="true" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                aria-label="Dismiss notification"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'inherit',
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* 1. Open Library Shelf (Picture-based view matching StudentLibrary) */}
          {activeTab === 'shelf' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <section className="repo-panel">
                <div
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BookOpen size={18} aria-hidden="true" />
                    <div>
                      <strong style={{ fontSize: '15px' }}>Open Library Books</strong>
                      <span
                        style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          padding: '2px 7px',
                          background: '#F1F5F9',
                          borderRadius: '2px',
                          color: '#334155',
                        }}
                      >
                        {filteredShelfBooks.length}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void loadShelfBooks()}
                      disabled={isLoadingShelf}
                      style={{ minHeight: '32px', fontSize: '11px', padding: '0 8px' }}
                    >
                      <RefreshCw size={13} aria-hidden="true" />
                      <span>Refresh</span>
                    </button>

                    <button
                      type="button"
                      className="primary"
                      onClick={() => setIsUploadModalOpen(true)}
                      disabled={isLoadingCategories || dbCategoryNames.length === 0}
                      style={{ minHeight: '32px', fontSize: '11px', padding: '0 10px' }}
                    >
                      <FileUp size={13} aria-hidden="true" />
                      <span>Post Book</span>
                    </button>

                    <select
                      aria-label="Sort shelf books"
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(e.target.value as 'title' | 'recent')
                      }
                      style={{
                        minHeight: '32px',
                        fontSize: '11px',
                        padding: '0 8px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '2px',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="title">Title (A–Z)</option>
                      <option value="recent">Recently Added</option>
                    </select>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '2px',
                        padding: '0 8px',
                        minHeight: '32px',
                        background: '#FFFFFF',
                      }}
                    >
                      <Filter size={13} aria-hidden="true" />
                      <select
                        aria-label="Filter shelf by category"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          fontSize: '11px',
                        }}
                      >
                        <option value="ALL">All Categories</option>
                        {dbCategoryNames.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <select
                      aria-label="Filter shelf by program badge"
                      value={programFilter}
                      onChange={(e) => setProgramFilter(e.target.value)}
                      style={{
                        minHeight: '32px',
                        fontSize: '11px',
                        padding: '0 8px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '2px',
                        background: '#FFFFFF',
                      }}
                    >
                      <option value="ALL">All Program Badges</option>
                      {programBadgeOptions.map((prog) => (
                        <option key={prog} value={prog}>
                          {prog}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div
                  style={{
                    padding: '0 16px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: '1px solid #CBD5E1',
                      borderRadius: '2px',
                      padding: '6px 10px',
                      background: '#FFFFFF',
                    }}
                  >
                    <Search size={14} aria-hidden="true" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search title, author, category, program badge, or tag..."
                      style={{
                        width: '100%',
                        border: 'none',
                        outline: 'none',
                        fontSize: '12px',
                        background: 'transparent',
                      }}
                    />
                    {hasShelfFilters && (
                      <button
                        type="button"
                        className="secondary"
                        style={{
                          minHeight: '24px',
                          fontSize: '10px',
                          padding: '0 8px',
                        }}
                        onClick={() => {
                          setCategoryFilter('ALL');
                          setProgramFilter('ALL');
                          setActiveLetter('ALL');
                          setSearchQuery('');
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div
                    role="navigation"
                    aria-label="Alphabetical shelf index"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '4px',
                      flexWrap: 'wrap',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {ALPHABET.map((letter) => {
                        const selected = activeLetter === letter;
                        return (
                          <button
                            key={letter}
                            type="button"
                            onClick={() =>
                              setActiveLetter((prev) =>
                                prev === letter ? 'ALL' : letter
                              )
                            }
                            style={{
                              padding: '2px 5px',
                              border: 'none',
                              borderRadius: '2px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: selected ? 'bold' : 'normal',
                              background: selected ? '#0F294A' : 'transparent',
                              color: selected ? '#FFFFFF' : '#475569',
                            }}
                          >
                            {letter}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveLetter((prev) => (prev === '#' ? 'ALL' : '#'))
                        }
                        style={{
                          padding: '2px 6px',
                          border: 'none',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: activeLetter === '#' ? 'bold' : 'normal',
                          background:
                            activeLetter === '#' ? '#0F294A' : 'transparent',
                          color: activeLetter === '#' ? '#FFFFFF' : '#475569',
                        }}
                      >
                        #
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveLetter('ALL')}
                      style={{
                        padding: '2px 8px',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: activeLetter === 'ALL' ? 'bold' : 'normal',
                        background:
                          activeLetter === 'ALL' ? '#E2E8F0' : 'transparent',
                        color: '#0F294A',
                      }}
                    >
                      ALL
                    </button>
                  </div>
                </div>
              </section>

              {isLoadingShelf ? (
                <div
                  role="status"
                  aria-live="polite"
                  style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 40,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    background: 'rgba(248, 250, 252, 0.72)',
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  <AsitBookLoader
                    size={84}
                    label="Loading open library shelf..."
                  />
                </div>
              ) : shelfSections.length === 0 ? (
                <section className="repo-panel">
                  <div
                    className="empty"
                    style={{ padding: '48px 20px', textAlign: 'center' }}
                  >
                    <BookOpen
                      size={32}
                      style={{ margin: '0 auto 12px', color: '#64748B' }}
                    />
                    <h3
                      style={{
                        margin: '0 0 6px',
                        color: '#0F294A',
                        fontSize: '16px',
                        fontWeight: 'bold',
                      }}
                    >
                      {hasShelfFilters
                        ? 'No Matching Books Found'
                        : 'Open Library Is Empty'}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        color: '#64748B',
                        fontSize: '11px',
                        maxWidth: '420px',
                        marginInline: 'auto',
                      }}
                    >
                      {hasShelfFilters
                        ? 'Try clearing your search, category, program badge, or letter filter.'
                        : 'No books have been published to the open library yet.'}
                    </p>
                  </div>
                </section>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {shelfSections.map(({ letter, books }) => (
                    <section
                      key={letter}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 'bold',
                          color: '#0F294A',
                          borderBottom: '1px solid #E2E8F0',
                          paddingBottom: '4px',
                        }}
                      >
                        {letter}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns:
                            'repeat(auto-fill, minmax(150px, 1fr))',
                          gap: '20px',
                          alignItems: 'start',
                        }}
                      >
                        {books.map((book) => {
                          const isBusy =
                            previewLoadingDocId === book.id ||
                            downloadingDocId === book.id;
                          const effectiveCoverUrl =
                            book.coverUrl || fallbackCoverUrls[book.id] || null;

                          return (
                            <article
                              key={book.id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setRelatedTargetDoc(book)}
                                style={{
                                  position: 'relative',
                                  aspectRatio: '2 / 3',
                                  width: '100%',
                                  padding: 0,
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '3px',
                                  background: '#FFFFFF',
                                  cursor: 'pointer',
                                  display: 'block',
                                  textAlign: 'left',
                                  overflow: 'hidden',
                                }}
                              >
                                <PdfThumbnail
                                  coverUrl={effectiveCoverUrl}
                                  title={book.name}
                                  department={book.category || 'Open Library'}
                                />
                              </button>

                              <div>
                                <div
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#0F294A',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                  title={book.name}
                                >
                                  {book.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: '#64748B',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {book.author || book.category || 'Open Access'}
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="secondary"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handlePreviewRepoDoc(
                                      mapToRepositoryDocument(book)
                                    )
                                  }
                                  style={{
                                    flex: 1,
                                    minHeight: '26px',
                                    fontSize: '10px',
                                    padding: '0 6px',
                                  }}
                                >
                                  <Eye size={11} />
                                  <span>Read</span>
                                </button>
                                <button
                                  type="button"
                                  className="secondary"
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleDownloadRepoDoc(
                                      mapToRepositoryDocument(book)
                                    )
                                  }
                                  style={{
                                    minHeight: '26px',
                                    fontSize: '10px',
                                    padding: '0 6px',
                                  }}
                                  title="Download PDF"
                                >
                                  <Download size={11} />
                                </button>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Manage Uploads Compact Data Table (Strictly shows & manages only this instructor's uploads) */}
          {activeTab === 'manage-uploads' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <strong style={{ fontSize: '13px' }}>
                  Manage My Uploaded Content Only
                </strong>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void loadMyUploads()}
                    disabled={isLoadingUploads}
                  >
                    {isLoadingUploads ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    <span>{isLoadingUploads ? 'Syncing...' : 'Sync Uploads'}</span>
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setIsUploadModalOpen(true)}
                    disabled={isLoadingCategories || dbCategoryNames.length === 0}
                  >
                    <FileUp size={14} />
                    <span>Upload Book</span>
                  </button>
                </div>
              </div>

              <section className="repo-panel" style={{ overflow: 'visible' }}>
                <div className="repo-panel-head">
                  <strong>
                    <BookOpen size={15} aria-hidden="true" /> MY UPLOADS ({myUploads.length})
                  </strong>
                  <span>PAGINATED DATA TABLE</span>
                </div>

                <div className="repo-filters">
                  <label>
                    <span>Category</span>
                    <select
                      value={tableCategoryFilter}
                      onChange={(e) => setTableCategoryFilter(e.target.value)}
                    >
                      <option value="ALL">All Database Categories</option>
                      {dbCategoryNames.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="repo-search">
                    <span>Search my uploads</span>
                    <div>
                      <Search size={15} aria-hidden="true" />
                      <input
                        value={tableSearch}
                        onChange={(e) => setTableSearch(e.target.value)}
                        placeholder="Search your uploaded book title, author, category, badge, or tag..."
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    className="repo-reset"
                    onClick={() => {
                      setTableCategoryFilter('ALL');
                      setTableSearch('');
                      setCurrentPage(1);
                    }}
                  >
                    Reset
                  </button>
                </div>

                {selectedUploads.length > 0 && (
                  <div className="repo-selection-toolbar" aria-live="polite">
                    <div className="repo-selection-summary">
                      <span className="repo-selection-check">
                        <Check size={13} aria-hidden="true" />
                      </span>
                      <strong>{selectedUploads.length} selected</strong>
                      <span>Remove your selected uploaded books.</span>
                    </div>
                    <div className="repo-selection-actions">
                      <button
                        type="button"
                        className="primary"
                        disabled={isBulkDeleting}
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
                        <span>Delete selected ({selectedUploads.length})</span>
                      </button>
                    </div>
                  </div>
                )}

                {uploadsError && (
                  <div
                    role="alert"
                    className="repo-alert-error"
                    style={{ margin: '10px 14px' }}
                  >
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{uploadsError}</span>
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
                            onClick={toggleAllUploads}
                            disabled={paginatedUploads.length === 0 || isLoadingUploads}
                            aria-label={
                              allUploadsSelected
                                ? 'Deselect all uploads on current page'
                                : 'Select all uploads on current page'
                            }
                          >
                            <span
                              className={`repo-checkbox-mark${allUploadsSelected ? ' is-checked' : ''
                                }${someUploadsSelected && !allUploadsSelected
                                  ? ' is-indeterminate'
                                  : ''
                                }`}
                              aria-hidden="true"
                            >
                              {allUploadsSelected ? <Check size={12} /> : null}
                              {someUploadsSelected && !allUploadsSelected ? (
                                <span />
                              ) : null}
                            </span>
                          </button>
                        </th>
                        <th className="nowrap">Book</th>
                        <th className="nowrap">Author</th>
                        <th className="nowrap">Category</th>
                        <th className="nowrap">Size</th>
                        <th className="nowrap" style={{ textAlign: 'right' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingUploads ? (
                        <tr>
                          <td colSpan={6} className="empty">
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                              }}
                            >
                              <Loader2 size={14} className="animate-spin" />
                              Loading your uploaded books...
                            </span>
                          </td>
                        </tr>
                      ) : paginatedUploads.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="empty">
                            No books uploaded by you match this filter. Click
                            &ldquo;Upload Book&rdquo; to add a PDF.
                          </td>
                        </tr>
                      ) : (
                        paginatedUploads.map((doc) => {
                          const isSelected = selectedIds.has(doc.id);
                          const isBusy = busyActionId === doc.id || isBulkDeleting;
                          const isMenuOpen = openActionDocId === doc.id;

                          return (
                            <tr
                              key={doc.id}
                              className={`repo-document-row${isSelected ? ' is-selected' : ''
                                }`}
                              onClick={() => toggleOne(doc.id)}
                            >
                              <td
                                className="nowrap"
                                style={{ paddingTop: '8px', paddingBottom: '8px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className={`repo-row-checkbox${isSelected ? ' is-checked' : ''
                                    }`}
                                  onClick={() => toggleOne(doc.id)}
                                  aria-label={
                                    isSelected
                                      ? `Deselect ${doc.name}`
                                      : `Select ${doc.name}`
                                  }
                                  aria-pressed={isSelected}
                                >
                                  <span
                                    className={`repo-checkbox-mark${isSelected ? ' is-checked' : ''
                                      }`}
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
                                <span className="category">
                                  {doc.category || 'Uncategorized'}
                                </span>
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
                                    setOpenActionDocId((prev) =>
                                      prev === doc.id ? null : doc.id
                                    )
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
                                      minWidth: '144px',
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
                                      onClick={() => void handleTablePreview(doc)}
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
                                      onClick={() => void handleTableDownload(doc)}
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
                    Showing {rangeStart}–{rangeEnd} of {myUploads.length}
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
                        disabled={safeCurrentPage <= 1 || isLoadingUploads}
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
                        disabled={safeCurrentPage >= totalPages || isLoadingUploads}
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
            </div>
          )}

          {/* 3. Database Categories */}
          {activeTab === 'categories' && (
            <AdminCategoriesSection
              categories={categories}
              isLoading={isLoadingCategories}
              onRefreshCategories={loadCategories}
              onCreateCategory={handleCreateCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onBulkDeleteCategories={handleBulkDeleteCategories}
              openCreateSignal={openCategorySignal}
            />
          )}
        </div>
      </main>

      {/* Upload Book Modal linked to Database Categories */}
      <UploadPdfModal
        isOpen={isUploadModalOpen}
        categories={dbCategoryNames}
        availablePrograms={programBadgeOptions}
        defaultCategory={
          categoryFilter !== 'ALL' ? categoryFilter : dbCategoryNames[0] || ''
        }
        onClose={() => setIsUploadModalOpen(false)}
        onSubmitUpload={handleUploadSubmit}
      />

      {/* Related Books Modal from Shelf */}
      {relatedTargetDoc && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setRelatedTargetDoc(null);
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(580px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="instructor-related-book-title"
          >
            <header>
              <strong id="instructor-related-book-title">
                <BookMarked size={15} aria-hidden="true" />
                BOOK DETAILS &amp; RELATED BOOKS
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
              <small>{relatedTargetDoc.category || 'OPEN LIBRARY'}</small>
              <h2>{relatedTargetDoc.name}</h2>
              <p>
                {relatedTargetDoc.author ? `By ${relatedTargetDoc.author} · ` : ''}
                {formatBytes(relatedTargetDoc.size)} · Open Access
              </p>

              {extractNames(relatedTargetDoc.programs).length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginTop: '10px',
                  }}
                >
                  {extractNames(relatedTargetDoc.programs).map((prog) => (
                    <span key={prog} className="category">
                      {prog}
                    </span>
                  ))}
                </div>
              )}

              {extractNames(relatedTargetDoc.tags).length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginTop: '8px',
                  }}
                >
                  {extractNames(relatedTargetDoc.tags).map((tag) => (
                    <span key={tag} className="category">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  <Sparkles size={14} aria-hidden="true" />
                  <span>Related Books ({relatedMatches.length})</span>
                </div>

                {relatedMatches.length === 0 ? (
                  <p style={{ fontSize: '11px', color: '#64748B' }}>
                    No related books matched by program badges or topic tags yet.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {relatedMatches.map(
                      ({ doc: rel, reason, isAdjacentCategoryMatch }) => (
                        <div
                          key={rel.id}
                          style={{
                            padding: '8px 10px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '2px',
                            background: '#F8FAFC',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 600 }}>
                              {rel.name}{' '}
                              <span
                                className="category"
                                style={{ marginLeft: '6px' }}
                              >
                                {rel.category || 'General'}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#475569',
                                marginTop: '2px',
                              }}
                            >
                              {reason}
                              {isAdjacentCategoryMatch
                                ? ' · Cross-category badge link'
                                : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => setRelatedTargetDoc(rel)}
                          >
                            Inspect
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  void handleDownloadRepoDoc(
                    mapToRepositoryDocument(relatedTargetDoc)
                  )
                }
              >
                <Download size={13} />
                <span>Download</span>
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const target = relatedTargetDoc;
                  setRelatedTargetDoc(null);
                  void handlePreviewRepoDoc(mapToRepositoryDocument(target));
                }}
              >
                <Eye size={13} />
                <span>Open PDF</span>
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Edit Own Upload Modal */}
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
                UPDATE UPLOADED BOOK
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
              <small>CATALOG &amp; CATEGORY LINK</small>
              <h2>Edit Book</h2>
              <p>Update title, linked database category, program badges, or tags.</p>

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
                    <span>Book Title</span>
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
                    {dbCategoryNames.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="repo-field">
                  <span>Program Badges (Comma-separated)</span>
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

      {/* Single Delete Own Upload Modal */}
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
                DELETE UPLOAD
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
                Remove <strong>{deletingDoc.filename}</strong> ({formatBytes(deletingDoc.size)}
                ) from your library uploads.
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
                    <span>Delete Book</span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Bulk Delete Own Uploads Modal */}
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
                BULK DELETE MY UPLOADS
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
              <h2>Delete {selectedUploads.length} Uploaded Books?</h2>
              <p>
                Permanently remove:{' '}
                <strong>{selectedUploads.map((d) => d.name).join(', ')}</strong>.
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
                    <span>Deleting {selectedUploads.length}...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} aria-hidden="true" />
                    <span>Delete {selectedUploads.length} Selected</span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}

      <DocumentPreviewModal
        document={previewDoc}
        onClose={closePreviewModal}
        onDownload={handleDownloadRepoDoc}
        isLoading={Boolean(
          previewLoadingDocId && previewDoc?.docId === previewLoadingDocId
        )}
        isDownloading={Boolean(
          downloadingDocId && previewDoc?.docId === downloadingDocId
        )}
      />
    </div>
  );
};
