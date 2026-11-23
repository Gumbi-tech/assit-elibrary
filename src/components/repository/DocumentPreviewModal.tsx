"use client";

import { useState } from "react";
import { BookOpen, Download, FileText, Info, Loader2, X } from "lucide-react";
import type { RepositoryDocument } from "@/types/repository";

type Props = {
  document: (RepositoryDocument & { previewUrl?: string }) | null;
  onClose: () => void;
  onDownload?: (doc: RepositoryDocument) => void | Promise<void>;
  isLoading?: boolean;
  isDownloading?: boolean;
};

export default function DocumentPreviewModal({
  document,
  onClose,
  onDownload,
  isLoading = false,
  isDownloading = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<"reader" | "info">("reader");
  const [zoomLevel] = useState<number>(100);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const [localDownloading, setLocalDownloading] = useState<boolean>(false);

  if (!document) return null;

  const showBusyDownload = isDownloading || localDownloading;

  async function handleDownload() {
    if (!document || showBusyDownload) return;

    if (onDownload) {
      setLocalDownloading(true);
      try {
        await onDownload(document);
      } finally {
        setLocalDownloading(false);
      }
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
        aria-busy={isLoading || showBusyDownload}
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
                  position: "relative",
                }}
              >
                {isLoading ? (
                  <div
                    style={{
                      height: "70vh",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      border: "1px solid #CBD5E1",
                      borderRadius: "2px",
                      background: "#F8FAFC",
                      color: "#334155",
                      fontSize: "12px",
                    }}
                    role="status"
                    aria-live="polite"
                  >
                    <Loader2 size={24} className="animate-spin" aria-hidden="true" />
                    <span>Loading PDF document...</span>
                  </div>
                ) : document.previewUrl ? (
                  <div style={{ position: "relative", width: "100%", height: "70vh" }}>
                    {!iframeLoaded && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "10px",
                          background: "#F8FAFC",
                          color: "#334155",
                          fontSize: "12px",
                          zIndex: 1,
                        }}
                        role="status"
                        aria-live="polite"
                      >
                        <Loader2 size={22} className="animate-spin" aria-hidden="true" />
                        <span>Rendering PDF preview...</span>
                      </div>
                    )}
                    <iframe
                      key={document.previewUrl}
                      src={document.previewUrl}
                      title={document.title}
                      onLoad={() => setIframeLoaded(true)}
                      style={{
                        width: "100%",
                        height: "70vh",
                        border: "1px solid #CBD5E1",
                        borderRadius: "2px",
                        background: "#FFFFFF",
                      }}
                    />
                  </div>
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
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => void handleDownload()}
            disabled={showBusyDownload}
          >
            {showBusyDownload ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Downloading...
              </>
            ) : (
              <>
                <Download size={14} /> Download PDF
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}