# ⚡ Zen Focus

> A lightning-fast, keyboard-driven Command Palette extension tailored for your browser.

**English** | [简体中文](README_zh-CN.md)

Zen Focus brings the beloved Raycast / Alfred workflow directly into your web browser. Hit a single global shortcut to instantly summon a floating command palette to search tabs, history, bookmarks, or utilize built-in productivity tools.

## ✨ Core Features

- **Blazing Fast**: Injects natively via Shadow DOM so it appears without the input lag typical of browser action popups.
- **Keyboard-first**: Never touch the mouse. Arrow keys to navigate, Enter to execute.
- **Universal Search**:
  - Open `Tabs`
  - Saved `Bookmarks`
  - Browser `History`
  - Hands-off fallback to your browser's Default Search Engine
- **⚙️ Built-in Native Plugins**:
  - **Math Evaluator**: Type `128 * 4 + 7` and get the result instantly.
  - **Currency Converter**: Natural language inputs like `100 usd in eur` provide real-time conversions using an open API.
  - **Color Converter**: Type `#FF5733` or `rgb(255, 255, 255)` to instantly retrieve & copy alternative HSL/RGB representations.
- **Privacy & Security first**: Computations are completely local via native TypeScript parsers (except currency rate fetching). We don't track your keystrokes.

## 🚀 Getting Started

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension for production:
   ```bash
   npm run build
   ```
4. Go to `chrome://extensions/` in your browser.
5. Enable **Developer mode** in the top right.
6. Click **Load unpacked**.
7. Select the `build/chrome-mv3-prod` folder generated inside the project.

## ⌨️ Default Shortcut
- **macOS / Windows**: `Alt + Space` (can be configured in Chrome extension menus)

## 📄 License
Released under the **MIT License**. PRs and custom plugin integrations are always welcome!
