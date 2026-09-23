import { useEffect, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Film } from "lucide-react";
import { useProductions } from "@/lib/useProductions";
import { useSession } from "@/lib/session";
import { navSections, libraryTabs } from "@/lib/nav";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface PaletteItem {
  value: string;
  label: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  keywords?: string[];
  action: () => void;
}

interface PaletteGroup {
  heading: string;
  items: PaletteItem[];
}

function isTypingTarget(e: KeyboardEvent): boolean {
  const el = e.target;
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { productions } = useProductions();
  const { setProduction } = useSession();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== "k") return;
      // Don't hijack typing (inputs, dialogs, the palette's own search field).
      if (isTypingTarget(e)) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  const pick = (name: string) => {
    setOpen(false);
    setProduction(name);
    navigate("/");
  };

  let showArchived = false;
  try {
    showArchived = localStorage.getItem("luma.sidebar.showArchived") === "1";
  } catch {
    /* storage unavailable */
  }

  const productionItems = productions
    .filter((p) => showArchived || !p.is_archived)
    .map<PaletteItem>((p) => ({
      value: p.name.toLowerCase(),
      label: p.name,
      hint: p.is_archived ? "archived" : undefined,
      icon: p.is_archived ? Archive : Film,
      action: () => pick(p.name),
    }));

  const toPaletteItem = (i: (typeof navSections)[number]["items"][number]): PaletteItem => ({
    value: i.to,
    label: i.label,
    keywords: i.keywords ? [i.keywords] : [],
    icon: i.icon,
    action: () => go(i.to),
  });

  const navGroups: PaletteGroup[] = navSections.map((section) => ({
    heading: section.label,
    items: [
      ...section.items.map(toPaletteItem),
      ...(section.id === "library" ? libraryTabs.map(toPaletteItem) : []),
    ],
  }));

  const groups: PaletteGroup[] = [
    ...navGroups,
    { heading: "Work on", items: productionItems },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group) =>
          group.items.length === 0 ? null : (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.value}
                    value={`${item.value} ${item.label}`}
                    keywords={item.keywords}
                    onSelect={item.action}
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                    {item.hint && (
                      <span className="ml-auto text-xs text-muted-foreground/70">
                        {item.hint}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ),
        )}
      </CommandList>
    </CommandDialog>
  );
}