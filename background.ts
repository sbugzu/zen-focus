

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, payload } = request;

  if (action === "GET_TABS") {
    chrome.tabs.query({}, (tabs) => {
      sendResponse(tabs);
    });
    return true; // Keep channel open for async response
  }

  if (action === "SWITCH_TAB") {
    const { tabId, windowId } = payload;
    chrome.tabs.update(tabId, { active: true });
    chrome.windows.update(windowId, { focused: true });
    sendResponse({ success: true });
  }

  if (action === "CLOSE_TAB") {
    const { tabId } = payload;
    chrome.tabs.remove(tabId);
    sendResponse({ success: true });
  }

  if (action === "SEARCH_BOOKMARKS") {
    const { query } = payload;
    chrome.bookmarks.search(query, (results) => {
      sendResponse(results.slice(0, 10)); // return top 10
    });
    return true;
  }

  if (action === "SEARCH_HISTORY") {
    const { query } = payload;
    chrome.history.search({ text: query, maxResults: 10 }, (results) => {
      sendResponse(results);
    });
    return true;
  }

  if (action === "OPEN_URL") {
    chrome.tabs.create({ url: payload.url });
    sendResponse({ success: true });
  }

  if (action === "SEARCH_DEFAULT") {
    chrome.search.query({ text: payload.query, disposition: "NEW_TAB" });
    sendResponse({ success: true });
  }
});

// If the user clicks the extension action, or invokes the command
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "TOGGLE_PALETTE" });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-palette") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "TOGGLE_PALETTE" });
      }
    });
  }
});
