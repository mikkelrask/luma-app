import type { ComponentType } from "react";
import {
  Clock,
  CropIcon,
  Flame,
  HardDrive,
  Layers,
  LayoutDashboard,
  Library,
  RefreshCcw,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import type { JobKind } from "@/lib/jobs";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  keywords?: string;
  /** Job kinds whose running jobs light this nav item's dot. `"any"` lights for every job. */
  kinds?: JobKind[] | "any";
  end?: boolean;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Single source of truth for the sidebar sections and command palette.
 * Routes in src/App.tsx stay manual (they need element refs) but mirror `to`s.
 */
export const navSections: NavSection[] = [
  {
    id: "work",
    label: "Work",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, keywords: "overview home", kinds: "any", end: true },
      { to: "/ingest", label: "Ingest", icon: HardDrive, keywords: "card volumes media", kinds: ["ingest"] },
      { to: "/transcode", label: "Transcode", icon: RefreshCcw, keywords: "dailies proxies", kinds: ["transcode"] },
      { to: "/reports", label: "Reports", icon: Clock, keywords: "pdf ingest", kinds: ["reports"] },
    ],
  },
  {
    id: "library",
    label: "Library",
    items: [
      {
        to: "/library",
        label: "Library",
        icon: Library,
        keywords: "profiles transforms luts presets",
        kinds: ["profiles", "transforms", "luts"],
      },
    ],
  },
  {
    id: "manage",
    label: "Manage",
    items: [
      { to: "/create", label: "Add Production", icon: Flame, keywords: "create add new show", kinds: ["create"] },
      { to: "/config", label: "Settings", icon: Settings, keywords: "config appearance paths", kinds: ["config"] },
    ],
  },
];

/** Deep-linkable Library tabs, shared by the tab bar (Library page) and the command palette. */
export const libraryTabs: NavItem[] = [
  { to: "/library/profiles", label: "Profiles", icon: SlidersHorizontal, keywords: "presets codecs" },
  { to: "/library/transforms", label: "Transforms", icon: CropIcon, keywords: "letterbox zoom aspect" },
  { to: "/library/luts", label: "LUTs", icon: Layers, keywords: "color cube lut" },
];