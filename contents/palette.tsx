import cssText from "data-text:~/contents/palette.css"
import type { PlasmoCSConfig } from "plasmo"
import { useState, useEffect, useRef } from "react"
import { CalculatorPlugin } from "./plugins/calculator"
import { ColorPlugin } from "./plugins/color"
import { CurrencyPlugin } from "./plugins/currency"
import type { PluginItem } from "./plugins/types"
import { Command } from "cmdk"
import { 
  Search,
  Monitor, 
  X, 
  Bookmark, 
  Clock, 
  Globe,
  ExternalLink,
  Settings
} from "lucide-react"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export default function Palette() {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState("")

  // data states
  const [tabs, setTabs] = useState<any[]>([])
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [inputHistory, setInputHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isCycling, setIsCycling] = useState(false)
  const cyclingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [pluginResults, setPluginResults] = useState<PluginItem[]>([])

  const PLUGINS = [CalculatorPlugin, ColorPlugin, CurrencyPlugin];

  // global shortcut inside content script (cmd+k or ctrl+k)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      
      // Also close on Escape if open
      if (e.key === "Escape" && open) {
          e.preventDefault()
          setOpen(false)
      }
    }

    const messageListener = (request: any, sender: any, sendResponse: any) => {
      if (request.action === "TOGGLE_PALETTE") {
        setOpen((o) => !o)
      }
    }

    document.addEventListener("keydown", down)
    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      document.removeEventListener("keydown", down)
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [open])

  // Load input history on mount
  useEffect(() => {
    chrome.storage.local.get(["zenFocusInputHistory"], (res) => {
      if (res.zenFocusInputHistory && Array.isArray(res.zenFocusInputHistory)) {
        setInputHistory(res.zenFocusInputHistory as string[]);
      }
    });
  }, []);

  const saveHistoryAndClose = () => {
    if (inputValue.trim()) {
      const newHistory = [inputValue.trim(), ...inputHistory.filter(i => i !== inputValue.trim())].slice(0, 50);
      setInputHistory(newHistory);
      setHistoryIndex(-1);
      chrome.storage.local.set({ zenFocusInputHistory: newHistory });
    }
    setOpen(false);
  };

  // Fetch initial tabs when opened
  useEffect(() => {
    if (open) {
      chrome.runtime.sendMessage({ action: "GET_TABS" }, (response) => {
        setTabs(response || [])
      })
      setInputValue("")
    }
  }, [open])

  // Search when input changes
  useEffect(() => {
    if (inputValue.length > 1) {
      chrome.runtime.sendMessage({ action: "SEARCH_BOOKMARKS", payload: { query: inputValue } }, (res) => {
        setBookmarks(res || [])
      })
      chrome.runtime.sendMessage({ action: "SEARCH_HISTORY", payload: { query: inputValue } }, (res) => {
        setHistory(res || [])
      })
    } else {
      setBookmarks([])
      setHistory([])
    }

    // Run plugins
    let active = true;
    const runPlugins = async () => {
      if (!inputValue.trim()) {
        setPluginResults([]);
        return;
      }
      const allResults: PluginItem[] = [];
      for (const p of PLUGINS) {
        if (p.match(inputValue)) {
          try {
            const res = await p.getResults(inputValue);
            allResults.push(...res);
          } catch(e) {}
        }
      }
      if (active) setPluginResults(allResults);
    };
    runPlugins();

    return () => { active = false; };
  }, [inputValue])

  if (!open) return null;

  const handleSwitchTab = (tabId: number, windowId: number) => {
    chrome.runtime.sendMessage({ action: "SWITCH_TAB", payload: { tabId, windowId } })
    saveHistoryAndClose()
  }

  const handleCloseTab = (tabId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    chrome.runtime.sendMessage({ action: "CLOSE_TAB", payload: { tabId } })
    setTabs(tabs.filter(t => t.id !== tabId))
  }

  const handleOpenUrl = (url: string) => {
    chrome.runtime.sendMessage({ action: "OPEN_URL", payload: { url } })
    saveHistoryAndClose()
  }

  const handleFallbackSearch = () => {
    if (inputValue.trim()) {
      chrome.runtime.sendMessage({ action: "SEARCH_DEFAULT", payload: { query: inputValue.trim() } })
      saveHistoryAndClose()
    }
  }

  const isUrl = (str: string) => {
    const s = str.trim();
    return /^(https?:\/\/)?([\w\-]+(\.[\w\-]+)+|localhost)(:\d+)?(\/\S*)?$/i.test(s) || /^chrome:\/\/\S+/i.test(s);
  }

  const parsedUrl = (() => {
    if (!isUrl(inputValue)) return null;
    const s = inputValue.trim();
    if (s.startsWith('http') || s.startsWith('chrome://')) return s;
    return `https://${s}`;
  })();

  const SYSTEM_PAGES = [
    { title: "Chrome Extensions", url: "chrome://extensions" },
    { title: "Chrome Settings", url: "chrome://settings" },
    { title: "Chrome History", url: "chrome://history" },
    { title: "Chrome Downloads", url: "chrome://downloads" },
    { title: "Chrome Bookmarks", url: "chrome://bookmarks" },
    { title: "Chrome Flags", url: "chrome://flags" }
  ];

  const filteredSystemPages = inputValue.trim() ? SYSTEM_PAGES.filter(p => 
    p.title.toLowerCase().includes(inputValue.toLowerCase()) || 
    p.url.toLowerCase().includes(inputValue.toLowerCase())
  ) : [];

  const matchedTabs = tabs.filter(tab => {
    const title = tab.title || "Untitled Tab"
    const url = tab.url || ""
    return title.toLowerCase().includes(inputValue.toLowerCase()) || 
           url.toLowerCase().includes(inputValue.toLowerCase())
  });

  const matchedBookmarks = bookmarks.filter(bm => {
    const title = bm.title || ""
    const url = bm.url || ""
    return title.toLowerCase().includes(inputValue.toLowerCase()) || 
           url.toLowerCase().includes(inputValue.toLowerCase())
  });

  const matchedHistory = history.filter(item => {
    const title = item.title || ""
    const url = item.url || ""
    return title.toLowerCase().includes(inputValue.toLowerCase()) || 
           url.toLowerCase().includes(inputValue.toLowerCase())
  });

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Toggle off with Cmd+K / Ctrl+K
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
      return;
    }

    // Close with Escape
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
      return;
    }

    const isUp = e.key === "ArrowUp" || (e.ctrlKey && e.key === "p");
    const isDown = e.key === "ArrowDown" || (e.ctrlKey && e.key === "n");

    if (isUp || isDown) {
      if (!inputValue.trim() || isCycling) {
        // Intercept arrow events from CmdK Command.List
        e.stopPropagation();
        e.preventDefault();

        // Start or refresh the 1-second cycling timeout
        setIsCycling(true);
        if (cyclingTimeoutRef.current) clearTimeout(cyclingTimeoutRef.current);
        cyclingTimeoutRef.current = setTimeout(() => {
          setIsCycling(false);
        }, 1000);

        let nextIndex = historyIndex;
        if (isUp) {
          nextIndex = Math.min(historyIndex + 1, inputHistory.length - 1);
        } else {
          nextIndex = Math.max(historyIndex - 1, -1);
        }
        
        if (nextIndex !== historyIndex) {
          setHistoryIndex(nextIndex);
          setInputValue(nextIndex >= 0 ? inputHistory[nextIndex] : "");
        }
      }
    }
  };

  const handleValueChange = (val: string) => {
    setInputValue(val);
    setHistoryIndex(-1);
    setIsCycling(false);
    if (cyclingTimeoutRef.current) clearTimeout(cyclingTimeoutRef.current);
  };

  return (
    <div 
      className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 text-zinc-900 font-sans"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0" onClick={() => setOpen(false)}></div>
      
      <Command 
        className="relative z-10 w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 focus:outline-none flex flex-col"
        shouldFilter={false} // Custom filtering
        loop
      >
         <div className="flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800">
           <Search className="w-5 h-5 text-zinc-400" />
           <Command.Input 
             className="w-full h-14 bg-transparent outline-none pl-3 text-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
             placeholder="Search tabs, bookmarks, history, or commands..."
             value={inputValue}
             onValueChange={handleValueChange}
             onKeyDown={handleInputKeyDown}
             autoFocus
           />
           <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1">
             <X className="w-5 h-5" />
           </button>
         </div>

         <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            {inputValue.trim().length > 0 ? (
              <Command.Empty className="py-6 text-center text-sm text-zinc-500 flex flex-col items-center justify-center gap-2">
                 <span>No results found for "{inputValue}"</span>
                 <button 
                    onClick={handleFallbackSearch}
                    className="px-4 py-2 mt-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                 >
                   Search Web
                 </button>
              </Command.Empty>
            ) : (
              <Command.Empty className="py-6 text-center text-sm text-zinc-500">
                Type something to search, or use ↑/↓ for history
              </Command.Empty>
            )}
            
            {pluginResults.length > 0 && (
              <Command.Group heading="Tools">
                {pluginResults.map((item) => (
                   <Command.Item
                      key={item.id}
                      value={`plugin-${item.id}`}
                      onSelect={() => {
                        if (item.onSelect) item.onSelect();
                        if (item.copyValue) {
                           navigator.clipboard.writeText(item.copyValue).catch(() => {});
                           saveHistoryAndClose();
                        }
                      }}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-700 dark:aria-selected:text-blue-400"
                   >
                     <div className="flex items-center gap-3 font-medium">
                       {item.icon}
                       <span>{item.title}</span>
                     </div>
                     {item.subtitle && (
                        <span className="text-zinc-400 dark:text-zinc-500 text-xs max-w-xs truncate">{item.subtitle}</span>
                     )}
                   </Command.Item>
                ))}
              </Command.Group>
            )}

            {parsedUrl && (
              <Command.Group heading="Direct URL">
                 <Command.Item
                    value={`open-url-${parsedUrl}`}
                    onSelect={() => handleOpenUrl(parsedUrl)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-700 dark:aria-selected:text-blue-400"
                 >
                    <ExternalLink className="w-4 h-4 shrink-0 opacity-70 border-zinc-200" />
                    <span>Open <strong>{parsedUrl}</strong></span>
                 </Command.Item>
              </Command.Group>
            )}

            {filteredSystemPages.length > 0 && (
              <Command.Group heading="System Pages">
                 {filteredSystemPages.map((page) => (
                    <Command.Item
                      key={page.url}
                      value={`sys-${page.url}-${page.title}`}
                      onSelect={() => handleOpenUrl(page.url)}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-700 dark:aria-selected:text-blue-400"
                    >
                      <Settings className="w-4 h-4 shrink-0 opacity-70" />
                      <span>{page.title} <span className="text-zinc-400 text-xs ml-2">({page.url})</span></span>
                    </Command.Item>
                 ))}
              </Command.Group>
            )}
            
            {inputValue.trim().length > 0 && matchedTabs.length > 0 && (
              <Command.Group heading="Open Tabs">
                 {matchedTabs.map((tab) => {
                   const title = tab.title || "Untitled Tab"
                   return (
                    <Command.Item 
                      key={tab.id} 
                      value={`tab-${tab.id}-${title}`}
                      onSelect={() => handleSwitchTab(tab.id, tab.windowId)}
                      className="group flex items-center justify-between px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-700 dark:aria-selected:text-blue-400"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Monitor className="w-4 h-4 shrink-0 opacity-70" />
                        <span className="truncate">{title}</span>
                      </div>
                      <button 
                        onClick={(e) => handleCloseTab(tab.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-opacity"
                        title="Close Tab"
                      >
                         <X className="w-3.5 h-3.5" />
                      </button>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}

            {inputValue.trim().length > 0 && matchedBookmarks.length > 0 && (
              <Command.Group heading="Bookmarks">
                {matchedBookmarks.map((bm) => {
                  const title = bm.title || ""
                  const url = bm.url || ""
                  return (
                    <Command.Item 
                        key={bm.id} 
                        value={`bookmark-${bm.id}-${title}`}
                        onSelect={() => handleOpenUrl(url)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-700 dark:aria-selected:text-blue-400"
                    >
                       <Bookmark className="w-4 h-4 shrink-0 opacity-70" />
                       <span className="truncate">{title}</span>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}

            {inputValue.trim().length > 0 && matchedHistory.length > 0 && (
              <Command.Group heading="History">
                {matchedHistory.map((item) => {
                  const title = item.title || ""
                  const url = item.url || ""
                  return (
                    <Command.Item 
                        key={item.id} 
                        value={`history-${item.id}-${title}`}
                        onSelect={() => handleOpenUrl(url)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-700 dark:aria-selected:text-blue-400"
                    >
                       <Clock className="w-4 h-4 shrink-0 opacity-70" />
                       <span className="truncate">{title || url}</span>
                    </Command.Item>
                  )
                })}
              </Command.Group>
            )}

            {inputValue.trim().length > 0 && (
              <Command.Group heading="Web Search">
                 <Command.Item
                    value={`search-${inputValue}`}
                    onSelect={handleFallbackSearch}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/30 aria-selected:text-blue-700 dark:aria-selected:text-blue-400"
                 >
                    <Globe className="w-4 h-4 shrink-0 opacity-70 border-zinc-200" />
                    <span>Search Web for "<strong>{inputValue}</strong>"</span>
                 </Command.Item>
              </Command.Group>
            )}

         </Command.List>
      </Command>
    </div>
  )
}
