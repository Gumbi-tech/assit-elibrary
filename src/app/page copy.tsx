'use client';

import { useMemo, useState } from "react";
import PortalHeader from "@/components/repository/PortalHeader";
import RepositoryToolbar from "@/components/repository/RepositoryToolbar";
import RepositoryContent from "@/components/repository/RepositoryContent";
import StyleGuide from "@/components/repository/StyleGuide";
import DocumentPreviewModal from "@/components/repository/DocumentPreviewModal";
import RepositoryFooter from "@/components/repository/RepositoryFooter";
import { documents as allDocuments } from "@/lib/documents";
import type { RepositoryDocument, RepositoryTab } from "@/types/repository";

export default function Page() {
  const [tab, setTab] = useState<RepositoryTab>("portal");
  const [department, setDepartment] = useState("All Departments");
  const [category, setCategory] = useState("All Categories");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<RepositoryDocument | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredDocuments = useMemo(() => {
    const search = query.trim().toLowerCase();
    return allDocuments.filter(doc =>
      (department === "All Departments" || doc.department === department) &&
      (category === "All Categories" || doc.category === category) &&
      (!search || [doc.title, doc.courseCode, doc.docId, doc.courseTitle, doc.department]
        .some(value => value.toLowerCase().includes(search)))
    );
  }, [department, category, query]);

  return (
    <div className="repo-page">
      <PortalHeader />
      <main className="repo-main">
        <RepositoryToolbar tab={tab} setTab={setTab} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        {tab === "portal" ? (
          <RepositoryContent
            documents={filteredDocuments} total={allDocuments.length}
            department={department} category={category} query={query}
            setDepartment={setDepartment} setCategory={setCategory} setQuery={setQuery}
            onPreview={setPreview}
          />
        ) : <StyleGuide />}
      </main>
      <RepositoryFooter />
      <DocumentPreviewModal document={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
