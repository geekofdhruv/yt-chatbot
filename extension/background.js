// Background script for handling extension lifecycle and cross-tab communication

chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Chatbot Extension installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    // Handle video info requests
    console.log('Video info requested:', request.data);
    sendResponse({ success: true });
  }
  
  if (request.action === 'sendToBackend') {
    // Handle API calls to your backend
    handleBackendRequest(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

// Function to handle backend API calls
async function handleBackendRequest(data) {
  try {
    const response = await fetch('https://your-backend-api.com/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Backend request failed:', error);
    throw error;
  }
}

// Handle tab updates to detect YouTube video changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    // Video page loaded, notify content script
    chrome.tabs.sendMessage(tabId, { action: 'videoPageLoaded' });
  }
});