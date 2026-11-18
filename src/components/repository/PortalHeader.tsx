"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronDown,
  CircleHelp,
  Command,
  FilePlus2,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PanelLeft,
  Search,
  Settings2,
  X,
} from "lucide-react";

type MenuKey = "file" | "workspace" | "view" | "help";

export type PortalHeaderProps = {
  appName?: string;
  workspaceName?: string;
  version?: string;
  systemStatus?: "Online" | "Maintenance" | "Offline";
  onNewItem?: () => void;
  onOpenItem?: () => void;
  onSettings?: () => void;
  onToggleSidebar?: () => void;
  /** Called with the search text when the user submits a resource search. */
  onSearch?: (query: string) => void;
  onLogout?: () => void;
};

const menuItems: {
  key: MenuKey;
  label: string;
  items: { label: string; shortcut?: string; icon?: ReactNode; action: string }[];
}[] = [
  {
    key: "file",
    label: "File",
    items: [
      { label: "New item", shortcut: "Ctrl + N", icon: <FilePlus2 size={14} />, action: "new" },
      { label: "Open item", shortcut: "Ctrl + O", icon: <FolderOpen size={14} />, action: "open" },
    ],
  },
  {
    key: "workspace",
    label: "Workspace",
    items: [
      { label: "Overview", icon: <LayoutDashboard size={14} />, action: "overview" },
      { label: "Settings", icon: <Settings2 size={14} />, action: "settings" },
    ],
  },
  {
    key: "view",
    label: "View",
    items: [
      { label: "Toggle sidebar", shortcut: "Ctrl + B", icon: <PanelLeft size={14} />, action: "sidebar" },
      { label: "Find resources", shortcut: "Ctrl + K", icon: <Search size={14} />, action: "focus-search" },
    ],
  },
  {
    key: "help",
    label: "Help",
    items: [
      { label: "Help centre", icon: <CircleHelp size={14} />, action: "help" },
      { label: "About application", icon: <Command size={14} />, action: "about" },
    ],
  },
];

export default function PortalHeader({
  appName = "Digital Resource Library",
  workspaceName = "Main Workspace",
  version = "v1.0",
  systemStatus = "Online",
  onNewItem,
  onOpenItem,
  onSettings,
  onToggleSidebar,
  onSearch,
  onLogout,
}: PortalHeaderProps) {
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const headerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setMoreOpen(false);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveMenu(null);
        setMoreOpen(false);
        setSearchOpen(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setActiveMenu(null);
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const submitSearch = () => {
    const query = searchQuery.trim();
    if (query) onSearch?.(query);
  };

  const runAction = (action: string) => {
    setActiveMenu(null);
    setMoreOpen(false);
    if (action === "new") onNewItem?.();
    if (action === "open") onOpenItem?.();
    if (action === "settings") onSettings?.();
    if (action === "sidebar") onToggleSidebar?.();
    if (action === "focus-search") setSearchOpen(true);
  };

  return (
    <header className="repo-header app-header app-header--compact" ref={headerRef}>
      <div className="app-chrome-main">
        <div className="app-identity">
          <div className="app-identity-mark"><Command size={16} strokeWidth={2.1} /></div>
          <span className="app-identity-name">{appName}</span>
          <span className="app-identity-divider" />
          <span className="app-workspace-name">{workspaceName}</span>
        </div>

        <nav className="app-menu-bar" aria-label="Application menu">
          {menuItems.map(menu => (
            <div className="app-menu-wrap" key={menu.key}>
              <button
                type="button"
                className={`app-menu-trigger ${activeMenu === menu.key ? "is-open" : ""}`}
                onClick={() => { setActiveMenu(activeMenu === menu.key ? null : menu.key); setMoreOpen(false); }}
                aria-expanded={activeMenu === menu.key}
              >
                {menu.label}<ChevronDown size={11} />
              </button>
              {activeMenu === menu.key && (
                <div className="app-dropdown" role="menu">
                  {menu.items.map(item => (
                    <button key={item.action} type="button" className="app-dropdown-item" role="menuitem" onClick={() => runAction(item.action)}>
                      <span className="app-dropdown-icon">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.shortcut && <kbd>{item.shortcut}</kbd>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="app-chrome-actions">
          {searchOpen ? (
            <form className="app-search-form" role="search" onSubmit={event => { event.preventDefault(); submitSearch(); }}>
              <Search size={14} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Search course resources..."
                aria-label="Search course resources"
                onKeyDown={event => { if (event.key === "Escape") setSearchOpen(false); }}
              />
              <button type="submit" className="app-search-submit">Search</button>
              <button type="button" className="app-search-close" aria-label="Close search" onClick={() => setSearchOpen(false)}><X size={14} /></button>
            </form>
          ) : (
            <button type="button" className="app-icon-button" aria-label="Search resources" title="Search resources" onClick={() => { setSearchOpen(true); setMoreOpen(false); }}>
              <Search size={15} />
            </button>
          )}

          <button type="button" className="app-icon-button" aria-label="Account options" title="Account options" onClick={() => { setMoreOpen(!moreOpen); setActiveMenu(null); }}>
            <MoreHorizontal size={17} />
          </button>
          {moreOpen && (
            <div className="app-dropdown app-more-dropdown" role="menu">
              <button type="button" className="app-dropdown-item" role="menuitem" onClick={() => runAction("settings")}>
                <span className="app-dropdown-icon"><Settings2 size={14} /></span><span>Account settings</span>
              </button>
              <div className="app-dropdown-separator" />
              <button type="button" className="app-dropdown-item app-logout-item" role="menuitem" onClick={() => { setMoreOpen(false); onLogout?.(); }}>
                <span className="app-dropdown-icon"><LogOut size={14} /></span><span>Sign out</span>
              </button>
              <div className="app-dropdown-separator" />
              <div className="app-dropdown-meta">VERSION {version}</div>
            </div>
          )}
        </div>
      </div>

      <div className="app-context-bar">
        <div className="app-context-left">
          <span className={`app-status-dot ${systemStatus.toLowerCase()}`} />
          <span>{systemStatus}</span>
          <span className="app-context-divider">/</span>
          <span className="app-context-location">{workspaceName}</span>
        </div>
        <span className="app-context-version">APPLICATION {version}</span>
      </div>
    </header>
  );
}
