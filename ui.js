// UI State
let isPolling = false;
let pollingInterval = null;

// DOM Elements
const pollingToggle = document.getElementById('polling-toggle');
const apiUrlInput = document.getElementById('api-url');
const pollIntervalInput = document.getElementById('poll-interval');
const statusElement = document.getElementById('status');
const dumpButton = document.getElementById('dump-board');

// Update status display
function updateStatus(message, type = 'idle') {
  statusElement.textContent = message;
  statusElement.className = `status ${type}`;
}

// Start polling the server
async function startPolling() {
  const apiUrl = apiUrlInput.value.trim();
  const interval = parseInt(pollIntervalInput.value) || 1000;
  
  if (!apiUrl) {
    updateStatus('Please enter a valid server URL', 'error');
    pollingToggle.checked = false;
    return;
  }
  
  isPolling = true;
  updateStatus(`Polling ${apiUrl}...`, 'active');
  
  // Send config to plugin
  parent.postMessage({
    pluginMessage: {
      type: 'start-polling',
      apiUrl: apiUrl,
      interval: interval
    }
  }, '*');
  
  pollServer();
}

// Stop polling
function stopPolling() {
  isPolling = false;
  if (pollingInterval) {
    clearTimeout(pollingInterval);
    pollingInterval = null;
  }
  
  updateStatus('Polling stopped', 'idle');
  
  parent.postMessage({
    pluginMessage: {
      type: 'stop-polling'
    }
  }, '*');
}

// Poll the server for new requests
async function pollServer() {
  if (!isPolling) return;
  
  const apiUrl = apiUrlInput.value.trim();
  const interval = parseInt(pollIntervalInput.value) || 1000;
  
  try {
    const response = await fetch(`${apiUrl}/poll`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data && data.length > 0) {
        updateStatus(`Processing ${data.length} request(s)...`, 'active');
        
        // Send requests to plugin code for processing
        for (const request of data) {
          parent.postMessage({
            pluginMessage: {
              type: 'process-request',
              data: request
            }
          }, '*');
          
          // Acknowledge the request
          try {
            await fetch(`${apiUrl}/acknowledge`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: request.id })
            });
          } catch (ackError) {
            console.error('Failed to acknowledge request:', ackError);
          }
        }
      } else {
        updateStatus(`Polling ${apiUrl}...`, 'active');
      }
    } else {
      updateStatus(`Server error: ${response.status}`, 'error');
    }
  } catch (error) {
    updateStatus(`Connection failed: ${error.message}`, 'error');
    console.error('Polling error:', error);
  }
  
  // Schedule next poll
  pollingInterval = setTimeout(pollServer, interval);
}

// Toggle polling on/off
pollingToggle.addEventListener('change', (e) => {
  if (e.target.checked) {
    startPolling();
  } else {
    stopPolling();
  }
});

// Dump board button
dumpButton.addEventListener('click', () => {
  parent.postMessage({
    pluginMessage: {
      type: 'dump-board'
    }
  }, '*');
  updateStatus('Exporting board...', 'active');
});


// Listen for messages from plugin code
window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  
  if (msg.type === 'log') {
    console.log(msg.message);
  } else if (msg.type === 'status') {
    updateStatus(msg.message, msg.status || 'active');
  } else if (msg.type === 'board-dump') {
    // Download the JSON
    const blob = new Blob([JSON.stringify(msg.data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `figjam-board-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    updateStatus('Board exported successfully', 'active');
    setTimeout(() => {
      if (isPolling) {
        updateStatus(`Polling ${apiUrlInput.value}...`, 'active');
      } else {
        updateStatus('Idle - Polling disabled', 'idle');
      }
    }, 2000);
  }
};