"use client";

import { useState } from "react";
import { Download, FileText, X, BookOpen, Info, ZoomIn, ZoomOut } from "lucide-react";
import type { RepositoryDocument } from "@/types/repository";

type Props = {
  document: RepositoryDocument | null;
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
              <div className="pdf-reader-toolbar">
                <span className="pdf-reader-page-indicator">
                  Document Reader ({document.pages} Pages)
                </span>
                <div className="pdf-reader-zoom-controls">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setZoomLevel((prev) => Math.max(75, prev - 25))}
                    title="Zoom out"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span>{zoomLevel}%</span>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setZoomLevel((prev) => Math.min(150, prev + 25))}
                    title="Zoom in"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>
              </div>

              <div
                className="pdf-page-canvas"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              >
                <div className="pdf-page-sheet">
                  <div className="pdf-page-header-stamp">
                    <span>{document.courseCode} — {document.department}</span>
                    <span>{document.category}</span>
                  </div>
                  <h1 id="modal-title" className="pdf-document-title">{document.title}</h1>
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

                  <div className="pdf-section-heading">Document Content Stream</div>
                  <p className="pdf-body-text">
                    [Simulated PDF Reader Render Stream active for {document.title}. This academic resource contains {document.pages} verified pages covering core curriculum requirements for {document.courseTitle}. Click Download PDF below to access the full offline document package.]
                  </p>
                </div>
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
