import type { ReactNode } from "react";

export interface PluginItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onSelect?: () => void; // Used for custom actions
  copyValue?: string;    // If present, clicking the item copies this value
}

export interface PalettePlugin {
  id: string;
  name: string;
  match: (query: string) => boolean;
  getResults: (query: string) => PluginItem[] | Promise<PluginItem[]>;
}
