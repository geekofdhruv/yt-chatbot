// Content script that runs on YouTube pages

let currentVideoId = null;
let chatbotWidget = null;

// Initialize when the script loads
init();

function init() {
  console.log('YouTube Chatbot content script loaded');
  
  // Extract current video ID
  currentVideoId = extractVideoId();
  
  // Create and inject chatbot widget
  createChatbotWidget();
  
  // Listen for video changes (YouTube is a SPA)
  observeVideoChanges();
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessage);
}

function extractVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

function createChatbotWidget() {
  // Create chatbot container
  const widget = document.createElement('div');
  widget.id = 'youtube-chatbot-widget';
  widget.className = 'chatbot-widget minimized';
  
  widget.innerHTML = `
    <div class="chatbot-header">
      <span class="chatbot-title">🤖 Video Assistant</span>
      <button class="chatbot-toggle" id="chatbot-toggle">💬</button>
    </div>
    <div class="chatbot-body" id="chatbot-body">
      <div class="chat-messages" id="chat-messages">
        <div class="message bot-message">
          Hi! I can answer questions about this video. What would you like to know?
        </div>
      </div>
      <div class="chat-input-container">
        <input type="text" id="chat-input" placeholder="Ask about the video..." />
        <button id="send-button">Send</button>
      </div>
    </div>
  `;
  
  // Inject into page
  document.body.appendChild(widget);
  chatbotWidget = widget;
  
  // Add event listeners
  setupWidgetEventListeners();
}

function setupWidgetEventListeners() {
  const toggle = document.getElementById('chatbot-toggle');
  const input = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-button');
  
  toggle.addEventListener('click', toggleWidget);
  sendButton.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

function toggleWidget() {
  const widget = document.getElementById('youtube-chatbot-widget');
  widget.classList.toggle('minimized');
}

function sendMessage() {
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  
  if (!message) return;
  
  // Add user message to chat
  addMessageToChat(message, 'user');
  
  // Clear input
  input.value = '';
  
  // Show loading
  addMessageToChat('Thinking...', 'bot', true);
  
  // Send to backend via background script
  chrome.runtime.sendMessage({
    action: 'sendToBackend',
    data: {
      videoId: currentVideoId,
      question: message,
      timestamp: Date.now()
    }
  }, (response) => {
    // Remove loading message
    removeLoadingMessage();
    
    if (response.success) {
      addMessageToChat(response.data.answer || 'Sorry, I could not find an answer.', 'bot');
    } else {
      addMessageToChat('Sorry, there was an error processing your question.', 'bot');
    }
  });
}

function addMessageToChat(message, sender, isLoading = false) {
  const messagesContainer = document.getElementById('chat-messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${sender}-message${isLoading ? ' loading' : ''}`;
  messageDiv.textContent = message;
  
  if (isLoading) {
    messageDiv.id = 'loading-message';
  }
  
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeLoadingMessage() {
  const loadingMessage = document.getElementById('loading-message');
  if (loadingMessage) {
    loadingMessage.remove();
  }
}

function observeVideoChanges() {
  // Watch for URL changes in YouTube SPA
  let lastUrl = location.href;
  
  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      const newVideoId = extractVideoId();
      if (newVideoId !== currentVideoId) {
        currentVideoId = newVideoId;
        console.log('Video changed to:', currentVideoId);
        // Clear chat for new video
        clearChat();
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

function clearChat() {
  const messagesContainer = document.getElementById('chat-messages');
  messagesContainer.innerHTML = `
    <div class="message bot-message">
      Hi! I can answer questions about this video. What would you like to know?
    </div>
  `;
}

function handleMessage(request, sender, sendResponse) {
  if (request.action === 'videoPageLoaded') {
    console.log('Video page loaded message received');
    currentVideoId = extractVideoId();
  }
}

// Extract video transcript (we'll implement this in the next step)
function extractVideoTranscript() {
  // TODO: Implement transcript extraction
  console.log('Extracting transcript for video:', currentVideoId);
}