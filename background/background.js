// 이 파일을 사용하기 위해서는 manifest.json에 background.js을 등록해야 함!
// --------------------------------------------------------------
console.log('백그라운트 스크립트 로딩됨');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('메세지 수신: ', message);

    if (message.type === 'show_notification') {
        console.log('message.type === show_notification');

        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('images/bear.png'),
            title: '알림',
            message: '곰이 나타났습니다!',
            priority: 2,
        });

        sendResponse({ status: 'notification sent' });
    }

    return true;
});
