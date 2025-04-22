
// Remove any existing panel first
const existing = document.getElementById('gpt_side_panel');
if (existing) existing.remove();

// Create the iframe side panel directly on page load
const panel = document.createElement('iframe');
panel.id = 'gpt_side_panel';
panel.src = chrome.runtime.getURL('content/sidepanel.html');
panel.style.cssText = `
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 360px;
  border: none;
  z-index: 99998;
  box-shadow: -2px 0 10px rgba(0,0,0,0.1);
`;

document.body.appendChild(panel);
