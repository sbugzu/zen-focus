import { Palette } from "lucide-react";
import type { PalettePlugin, PluginItem } from "./types";

function hexToRgb(hex: string) {
  let c = hex.substring(1);
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { 
    h: Math.round(h * 360), 
    s: Math.round(s * 100), 
    l: Math.round(l * 100) 
  };
}

export const ColorPlugin: PalettePlugin = {
  id: "color",
  name: "Color Converter",

  match(query: string) {
    const q = query.trim().toLowerCase();
    const isHex = /^#([a-f0-9]{3}|[a-f0-9]{6})$/.test(q);
    const isRgb = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(q);
    
    // Also support typing "rgb 255 255 255" or "255, 255, 255" potentially, but keep strict for now
    return isHex || isRgb;
  },

  getResults(query: string): PluginItem[] {
    const q = query.trim().toLowerCase();
    const results: PluginItem[] = [];

    // Parse Hex
    if (/^#([a-f0-9]{3}|[a-f0-9]{6})$/.test(q)) {
      const { r, g, b } = hexToRgb(q);
      const rgbStr = `rgb(${r}, ${g}, ${b})`;
      const { h, s, l } = rgbToHsl(r, g, b);
      const hslStr = `hsl(${h}, ${s}%, ${l}%)`;

      results.push({
        id: `color-rgb-${rgbStr}`,
        title: rgbStr,
        subtitle: `RGB variant`,
        icon: <Palette className="w-4 h-4 opacity-70" />,
        copyValue: rgbStr
      });
      results.push({
        id: `color-hsl-${hslStr}`,
        title: hslStr,
        subtitle: `HSL variant`,
        icon: <Palette className="w-4 h-4 opacity-70" />,
        copyValue: hslStr
      });
    }

    // Parse RGB
    if (/^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(q)) {
      const match = q.match(/\d+/g);
      if (match && match.length === 3) {
        const r = Math.min(255, parseInt(match[0], 10));
        const g = Math.min(255, parseInt(match[1], 10));
        const b = Math.min(255, parseInt(match[2], 10));

        const hexStr = rgbToHex(r, g, b);
        const { h, s, l } = rgbToHsl(r, g, b);
        const hslStr = `hsl(${h}, ${s}%, ${l}%)`;

        results.push({
          id: `color-hex-${hexStr}`,
          title: hexStr,
          subtitle: `HEX variant`,
          icon: <Palette className="w-4 h-4 opacity-70" />,
          copyValue: hexStr
        });
        results.push({
          id: `color-hsl-${hslStr}`,
          title: hslStr,
          subtitle: `HSL variant`,
          icon: <Palette className="w-4 h-4 opacity-70" />,
          copyValue: hslStr
        });
      }
    }

    return results;
  }
};
