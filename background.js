console.log('백그라운드 스크립트 로딩됨');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'gpt_summary') {
        const apiKey = ''; // 여기에 실제 OpenAI API 키 입력
        const prompt = `다음 논문 내용을 서론 본론 결론 형식으로 요약하고 한국어로 번역해줘. 요약 길이는 ${message.summaryLength} 수준으로 해줘:\n\n${message.text}`;

        fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                stream: true,
                messages: [
                    { role: 'system', content: '당신은 한국어로 논문 요약을 도와주는 AI이다다.' },
                    { role: 'user', content: prompt },
                ],
            }),
        })
            .then(async (res) => {
                if (!res.body) throw new Error('No response body');
                const reader = res.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let fullText = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });

                    chunk.split('\n').forEach((line) => {
                        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                            try {
                                const data = JSON.parse(line.replace('data: ', ''));
                                const delta = data.choices[0].delta?.content || '';
                                fullText += delta;
                                // 여기서 실시간으로 프론트에 전달
                                chrome.runtime.sendMessage({
                                    type: 'gpt_summary_stream',
                                    chunk: delta,
                                    accumulated: fullText,
                                });
                            } catch (e) {}
                        }
                    });
                }

                // 최종 완료 신호
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_stream',
                    done: true,
                    result: fullText,
                });
            })
            .catch((err) => {
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_stream',
                    error: true,
                    result: '요약 중 오류 발생',
                });
            });
    }

    return true;
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
    });
});
