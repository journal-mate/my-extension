
console.log('백그라운드 스크립트 로딩됨');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'gpt_summary') {
        const apiKey = ''; // 여기에 실제 OpenAI API 키 입력
        const prompt = `다음 논문 내용을 서론 본론 결론 형식으로 요약하고 한국어로 번역해줘. 요약 길이는 ${message.summaryLength} 수준으로 해줘:\n\n${message.text}`;

        fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "당신은 한국어로 논문 요약을 도와주는 AI이다다." },
                    { role: "user", content: prompt }
                ]
            }),
        })
        .then(res => res.json())
        .then(data => {
            sendResponse({ result: data.choices[0].message.content });
        })
        .catch(err => {
            console.error('API 호출 실패:', err);
            sendResponse({ result: "요약 중 오류 발생" });
        });

        return true;
    }

    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
    });
});
