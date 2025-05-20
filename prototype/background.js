console.log('백그라운드 스크립트 로딩됨');

// 여러 PDF 파일 요약 요청을 처리하는 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. 여러 논문(PDF) 요약 요청
    if (message.type === 'gpt_summary_multi') {
        const apiKey = ''; // 여기에 OpenAI API 키 입력

        // files: [{ id, name, text }]
        message.files.forEach(async (file) => {
            const prompt = `다음 논문 내용을 서론 본론 결론의 구조로 요약하고 한국어로 번역해줘. 요약 길이는 ${message.summaryLength} 수준으로 해줘:\n\n${file.text}`;

            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        stream: true,
                        messages: [
                            { role: 'system', content: '당신은 한국어로 논문 요약을 도와주는 AI이다.' },
                            { role: 'user', content: prompt },
                        ],
                    }),
                });
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
                                // 각 파일별로 id를 붙여 실시간 전달
                                chrome.runtime.sendMessage({
                                    type: 'gpt_summary_stream',
                                    id: file.id,
                                    filename: file.name,
                                    chunk: delta,
                                    accumulated: fullText,
                                });
                            } catch (e) {}
                        }
                    });
                }
                // 한 파일 요약 완료 신호
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_stream',
                    id: file.id,
                    filename: file.name,
                    done: true,
                    result: fullText,
                });
            } catch (err) {
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_stream',
                    id: file.id,
                    filename: file.name,
                    error: true,
                    result: '요약 중 오류 발생',
                });
            }
        });
    }

    // 2. 여러 요약 결과 비교 요청
if (message.type === 'gpt_summary_compare') {
    const apiKey = ''; // OpenAI API 키 입력
    const combinedPrompt = `다음은 여러 논문의 요약 결과이다. 이 논문들의 공통점과 차이점을 항목별로 비교하라라:\n\n` +
        message.summaries.map((s, idx) => `[${message.filenames[idx]}]: ${s}`).join('\n\n');

    fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o', // 'gpt-4o'로 변경
            messages: [
                { role: 'system', content: '당신은 한국어로 논문 비교를 도와주는 AI이다.' },
                { role: 'user', content: combinedPrompt },
            ],
        }),
    })
        .then(async res => {
            if (!res.ok) {
                const errorText = await res.text();
                console.error("API 응답 에러:", res.status, errorText);
                throw new Error(`OpenAI API 오류: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (data && data.choices && data.choices[0].message && data.choices[0].message.content) {
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_compare_result',
                    result: data.choices[0].message.content,
                });
            } else {
                console.error("예상과 다른 API 응답 구조:", data);
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_compare_result',
                    error: true,
                    result: 'OpenAI 응답 구조가 예상과 다릅니다.',
                });
            }
        })
        .catch((err) => {
            console.error("비교 중 예외:", err);
            chrome.runtime.sendMessage({
                type: 'gpt_summary_compare_result',
                error: true,
                result: '비교 중 오류 발생: ' + err.message,
            });
        });
}

});

// 확장 설치 시 사이드패널 자동 연결
chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
    });
});
