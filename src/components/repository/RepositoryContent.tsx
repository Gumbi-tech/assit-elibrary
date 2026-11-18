"use client";

import { useState } from "react";
import type { RepositoryDocument } from "@/types/repository";
import DocumentFilters from "./DocumentFilters";
import DocumentsTable from "./DocumentsTable";
import DocumentsGallery from "./DocumentsGallery";
import { LayoutList, LayoutGrid } from "lucide-react";

type Props = {
  documents: RepositoryDocument[];
  total: number;
  department: string;
  category: string;
  query: string;
  setDepartment: (value: string) => void;
  setCategory: (value: string) => void;
  setQuery: (value: string) => void;
  onPreview: (doc: RepositoryDocument) => void;
  onDownload?: (doc: RepositoryDocument) => void;
  onDownloadSelected?: (docs: RepositoryDocument[]) => void;
};

export default function RepositoryContent(props: Props) {
  const [viewMode, setViewMode] = useState<"table" | "gallery">("gallery");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  return (
    <section className="repo-content">
      <div className="repo-heading">
        <div>
          <small>ACADEMIC RESOURCE COLLECTION</small>
          <h2>Course Materials Repository</h2>
          <p>Browse and access verified academic learning materials.</p>
        </div>
        <div className="repo-heading-right">
          <div className="repo-view-switch" role="group" aria-label="View mode">
            <button
              type="button"
              className={viewMode === "table" ? "active" : ""}
              onClick={() => setViewMode("table")}
              title="Switch to Table view"
            >
              <LayoutList size={14} aria-hidden="true" />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={viewMode === "gallery" ? "active" : ""}
              onClick={() => setViewMode("gallery")}
              title="Switch to Gallery view"
            >
              <LayoutGrid size={14} aria-hidden="true" />
              <span>Gallery</span>
            </button>
          </div>
          <div className="repo-count">
            <strong>{props.documents.length}</strong>
            <span>DOCUMENTS FOUND</span>
          </div>
        </div>
      </div>

      <DocumentFilters
        department={props.department}
        category={props.category}
        query={props.query}
        setDepartment={props.setDepartment}
        setCategory={props.setCategory}
        setQuery={props.setQuery}
      />

      {viewMode === "gallery" ?  (
        <DocumentsGallery
          documents={props.documents}
          total={props.total}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onPreview={props.onPreview}
          onDownload={props.onDownload}
          onDownloadSelected={props.onDownloadSelected}
        />
      ) :(
        <DocumentsTable
          documents={props.documents}
          total={props.total}
          onPreview={props.onPreview}
          onDownload={props.onDownload}
          onDownloadSelected={props.onDownloadSelected}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      ) }
    </section>
  );
}