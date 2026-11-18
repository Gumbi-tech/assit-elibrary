import { BookOpen, ChevronRight, Layers, Menu } from "lucide-react";
import type { RepositoryTab } from "@/types/repository";

type Props = {
  tab: RepositoryTab;
  setTab: (tab: RepositoryTab) => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
};

export default function RepositoryToolbar({ tab, setTab, menuOpen, setMenuOpen }: Props) {
  const chooseTab = (next: RepositoryTab) => {
    setTab(next);
    setMenuOpen(false);
  };

  return (
    <div className="repo-toolbar">
      <div className="repo-breadcrumb">
        <span>Location:</span><b>Repository Home</b><ChevronRight size={13} />
        <span>{tab === "portal" ? "Academic Departments / All Courses / Handouts & PDFs" : "System / UI Style Guide"}</span>
      </div>
      <button className="repo-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation">
        <Menu size={17} />
      </button>
      <nav className={menuOpen ? "repo-tabs open" : "repo-tabs"}>
        <button className={tab === "portal" ? "active" : ""} onClick={() => chooseTab("portal")}>
          <BookOpen size={14} /> Desktop E-Library Portal
        </button>
        <button className={tab === "styleguide" ? "active" : ""} onClick={() => chooseTab("styleguide")}>
          <Layers size={14} /> Agent UI Style Guide
        </button>
      </nav>
    </div>
  );
}
