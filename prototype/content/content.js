
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("받은 메시지:", message);

    if (message.type === 'toggle_background') {
        const currentColor = document.body.style.backgroundColor;
        const newColor = (currentColor === 'yellow') ? 'white' : 'yellow';
        document.body.style.backgroundColor = newColor;

        console.log("배경색 변경:", newColor);
        sendResponse({ status: 'ok', color: newColor });
    }
});
