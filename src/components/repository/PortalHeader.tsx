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

export type PortalHeaderVariant = "asit-navy" | "asit-blue" | "asit-light";

export type PortalHeaderProps = {
  appName?: string;
  workspaceName?: string;
  version?: string;
  systemStatus?: "Online" | "Maintenance" | "Offline";
  /** Visual variant matching the ASIT logo palette */
  variant?: PortalHeaderVariant;
  /** Optional custom image URL or React element override */
  logoUrl?: string;
  logoElement?: ReactNode;
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
  // Deep ASIT navy (#0B3A5D) with bright cyan-blue (#00AEEF) accents
  "asit-navy": {
    ["--hdr-bg" as string]: "linear-gradient(180deg, #0D446D 0%, #093250 100%)",
    ["--hdr-border" as string]: "#062338",
    ["--hdr-text" as string]: "#FFFFFF",
    ["--hdr-muted" as string]: "#BFE9FF",
    ["--hdr-divider" as string]: "rgba(255, 255, 255, 0.24)",
    ["--hdr-ctrl-bg" as string]: "rgba(0, 174, 239, 0.16)",
    ["--hdr-ctrl-hover" as string]: "rgba(0, 174, 239, 0.28)",
    ["--hdr-ctrl-active-bg" as string]: "#00AEEF",
    ["--hdr-ctrl-border" as string]: "rgba(191, 233, 255, 0.36)",
    ["--hdr-mark-bg" as string]: "#FFFFFF",
    ["--hdr-mark-border" as string]: "#00AEEF",
    ["--hdr-cta-bg" as string]: "#00AEEF",
    ["--hdr-cta-hover" as string]: "#0095CE",
    ["--hdr-cta-text" as string]: "#062338",
  },
  // ASIT cyan-blue (#0095CE / #0B3A5D) variant
  "asit-blue": {
    ["--hdr-bg" as string]: "linear-gradient(180deg, #0095CE 0%, #0B5C8A 100%)",
    ["--hdr-border" as string]: "#084366",
    ["--hdr-text" as string]: "#FFFFFF",
    ["--hdr-muted" as string]: "#E6F7FF",
    ["--hdr-divider" as string]: "rgba(255, 255, 255, 0.3)",
    ["--hdr-ctrl-bg" as string]: "rgba(11, 58, 93, 0.26)",
    ["--hdr-ctrl-hover" as string]: "rgba(11, 58, 93, 0.42)",
    ["--hdr-ctrl-active-bg" as string]: "#0B3A5D",
    ["--hdr-ctrl-border" as string]: "rgba(255, 255, 255, 0.38)",
    ["--hdr-mark-bg" as string]: "#FFFFFF",
    ["--hdr-mark-border" as string]: "#0B3A5D",
    ["--hdr-cta-bg" as string]: "#0B3A5D",
    ["--hdr-cta-hover" as string]: "#072840",
    ["--hdr-cta-text" as string]: "#FFFFFF",
  },
  // Crisp white/soft light surface matching the logo's background with #0B3A5D navy ink
  "asit-light": {
    ["--hdr-bg" as string]: "linear-gradient(180deg, #FFFFFF 0%, #F2F8FC 100%)",
    ["--hdr-border" as string]: "#CBD5E1",
    ["--hdr-text" as string]: "#0B3A5D",
    ["--hdr-muted" as string]: "#335C7A",
    ["--hdr-divider" as string]: "#CBD5E1",
    ["--hdr-ctrl-bg" as string]: "#FFFFFF",
    ["--hdr-ctrl-hover" as string]: "#E6F4FC",
    ["--hdr-ctrl-active-bg" as string]: "#0B3A5D",
    ["--hdr-ctrl-border" as string]: "#9BB8CE",
    ["--hdr-mark-bg" as string]: "#FFFFFF",
    ["--hdr-mark-border" as string]: "#CBD5E1",
    ["--hdr-cta-bg" as string]: "#0B3A5D",
    ["--hdr-cta-hover" as string]: "#00AEEF",
    ["--hdr-cta-text" as string]: "#FFFFFF",
  },
};

function AsitLogoMark({
  appName,
  logoUrl,
  logoElement,
}: {
  appName: string;
  logoUrl?: string;
  logoElement?: ReactNode;
}) {
  if (logoElement) {
    return <>{logoElement}</>;
  }

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${appName} logo`}
        style={{
          width: "24px",
          height: "24px",
          objectFit: "contain",
          display: "block",
        }}
      />
    );
  }

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {/* Curved navy shield outline on left and bottom */}
      <path
        d="M36 33C26.5 34.8 22 40.5 24.5 51.5L35.5 85.5C38.5 94 46 98.5 58.5 101.2C67.5 103 75.5 99.2 84.5 91.5L96.5 80.5C88.5 85.2 80.5 89.2 71.5 92.8C61.5 96.2 52.5 94.5 45.5 87.5C42.2 84.2 39.8 79.5 38.2 73.5L30.8 48.5C29.2 42.8 31.8 39.2 38.5 37.5"
        stroke="#0B3A5D"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Red upper page */}
      <path
        d="M47 17C59.5 23.5 70.5 33.5 79.5 46.5C68.5 38.5 58.5 33.8 50.5 31.5L47 17Z"
        fill="#E1251B"
      />

      {/* Yellow middle page */}
      <path
        d="M44 27.5C57.5 33 69.5 40.5 79.5 49.5C68.5 43.2 57.5 39.5 47.5 38.2L44 27.5Z"
        fill="#FDE100"
      />

      {/* Bright cyan-blue left open page */}
      <path
        d="M37.5 38.5C50.5 42.2 63.5 47.8 76.5 54.5L76.5 77.5C65.5 77.5 55.5 80.5 47.5 86.5L37.5 38.5Z"
        fill="#00AEEF"
      />

      {/* Right yellow page lip */}
      <path
        d="M80.5 48.5C86.5 42.5 92.5 39.5 98.5 39.2L97.5 45.5C91.5 46.5 85.5 48.2 80.5 48.5Z"
        fill="#FDE100"
      />

      {/* Dark navy right page */}
      <path
        d="M78.5 54.5C85.5 50.2 92.2 47.8 98.5 47.2L95.5 72.5C89.5 75.5 83.8 77.2 78.5 77.5V54.5Z"
        fill="#0B3A5D"
      />
    </svg>
  );
}

export default function PortalHeader({
  appName = "Advanced School of Information Technology",
  workspaceName = "Digital Resource Library",
  version = "v1.0",
  systemStatus = "Online",
  variant = "asit-navy",
  logoUrl,
  logoElement,
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
    <header
      className="repo-header app-header app-header--compact app-header--btn-theme"
      style={VARIANT_STYLES[variant]}
      ref={headerRef}
    >
      <div className="app-chrome-main">
        <div className="app-identity">
         
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
                    ? "#FDE100"
                    : "#E1251B",
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
          box-shadow: 0 1px 2px rgba(11, 58, 93, 0.16);
        }

        .app-header--btn-theme .app-identity-mark {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--hdr-mark-bg);
          border: 1px solid var(--hdr-mark-border);
          border-radius: 2px;
          box-shadow: 0 1px 2px rgba(6, 35, 56, 0.2);
          flex-shrink: 0;
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
          color: #0b3a5d;
          border: 1px solid #00aeef;
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