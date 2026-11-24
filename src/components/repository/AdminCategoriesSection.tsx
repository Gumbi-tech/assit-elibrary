'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Edit3,
  FolderKanban,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

export interface LibraryCategoryItem {
  id: string;
  name: string;
  slug?: string;
  description: string;
}

type Props = {
  categories: LibraryCategoryItem[];
  isLoading?: boolean;
  onRefreshCategories: () => Promise<void>;
  onCreateCategory: (
    name: string,
    description: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onUpdateCategory: (
    id: string,
    name: string,
    description: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteCategory: (
    item: LibraryCategoryItem
  ) => Promise<{ ok: boolean; error?: string }>;
  onBulkDeleteCategories: (
    items: LibraryCategoryItem[]
  ) => Promise<{ ok: boolean; error?: string }>;
  openCreateSignal?: number;
};

export const AdminCategoriesSection: React.FC<Props> = ({
  categories,
  isLoading = false,
  onRefreshCategories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onBulkDeleteCategories,
  openCreateSignal = 0,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<LibraryCategoryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editError, setEditError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Single delete modal state
  const [deletingItem, setDeletingItem] = useState<LibraryCategoryItem | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (openCreateSignal > 0) {
      setNewName('');
      setNewDesc('');
      setCreateError('');
      setIsCreateOpen(true);
    }
  }, [openCreateSignal]);

  // Clean up any selected IDs that no longer exist in DB categories
  useEffect(() => {
    const validIds = new Set(categories.map((c) => c.id));
    setSelectedIds((prev) => {
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [categories]);

  const selectedCategories = useMemo(
    () => categories.filter((c) => selectedIds.has(c.id)),
    [categories, selectedIds]
  );

  const allSelected =
    categories.length > 0 && categories.every((c) => selectedIds.has(c.id));
  const someSelected = categories.some((c) => selectedIds.has(c.id));

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map((c) => c.id)));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setIsCreating(true);
    try {
      const res = await onCreateCategory(newName.trim(), newDesc.trim());
      if (!res.ok) {
        setCreateError(res.error || 'Unable to create category.');
        return;
      }
      setIsCreateOpen(false);
      setNewName('');
      setNewDesc('');
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (item: LibraryCategoryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDesc(item.description);
    setEditError('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditError('');
    setIsUpdating(true);
    try {
      const res = await onUpdateCategory(editingItem.id, editName.trim(), editDesc.trim());
      if (!res.ok) {
        setEditError(res.error || 'Unable to update category.');
        return;
      }
      setEditingItem(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeleteModal = (item: LibraryCategoryItem) => {
    setDeletingItem(item);
    setDeleteError('');
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setDeleteError('');
    setIsDeleting(true);
    try {
      const res = await onDeleteCategory(deletingItem);
      if (!res.ok) {
        setDeleteError(res.error || 'Unable to delete category.');
        return;
      }
      setDeletingItem(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedCategories.length === 0) return;
    setBulkDeleteError('');
    setIsBulkDeleting(true);
    try {
      const res = await onBulkDeleteCategories(selectedCategories);
      if (!res.ok) {
        setBulkDeleteError(res.error || 'Bulk delete failed.');
        return;
      }
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
    } finally {
      setIsBulkDeleting(false);
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
        <strong style={{ fontSize: '13px' }}>Database Topic Categories</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="secondary"
            disabled={isLoading}
            onClick={() => void onRefreshCategories()}
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={14} aria-hidden="true" />
            )}
            <span>{isLoading ? 'Syncing...' : 'Sync DB'}</span>
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setNewName('');
              setNewDesc('');
              setCreateError('');
              setIsCreateOpen(true);
            }}
          >
            <Plus size={14} aria-hidden="true" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      <section className="repo-panel">
        <div className="repo-panel-head">
          <strong>
            <FolderKanban size={15} aria-hidden="true" /> STORED CATEGORIES
          </strong>
          <span>{categories.length} IN DATABASE</span>
        </div>

        {selectedCategories.length > 0 && (
          <div className="repo-selection-toolbar" aria-live="polite">
            <div className="repo-selection-summary">
              <span className="repo-selection-check">
                <Check size={13} aria-hidden="true" />
              </span>
              <strong>{selectedCategories.length} selected</strong>
              <span>Remove selected categories from the database.</span>
            </div>
            <div className="repo-selection-actions">
              <button
                type="button"
                className="secondary"
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
                <span>Delete selected ({selectedCategories.length})</span>
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
                    onClick={toggleAll}
                    disabled={categories.length === 0 || isLoading}
                    aria-label={allSelected ? 'Deselect all categories' : 'Select all categories'}
                  >
                    <span
                      className={`repo-checkbox-mark${allSelected ? ' is-checked' : ''}${
                        someSelected && !allSelected ? ' is-indeterminate' : ''
                      }`}
                      aria-hidden="true"
                    >
                      {allSelected ? <Check size={12} /> : null}
                      {someSelected && !allSelected ? <span /> : null}
                    </span>
                  </button>
                </th>
                <th>Category</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="empty">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Loader2 size={14} className="animate-spin" />
                      Loading categories from database...
                    </span>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty">
                    No categories found in the database. Click &ldquo;New Category&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => {
                  const isSelected = selectedIds.has(cat.id);
                  return (
                    <tr
                      key={cat.id}
                      className={`repo-document-row${isSelected ? ' is-selected' : ''}`}
                      onClick={() => toggleOne(cat.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className={`repo-row-checkbox${isSelected ? ' is-checked' : ''}`}
                          onClick={() => toggleOne(cat.id)}
                          aria-label={isSelected ? `Deselect ${cat.name}` : `Select ${cat.name}`}
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
                        <strong>{cat.name}</strong>
                      </td>
                      <td>
                        <span>{cat.description}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => openEditModal(cat)}
                          >
                            <Edit3 size={13} aria-hidden="true" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => openDeleteModal(cat)}
                          >
                            <Trash2 size={13} aria-hidden="true" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Category Modal */}
      {isCreateOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isCreating) setIsCreateOpen(false);
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(480px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-category-title"
          >
            <header>
              <strong id="create-category-title">
                <FolderKanban size={15} aria-hidden="true" />
                NEW TOPIC CATEGORY
              </strong>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <small>DATABASE CATEGORY</small>
              <h2>Create Category</h2>
              <p>Saved directly to the database for library classification.</p>

              {createError && (
                <div role="alert" className="repo-alert-error">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{createError}</span>
                </div>
              )}

              <form id="create-category-form" onSubmit={handleCreateSubmit} className="repo-form">
                <label className="repo-field">
                  <span>Category Name</span>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Enter category name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    disabled={isCreating}
                  />
                </label>

                <label className="repo-field">
                  <span>Description (Optional)</span>
                  <input
                    type="text"
                    placeholder="Short description of resources in this category"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    disabled={isCreating}
                  />
                </label>
              </form>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-category-form"
                className="primary"
                disabled={isCreating || !newName.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} aria-hidden="true" />
                    <span>Create Category</span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingItem && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isUpdating) setEditingItem(null);
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(480px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-category-title"
          >
            <header>
              <strong id="edit-category-title">
                <Edit3 size={15} aria-hidden="true" />
                UPDATE CATEGORY
              </strong>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                disabled={isUpdating}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <small>DATABASE CATEGORY</small>
              <h2>Edit Category</h2>
              <p>Update this category in the database.</p>

              {editError && (
                <div role="alert" className="repo-alert-error">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{editError}</span>
                </div>
              )}

              <form id="edit-category-form" onSubmit={handleEditSubmit} className="repo-form">
                <label className="repo-field">
                  <span>Category Name</span>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isUpdating}
                  />
                </label>

                <label className="repo-field">
                  <span>Description</span>
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    disabled={isUpdating}
                  />
                </label>
              </form>
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setEditingItem(null)}
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-category-form"
                className="primary"
                disabled={isUpdating || !editName.trim()}
              >
                {isUpdating ? (
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

      {/* Single Delete Category Modal */}
      {deletingItem && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setDeletingItem(null);
          }}
        >
          <section
            className="repo-modal"
            style={{ width: 'min(440px, 100%)' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
          >
            <header>
              <strong id="delete-category-title">
                <Trash2 size={15} aria-hidden="true" />
                DELETE CATEGORY
              </strong>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              <small>CONFIRM REMOVAL</small>
              <h2>Delete &ldquo;{deletingItem.name}&rdquo;?</h2>
              <p>
                Remove <strong>{deletingItem.name}</strong> from the database.
              </p>

              {deleteError && (
                <div role="alert" className="repo-alert-error">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            <footer>
              <button
                type="button"
                className="secondary"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                disabled={isDeleting}
                onClick={() => void handleDeleteConfirm()}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} aria-hidden="true" />
                    <span>Delete Category</span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* Bulk Delete Categories Modal */}
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
            aria-labelledby="bulk-delete-cat-title"
          >
            <header>
              <strong id="bulk-delete-cat-title">
                <Trash2 size={15} aria-hidden="true" />
                BULK DELETE CATEGORIES
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
              <h2>Delete {selectedCategories.length} Categories?</h2>
              <p>
                The following categories will be removed from the database:{' '}
                <strong>{selectedCategories.map((c) => c.name).join(', ')}</strong>.
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
                    <span>Deleting {selectedCategories.length}...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} aria-hidden="true" />
                    <span>Delete {selectedCategories.length} Selected</span>
                  </>
                )}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};