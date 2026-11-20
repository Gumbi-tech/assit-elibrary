"use client";

import { useMemo } from "react";
import { Check, Download, Grid } from "lucide-react";
import type { RepositoryDocument } from "@/types/repository";

type Props = {
  documents: RepositoryDocument[];
  total: number;
  selectedIds: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  onPreview: (doc: RepositoryDocument) => void;
  onDownload?: (doc: RepositoryDocument) => void;
  onDownloadSelected?: (docs: RepositoryDocument[]) => void;
};

export default function DocumentsGallery({
  documents,
  total,
  selectedIds,
  onSelectionChange,
  onPreview,
  onDownload,
  onDownloadSelected,
}: Props) {
  const visibleIds = useMemo(() => documents.map((doc) => doc.docId), [documents]);

  const selectedDocuments = useMemo(
    () => documents.filter((doc) => selectedIds.has(doc.docId)),
    [documents, selectedIds]
  );

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  function toggleOne(docId: string, event: React.MouseEvent) {
    event.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(docId)) next.delete(docId);
    else next.add(docId);
    onSelectionChange(next);
  }

  function toggleAllVisible() {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      visibleIds.forEach((id) => next.delete(id));
    } else {
      visibleIds.forEach((id) => next.add(id));
    }
    onSelectionChange(next);
  }

  function handleDownloadSelected() {
    if (selectedDocuments.length === 0) return;
    if (onDownloadSelected) {
      onDownloadSelected(selectedDocuments);
      return;
    }
    selectedDocuments.forEach((doc) => onDownload?.(doc));
  }

  return (
    <section
      className="repo-panel"
      style={{
        background: "transparent",
        border: "none",
        boxShadow: "none",
      }}
    >
      <div
        className="repo-panel-head"
        style={{
          background: "transparent",
          borderBottom: "1px solid #CBD5E1",
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        <strong>
          <Grid size={15} aria-hidden="true" />
          AVAILABLE LEARNING MATERIALS (GALLERY VIEW)
        </strong>
        <div className="repo-gallery-controls">
          <button
            type="button"
            className="repo-select-all-btn"
            onClick={toggleAllVisible}
            disabled={documents.length === 0}
          >
            <span
              className={`repo-checkbox-mark${allVisibleSelected ? " is-checked" : ""}${
                someVisibleSelected && !allVisibleSelected ? " is-indeterminate" : ""
              }`}
              aria-hidden="true"
            >
              {allVisibleSelected ? <Check size={12} /> : null}
              {someVisibleSelected && !allVisibleSelected ? <span /> : null}
            </span>
            <span>{allVisibleSelected ? "Deselect visible" : "Select visible"}</span>
          </button>
          <span>
            {documents.length} RECORD{documents.length === 1 ? "" : "S"}
          </span>
        </div>
      </div>

      {selectedDocuments.length > 0 && (
        <div
          className="repo-selection-toolbar"
          aria-live="polite"
          style={{ marginTop: "12px", borderRadius: "2px" }}
        >
          <div className="repo-selection-summary">
            <span className="repo-selection-check">
              <Check size={13} aria-hidden="true" />
            </span>
            <strong>{selectedDocuments.length} selected</strong>
            <span>Choose the selected learning materials to download.</span>
          </div>
          <div className="repo-selection-actions">
            {selectedDocuments.length === 1 && (
              <button
                type="button"
                className="secondary"
                onClick={() => onPreview(selectedDocuments[0])}
              >
                Preview
              </button>
            )}
            <button
              type="button"
              className="primary repo-download-selected"
              onClick={handleDownloadSelected}
              disabled={!onDownload && !onDownloadSelected}
            >
              <Download size={14} aria-hidden="true" />
              Download selected
            </button>
          </div>
        </div>
      )}

      <div
        className="repo-explorer-wrap"
        style={{
          background: "transparent",
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        {documents.length > 0 ? (
          <div className="repo-explorer-grid">
            {documents.map((doc) => {
              const isSelected = selectedIds.has(doc.docId);

              return (
                <div
                  key={doc.docId}
                  className={`repo-file-tile${isSelected ? " is-selected" : ""}`}
                  onClick={() => onPreview(doc)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      if (event.target === event.currentTarget) {
                        event.preventDefault();
                        onPreview(doc);
                      }
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Preview ${doc.title}`}
                  title={`${doc.title} (${doc.courseCode} · ${doc.size})`}
                  style={{
                    background: isSelected ? "rgba(30, 95, 154, 0.08)" : "transparent",
                    border: isSelected ? "1px solid #1E5F9A" : "1px solid transparent",
                    boxShadow: "none",
                  }}
                >
                  <button
                    type="button"
                    className={`repo-file-checkbox${isSelected ? " is-checked" : ""}`}
                    onClick={(e) => toggleOne(doc.docId, e)}
                    aria-label={
                      isSelected ? `Deselect ${doc.title}` : `Select ${doc.title}`
                    }
                    aria-pressed={isSelected}
                  >
                    <span
                      className={`repo-checkbox-mark${isSelected ? " is-checked" : ""}`}
                      aria-hidden="true"
                    >
                      {isSelected ? <Check size={11} /> : null}
                    </span>
                  </button>

                  {/* Miniature Document Sheet Thumbnail */}
                  <div className="repo-file-sheet" aria-hidden="true">
                    <div className="repo-file-fold" />
                    <div className="repo-file-lines">
                      <span className="line-head" />
                      <span />
                      <span />
                      <span className="line-short" />
                      <span />
                      <span className="line-short" />
                    </div>
                    <span className="repo-file-ext-badge">PDF</span>
                  </div>

                  {/* Centered File Label & Course Metadata */}
                  <div className="repo-file-label">
                    <span className="repo-file-name">{doc.title}.pdf</span>
                    <span className="repo-file-meta">
                      {doc.courseCode} · {doc.size}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty" style={{ background: "transparent" }}>
            No documents match your search. Try changing the filters.
          </div>
        )}
      </div>

      <div
        className="repo-table-foot"
        style={{
          background: "transparent",
          borderTop: "1px solid #CBD5E1",
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        <span>
          Showing {documents.length} of {total} indexed documents
        </span>
        <span>
          {selectedDocuments.length > 0
            ? `${selectedDocuments.length} selected`
            : "Click a document icon to preview · Hover top-left checkbox to select"}
        </span>
      </div>
    </section>
  );
}