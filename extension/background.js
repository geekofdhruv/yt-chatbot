// Background script for handling extension lifecycle and cross-tab communication

chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Chatbot Extension installed');
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    console.log('Video info requested:', request.data);
    sendResponse({ success: true });
  }
  
  if (request.action === 'sendToBackend') {
    console.log('handlebackendrequest called with data:', request.data);
    
    handleBackendRequest(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => {
        console.error('Backend request failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  }
});

// Function to handle backend API calls
async function handleBackendRequest(data) {
  console.log('entered hanbdlebackednrequest function with data:', data);
  
  try {
    console.log('inside try block of handleBackendRequest');
    
    console.log('Sending to backend:', data);
    
    const response = await fetch('http://127.0.0.1:8000/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Backend response:', result);
    return result;
    
  } catch (error) {
    console.error('Backend request failed:', error);
    throw error;
  }
}

// Handle tab updates to detect YouTube video changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    chrome.tabs.sendMessage(tabId, { action: 'videoPageLoaded' });
  }
});