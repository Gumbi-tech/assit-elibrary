"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Database,
  Download,
  Eye,
  FileText,
 } from "lucide-react";
import type { RepositoryDocument } from "@/types/repository";

type Props = {
  documents: RepositoryDocument[];
  total: number;
  onPreview: (doc: RepositoryDocument) => void;
  /** Called when the user downloads one document. */
  onDownload?: (doc: RepositoryDocument) => void;
  /** Called when the user downloads the selected documents in one operation. */
  onDownloadSelected?: (docs: RepositoryDocument[]) => void;
  /** Optional shared selection state with other views. */
  selectedIds?: Set<string>;
  onSelectionChange?: (next: Set<string>) => void;
};

export default function DocumentsTable({
  documents,
  total,
  onPreview,
  onDownload,
  onDownloadSelected,
  selectedIds: externalSelectedIds,
  onSelectionChange,
}: Props) {
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(() => new Set());
  const selectedIds = externalSelectedIds ?? internalSelectedIds;

  // Selection is limited to the documents currently shown in this table.
  const visibleIds = useMemo(
    () => documents.map((doc) => doc.docId),
    [documents]
  );

  const selectedDocuments = useMemo(
    () => documents.filter((doc) => selectedIds.has(doc.docId)),
    [documents, selectedIds]
  );

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.has(id));

  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.has(id));

  function updateSelection(next: Set<string>) {
    if (onSelectionChange) {
      onSelectionChange(next);
    } else {
      setInternalSelectedIds(next);
    }
  }

  function toggleOne(docId: string) {
    const next = new Set(selectedIds);
    if (next.has(docId)) next.delete(docId);
    else next.add(docId);
    updateSelection(next);
  }

  function toggleAllVisible() {
    const next = new Set(selectedIds);

    if (allVisibleSelected) {
      visibleIds.forEach((id) => next.delete(id));
    } else {
      visibleIds.forEach((id) => next.add(id));
    }

    updateSelection(next);
  }

  function handleDownloadSelected() {
    if (selectedDocuments.length === 0) return;

    if (onDownloadSelected) {
      onDownloadSelected(selectedDocuments);
      return;
    }

    // Fallback for integrations that only provide a single-file download handler.
    selectedDocuments.forEach((doc) => onDownload?.(doc));
  }

  return (
    <section className="repo-panel">
      <div className="repo-panel-head">
        <strong>
          <Database size={15} aria-hidden="true" />
          AVAILABLE LEARNING MATERIALS
        </strong>
        <span>
          {documents.length} RECORD{documents.length === 1 ? "" : "S"}
        </span>
      </div>

      {selectedDocuments.length > 0 && (
        <div className="repo-selection-toolbar" aria-live="polite">
          <div className="repo-selection-summary">
            <span className="repo-selection-check">
              <Check size={13} aria-hidden="true" />
            </span>
            <strong>{selectedDocuments.length} selected</strong>
            <span>Choose the selected learning materials to download.</span>
          </div>
          <button
            type="button"
            className="primary repo-download-selected"
            onClick={handleDownloadSelected}
            disabled={!onDownload && !onDownloadSelected}
            title={
              onDownload || onDownloadSelected
                ? "Download selected resources"
                : "Connect a download handler to enable downloads"
            }
          >
            <Download size={14} aria-hidden="true" />
            Download selected
          </button>
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
                      ? "Deselect all visible resources"
                      : "Select all visible resources"
                  }
                  title={
                    allVisibleSelected
                      ? "Deselect all visible"
                      : "Select all visible"
                  }
                  disabled={documents.length === 0}
                >
                  <span
                    className={`repo-checkbox-mark${allVisibleSelected ? " is-checked" : ""}${someVisibleSelected && !allVisibleSelected ? " is-indeterminate" : ""}`}
                    aria-hidden="true"
                  >
                    {allVisibleSelected ? <Check size={12} /> : null}
                    {someVisibleSelected && !allVisibleSelected ? <span /> : null}
                  </span>
                </button>
              </th>
              <th>Course / Resource title</th>
              <th>Category</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {documents.map((doc) => {
              const isSelected = selectedIds.has(doc.docId);

              return (
                <tr
                  key={doc.docId}
                  className={`repo-document-row${isSelected ? " is-selected" : ""}`}
                  onClick={() => onPreview(doc)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      // Do not trigger preview when keyboard focus is on a control.
                      if (event.target === event.currentTarget) {
                        event.preventDefault();
                        onPreview(doc);
                      }
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Preview ${doc.title}`}
                  title="Select this row to preview the resource"
                >
                  <td onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      className={`repo-row-checkbox${isSelected ? " is-checked" : ""}`}
                      onClick={() => toggleOne(doc.docId)}
                      aria-label={
                        isSelected
                          ? `Deselect ${doc.title}`
                          : `Select ${doc.title}`
                      }
                      aria-pressed={isSelected}
                    >
                      <span
                        className={`repo-checkbox-mark${isSelected ? " is-checked" : ""}`}
                        aria-hidden="true"
                      >
                        {isSelected ? <Check size={12} /> : null}
                      </span>
                    </button>
                  </td>

                  <td>
                    <div className="repo-resource-cell">
                      <span className="repo-resource-icon">
                        <FileText size={16} aria-hidden="true" />
                      </span>
                      <span>
                        <b className="resource-title">{doc.title}</b>
                        <span className="course-title">{doc.courseTitle}</span>
                        <small>
                          {doc.courseCode} · {doc.author} · {doc.pages} pages
                        </small>
                      </span>
                    </div>
                  </td>

                  <td>
                    <span className="category">{doc.category}</span>
                  </td>

                  <td className="nowrap">{doc.size}</td>
                  <td className="nowrap">{doc.uploadDate}</td>

                  <td onClick={(event) => event.stopPropagation()}>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onPreview(doc)}
                      >
                        <Eye size={13} aria-hidden="true" />
                        Preview
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => onDownload?.(doc)}
                        disabled={!onDownload}
                        title={
                          onDownload
                            ? "Download PDF"
                            : "Connect a download handler to enable downloads"
                        }
                      >
                        <Download size={13} aria-hidden="true" />
                        Download PDF
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {documents.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No documents match your search. Try changing the filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="repo-table-foot">
        <span>
          Showing {documents.length} of {total} indexed documents
        </span>
        <span>
          {selectedDocuments.length > 0
            ? `${selectedDocuments.length} selected`
            : "Select a row to preview · Use checkboxes to select downloads"}
        </span>
      </div>
    </section>
  );
}