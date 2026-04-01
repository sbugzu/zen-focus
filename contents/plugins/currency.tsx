import { DollarSign } from "lucide-react";
import type { PalettePlugin, PluginItem } from "./types";

// Native currency fetcher with caching to prevent constant fetches
let ratesCache: Record<string, number> | null = null;
let lastFetchTime = 0;

async function fetchRates(): Promise<Record<string, number>> {
  // Cache for 1 hour
  if (ratesCache && Date.now() - lastFetchTime < 1000 * 60 * 60) {
    return ratesCache;
  }
  
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json();
    if (data && data.rates) {
      ratesCache = data.rates;
      lastFetchTime = Date.now();
    }
    return ratesCache || {};
  } catch (e) {
    return ratesCache || {};
  }
}

export const CurrencyPlugin: PalettePlugin = {
  id: "currency",
  name: "Currency Converter",

  match(query: string) {
    const q = query.trim();
    // Regex for: "100 usd", "100.5 USD to CNY", "100 eur in jpy"
    return /^\d+(\.\d+)?\s+[a-zA-Z]{3}(\s+(to|in)?\s*[a-zA-Z]{3})?$/.test(q);
  },

  async getResults(query: string): Promise<PluginItem[]> {
    const match = query.trim().match(/^(\d+(?:\.\d+)?)\s+([a-zA-Z]{3})(?:\s+(?:to|in)?\s*([a-zA-Z]{3}))?$/i);
    if (!match) return [];

    const amount = parseFloat(match[1]);
    const fromBase = match[2].toUpperCase();
    const toBase = match[3] ? match[3].toUpperCase() : null;

    const rates = await fetchRates();
    if (!rates || Object.keys(rates).length === 0) return [];
    if (!rates[fromBase]) return []; // Unknown origin currency

    const results: PluginItem[] = [];

    const convert = (target: string) => {
      const rateFrom = rates[fromBase];
      const rateTo = rates[target];
      if (!rateTo) return null;
      const usdAmount = amount / rateFrom;
      const targetAmount = usdAmount * rateTo;
      // Truncate to 2 decimal places if it has decimals
      return parseFloat(targetAmount.toFixed(2)).toString();
    };

    if (toBase) {
      if (!rates[toBase]) return [];
      const val = convert(toBase);
      if (val !== null) {
        results.push({
          id: `curr-${fromBase}-${toBase}`,
          title: `${val} ${toBase}`,
          subtitle: `${amount} ${fromBase} = ${val} ${toBase}`,
          icon: <DollarSign className="w-4 h-4 opacity-70" />,
          copyValue: val
        });
      }
    } else {
      // Quick defaults
      const defaults = ["CNY", "USD", "EUR", "JPY", "GBP"].filter(c => c !== fromBase);
      for (const d of defaults) {
        if (!rates[d]) continue;
        const val = convert(d);
        if (val !== null) {
          results.push({
            id: `curr-${fromBase}-${d}`,
            title: `${val} ${d}`,
            subtitle: `${amount} ${fromBase} = ${val} ${d}`,
            icon: <DollarSign className="w-4 h-4 opacity-70" />,
            copyValue: val
          });
        }
      }
    }

    return results;
  }
};
