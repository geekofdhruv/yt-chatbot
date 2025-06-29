// Popup script
document.addEventListener('DOMContentLoaded', () => {
  checkStatus();
});

function checkStatus() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const statusDiv = document.getElementById('status');
    
    if (currentTab.url && currentTab.url.includes('youtube.com/watch')) {
      statusDiv.className = 'status active';
      statusDiv.textContent = '✅ Active on YouTube video';
    } else {
      statusDiv.className = 'status inactive';
      statusDiv.textContent = '❌ Navigate to a YouTube video to use';
    }
  });
}