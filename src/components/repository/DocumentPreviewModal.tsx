"use client";

import { useState } from "react";
import { Download, FileText, X, BookOpen, Info, ZoomIn, ZoomOut } from "lucide-react";
import type { RepositoryDocument } from "@/types/repository";

type Props = {
  document: (RepositoryDocument & { previewUrl?: string }) | null;
  onClose: () => void;
  onDownload?: (doc: RepositoryDocument) => void;
};

export default function DocumentPreviewModal({ document, onClose, onDownload }: Props) {
  const [activeTab, setActiveTab] = useState<"reader" | "info">("reader");
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (!document) return null;

  function handleDownload() {
    if (onDownload) {
      onDownload(document);
    } else {
      console.log("Downloading PDF:", document.title);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="repo-modal repo-reader-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <header className="repo-modal-header">
          <div className="repo-modal-header-left">
            <strong>
              <FileText size={15} /> {document.docId} · {document.courseCode}
            </strong>
          </div>
          <div className="repo-modal-tabs" role="group" aria-label="Preview mode">
            <button
              type="button"
              className={activeTab === "reader" ? "active" : ""}
              onClick={() => setActiveTab("reader")}
            >
              <BookOpen size={13} /> Reader View
            </button>
            <button
              type="button"
              className={activeTab === "info" ? "active" : ""}
              onClick={() => setActiveTab("info")}
            >
              <Info size={13} /> Metadata & Details
            </button>
          </div>
          <button type="button" className="repo-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="modal-body repo-modal-scrollable">
          {activeTab === "reader" ? (
            <div className="pdf-reader-container">
             

              <div
                className="pdf-page-canvas"
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: "top center",
                  width: "100%",
                }}
              >
                {document.previewUrl ? (
                  <iframe
                    src={document.previewUrl}
                    title={document.title}
                    style={{
                      width: "100%",
                      height: "70vh",
                      border: "1px solid #CBD5E1",
                      borderRadius: "2px",
                      background: "#FFFFFF",
                    }}
                  />
                ) : (
                  <div className="pdf-page-sheet">
                    <div className="pdf-page-header-stamp">
                      <span>{document.courseCode} — {document.department}</span>
                      <span>{document.category}</span>
                    </div>
                    <h1 className="pdf-document-title">{document.title}</h1>
                    <p className="pdf-document-author">
                      <b>Author:</b> {document.author} | <b>Uploaded:</b> {document.uploadDate} | <b>Size:</b> {document.size}
                    </p>
                    <div className="pdf-content-divider" />
                    <div className="pdf-section-heading">Executive Summary &amp; Overview</div>
                    <p className="pdf-body-text">{document.summary}</p>
                    <div className="pdf-section-heading">Topics &amp; Syllabus Coverage</div>
                    <div className="pdf-topics-box">
                      <p>{document.topics}</p>
                    </div>
                    <p className="pdf-body-text" style={{ marginTop: "12px", color: "#64748B" }}>
                      No direct PDF stream URL is attached to this record. Use Download PDF if available.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pdf-meta-container">
              <small>{document.docId} · {document.courseCode}</small>
              <h2 id="modal-title">{document.title}</h2>
              <p>{document.summary}</p>
              <dl>
                {([
                  ["Course", document.courseTitle],
                  ["Department", document.department],
                  ["Category", document.category],
                  ["Author", document.author],
                  ["File size", document.size],
                  ["Pages", String(document.pages)],
                  ["Uploaded", document.uploadDate],
                ] as const).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="topics">
                <b>TOPICS COVERED</b>
                <p>{document.topics}</p>
              </div>
            </div>
          )}
        </div>

        <footer>
          <button className="secondary" onClick={onClose}>Close</button>
          <button className="primary" onClick={handleDownload}>
            <Download size={14} /> Download PDF
          </button>
        </footer>
      </section>
    </div>
  );
}