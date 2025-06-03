console.log('백그라운드 스크립트 로딩됨');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 0. 웹페이지 요약 요청
    if (message.type === 'gpt_summary') {
        const apiKey = '';
        const prompt = `다음은 사용자가 방문한 웹페이지의 본문 전체이다.
만약 본문이 논문, 기사, 블로그, 백과사전, 위키 등 '정보성 자료'라면, 
내용을 서론/본론/결론의 구조로 간결하게 요약하고 반드시 한국어로 번역하라.. 
요약 길이는 ${message.summaryLength} 수준으로 하라.
만약 본문이 포털, 검색, 광고, 로그인, 네비게이션, 메인화면 등 정보성이 부족한 페이지라면 
"이 페이지에는 요약하거나 번역할 만한 정보성 본문이 없습니다."라고 출력하라.
---
${message.text}
---`;

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
                    {
                        role: 'system',
                        content: `너는 사용자가 방문한 웹페이지의 본문을 분석해서,
- 논문, 기사, 블로그, 백과사전, 리뷰 등 '정보성 자료'면 서론/본론/결론 구조로 요약 후 반드시 한국어로 번역해 출력하라.
- 포털, 검색, 광고, 로그인, 네비, 메인화면 등 정보성 없는 페이지면 "이 페이지에는 요약하거나 번역할 만한 정보성 본문이 없습니다."라고 출력하라.
- 반드시 둘 중 하나만 수행`,
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
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
                                chrome.runtime.sendMessage({
                                    type: 'gpt_summary_stream_web',
                                    chunk: delta,
                                    accumulated: fullText,
                                });
                            } catch (e) {}
                        }
                    });
                }
                // 최종 완료 신호
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_stream_web',
                    done: true,
                    result: fullText,
                });
            })
            .catch((err) => {
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_stream_web',
                    result: '요약 중 오류 발생: ' + err.message,
                });
            });
    }

    // 1. PDF 파일들 다중 요약 요청
    if (message.type === 'gpt_summary_multi') {
        const apiKey = '';
        message.files.forEach(async (file) => {
            const prompt = `다음 논문 내용을 서론 본론 결론의 구조로 요약하고 한국어로 번역하라. 요약 길이는 ${message.summaryLength} 수준으로 하라라:\n\n${file.text}`;

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

    // 2. 이미 요약된 결과 비교 요청
    if (message.type === 'gpt_summary_compare') {
        const apiKey = '';
        const combinedPrompt = `다음은 여러 논문(또는 PDF 파일)의 요약 결과이다.
각 논문의 핵심 내용을 바탕으로, 공통점과 차이점을 항목별로 비교해서 한국어로 자세히 정리하라.
공통점과 차이점 비교 결과를 도출할 때는 문단별로 줄바꿈을 하라.

${message.summaries.map((s, idx) => `[${message.filenames[idx]}]:\n${s}`).join('\n\n')}
`;

        fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                stream: true,
                messages: [
                    { role: 'system', content: '당신은 한국어로 논문 비교를 도와주는 AI이다.' },
                    { role: 'user', content: combinedPrompt },
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
                                chrome.runtime.sendMessage({
                                    type: 'gpt_summary_compare_result',
                                    accumulated: fullText,
                                });
                            } catch (e) {}
                        }
                    });
                }
                // 최종 완료 신호
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_compare_result',
                    done: true,
                    result: fullText,
                });
            })
            .catch((err) => {
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_compare_result',
                    error: true,
                    result: '비교 중 오류 발생: ' + err.message,
                });
            });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
    });
});
