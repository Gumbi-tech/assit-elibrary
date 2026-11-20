"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
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

export type PortalHeaderVariant = "button-blue" | "button-navy" | "button-soft";

export type PortalHeaderButtonThemeProps = {
  appName?: string;
  workspaceName?: string;
  version?: string;
  systemStatus?: "Online" | "Maintenance" | "Offline";
  /** Visual variant matching the app's button aesthetic */
  variant?: PortalHeaderVariant;
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

const VARIANT_STYLES: Record<PortalHeaderVariant, CSSProperties> = {
  // Matches primary academic-blue app buttons (#1E5F9A / #003060)
  "button-blue": {
    ["--hdr-bg" as string]: "linear-gradient(180deg, #1E5F9A 0%, #154B7D 100%)",
    ["--hdr-border" as string]: "#0F3860",
    ["--hdr-text" as string]: "#FFFFFF",
    ["--hdr-muted" as string]: "#DCEBFA",
    ["--hdr-divider" as string]: "rgba(255, 255, 255, 0.28)",
    ["--hdr-ctrl-bg" as string]: "rgba(255, 255, 255, 0.14)",
    ["--hdr-ctrl-hover" as string]: "rgba(255, 255, 255, 0.24)",
    ["--hdr-ctrl-active-bg" as string]: "#003060",
    ["--hdr-ctrl-border" as string]: "rgba(255, 255, 255, 0.34)",
    ["--hdr-mark-bg" as string]: "#003060",
    ["--hdr-mark-text" as string]: "#FFFFFF",
    ["--hdr-cta-bg" as string]: "#003060",
    ["--hdr-cta-hover" as string]: "#002244",
    ["--hdr-cta-text" as string]: "#FFFFFF",
  },
  // Matches deep navy primary buttons (#003060) with academic blue highlights (#1E5F9A)
  "button-navy": {
    ["--hdr-bg" as string]: "linear-gradient(180deg, #003B73 0%, #00274D 100%)",
    ["--hdr-border" as string]: "#001A33",
    ["--hdr-text" as string]: "#FFFFFF",
    ["--hdr-muted" as string]: "#C7DDF2",
    ["--hdr-divider" as string]: "rgba(255, 255, 255, 0.24)",
    ["--hdr-ctrl-bg" as string]: "rgba(30, 95, 154, 0.38)",
    ["--hdr-ctrl-hover" as string]: "rgba(30, 95, 154, 0.62)",
    ["--hdr-ctrl-active-bg" as string]: "#1E5F9A",
    ["--hdr-ctrl-border" as string]: "rgba(186, 214, 242, 0.35)",
    ["--hdr-mark-bg" as string]: "#1E5F9A",
    ["--hdr-mark-text" as string]: "#FFFFFF",
    ["--hdr-cta-bg" as string]: "#1E5F9A",
    ["--hdr-cta-hover" as string]: "#164A7A",
    ["--hdr-cta-text" as string]: "#FFFFFF",
  },
  // Matches secondary / soft desktop buttons (#F8FAFC / #EDF4FC with #1E5F9A accent)
  "button-soft": {
    ["--hdr-bg" as string]: "linear-gradient(180deg, #F8FAFC 0%, #EDF4FC 100%)",
    ["--hdr-border" as string]: "#CBD5E1",
    ["--hdr-text" as string]: "#003060",
    ["--hdr-muted" as string]: "#334155",
    ["--hdr-divider" as string]: "#CBD5E1",
    ["--hdr-ctrl-bg" as string]: "#FFFFFF",
    ["--hdr-ctrl-hover" as string]: "#E2EEF9",
    ["--hdr-ctrl-active-bg" as string]: "#1E5F9A",
    ["--hdr-ctrl-border" as string]: "#AAB7C6",
    ["--hdr-mark-bg" as string]: "#1E5F9A",
    ["--hdr-mark-text" as string]: "#FFFFFF",
    ["--hdr-cta-bg" as string]: "#1E5F9A",
    ["--hdr-cta-hover" as string]: "#003060",
    ["--hdr-cta-text" as string]: "#FFFFFF",
  },
};

export default function PortalHeaderButtonTheme({
  appName = "Digital Resource Library",
  workspaceName = "Main Workspace",
  version = "v1.0",
  systemStatus = "Online",
  variant = "button-blue",
  onNewItem,
  onOpenItem,
  onSettings,
  onToggleSidebar,
  onSearch,
  onLogout,
}: PortalHeaderButtonThemeProps) {
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
    <header
      className="repo-header app-header app-header--compact app-header--btn-theme"
      style={VARIANT_STYLES[variant]}
      ref={headerRef}
    >
      <div className="app-chrome-main">
        <div className="app-identity">
          <div className="app-identity-mark" aria-hidden="true">
            <Command size={16} strokeWidth={2.1} />
          </div>
          <span className="app-identity-name">{appName}</span>
          <span className="app-identity-divider" aria-hidden="true" />
          <span className="app-workspace-name">{workspaceName}</span>
          <span
            className="app-status-pill"
            title={`System status: ${systemStatus}`}
          >
            <span
              className="app-status-dot"
              style={{
                backgroundColor:
                  systemStatus === "Online"
                    ? "#22C55E"
                    : systemStatus === "Maintenance"
                    ? "#F59E0B"
                    : "#EF4444",
              }}
            />
            {systemStatus}
          </span>
        </div>

        <nav className="app-menu-bar" aria-label="Application menu">
          {menuItems.map((menu) => {
            const isOpen = activeMenu === menu.key;
            return (
              <div className="app-menu-wrap" key={menu.key}>
                <button
                  type="button"
                  className={`app-menu-trigger ${isOpen ? "is-open" : ""}`}
                  onClick={() => {
                    setActiveMenu(isOpen ? null : menu.key);
                    setMoreOpen(false);
                  }}
                  aria-expanded={isOpen}
                >
                  {menu.label}
                  <ChevronDown size={11} />
                </button>
                {isOpen && (
                  <div className="app-dropdown" role="menu">
                    {menu.items.map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        className="app-dropdown-item"
                        role="menuitem"
                        onClick={() => runAction(item.action)}
                      >
                        <span className="app-dropdown-icon">{item.icon}</span>
                        <span>{item.label}</span>
                        {item.shortcut && <kbd>{item.shortcut}</kbd>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="app-chrome-actions">
          {searchOpen ? (
            <form
              className="app-search-form"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
              }}
            >
              <Search size={14} aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search course resources..."
                aria-label="Search course resources"
                onKeyDown={(event) => {
                  if (event.key === "Escape") setSearchOpen(false);
                }}
              />
              <button type="submit" className="app-search-submit">
                Search
              </button>
              <button
                type="button"
                className="app-search-close"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                <X size={14} />
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="app-icon-button"
              aria-label="Search resources"
              title="Search resources (Ctrl + K)"
              onClick={() => {
                setSearchOpen(true);
                setMoreOpen(false);
              }}
            >
              <Search size={15} />
            </button>
          )}

          <button
            type="button"
            className="app-icon-button"
            aria-label="Account options"
            title="Account options"
            onClick={() => {
              setMoreOpen(!moreOpen);
              setActiveMenu(null);
            }}
          >
            <MoreHorizontal size={17} />
          </button>

          {moreOpen && (
            <div className="app-dropdown app-more-dropdown" role="menu">
              <button
                type="button"
                className="app-dropdown-item"
                role="menuitem"
                onClick={() => runAction("settings")}
              >
                <span className="app-dropdown-icon">
                  <Settings2 size={14} />
                </span>
                <span>Account settings</span>
              </button>
              <div className="app-dropdown-separator" />
              <button
                type="button"
                className="app-dropdown-item app-logout-item"
                role="menuitem"
                onClick={() => {
                  setMoreOpen(false);
                  onLogout?.();
                }}
              >
                <span className="app-dropdown-icon">
                  <LogOut size={14} />
                </span>
                <span>Sign out</span>
              </button>
              <div className="app-dropdown-separator" />
              <div className="app-dropdown-meta">VERSION {version}</div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .app-header--btn-theme {
          background: var(--hdr-bg);
          border-bottom: 1px solid var(--hdr-border);
          color: var(--hdr-text);
          box-shadow: 0 1px 2px rgba(0, 48, 96, 0.14);
        }

        .app-header--btn-theme .app-identity-mark {
          background: var(--hdr-mark-bg);
          color: var(--hdr-mark-text);
          border: 1px solid var(--hdr-ctrl-border);
          border-radius: 2px;
        }

        .app-header--btn-theme .app-identity-name,
        .app-header--btn-theme .app-workspace-name {
          color: var(--hdr-text);
        }

        .app-header--btn-theme .app-workspace-name {
          color: var(--hdr-muted);
        }

        .app-header--btn-theme .app-identity-divider {
          background: var(--hdr-divider);
        }

        .app-header--btn-theme .app-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-left: 8px;
          padding: 2px 7px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--hdr-text);
          background: var(--hdr-ctrl-bg);
          border: 1px solid var(--hdr-ctrl-border);
          border-radius: 2px;
        }

        .app-header--btn-theme .app-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          display: inline-block;
        }

        .app-header--btn-theme .app-menu-trigger {
          background: var(--hdr-ctrl-bg);
          color: var(--hdr-text);
          border: 1px solid var(--hdr-ctrl-border);
          border-radius: 2px;
          font-weight: 600;
          transition: background-color 120ms ease, color 120ms ease;
        }

        .app-header--btn-theme .app-menu-trigger:hover {
          background: var(--hdr-ctrl-hover);
        }

        .app-header--btn-theme .app-menu-trigger.is-open {
          background: var(--hdr-ctrl-active-bg);
          color: var(--hdr-cta-text);
          border-color: var(--hdr-ctrl-border);
        }

        .app-header--btn-theme .app-icon-button {
          background: var(--hdr-ctrl-bg);
          color: var(--hdr-text);
          border: 1px solid var(--hdr-ctrl-border);
          border-radius: 2px;
          transition: background-color 120ms ease;
        }

        .app-header--btn-theme .app-icon-button:hover {
          background: var(--hdr-ctrl-hover);
        }

        .app-header--btn-theme .app-search-form {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #1e5f9a;
          border-radius: 2px;
        }

        .app-header--btn-theme .app-search-submit {
          background: var(--hdr-cta-bg);
          color: var(--hdr-cta-text);
          border: 1px solid var(--hdr-ctrl-border);
          border-radius: 2px;
          font-weight: 600;
        }

        .app-header--btn-theme .app-search-submit:hover {
          background: var(--hdr-cta-hover);
        }
      `}</style>
    </header>
  );
}