const pdfjsLib = window['pdfjsLib'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnUrl = document.getElementById('url-summary-btn');
    const btnPdf = document.getElementById('pdf-summary-btn');
    const addInputBtn = document.getElementById('add-input');
    const inputArea = document.getElementById('input-area');
    const btn3 = document.getElementById('summary-btn');
    const resultText = document.getElementById('result-text');
    const compareBtn = document.getElementById('compare-btn');
    const compareResult = document.getElementById('compare-result');
    const toggleButtons = document.querySelectorAll('.summary-toggle');

    let currentType = 'url';
    let inputCount = 1;

    function renderInputs() {
        inputArea.innerHTML = '';
        if (currentType === 'url') {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const currentUrl = tabs[0].url;
                const wrapper = document.createElement('div');
                wrapper.className = 'inputGroup';
                wrapper.innerHTML = `<span style="font-size:15px;word-break:break-all;">${currentUrl}</span>`;
                inputArea.appendChild(wrapper);
                inputArea.dataset.url = currentUrl;
            });
        } else {
            for (let i = 0; i < inputCount; i++) {
                const wrapper = document.createElement('div');
                wrapper.className = 'inputGroup';
                wrapper.innerHTML = `
                    <input type="file" accept="application/pdf" />
                    ${inputCount > 1 ? `<button class="remove-btn" data-index="${i}">x</button>` : ''}
                `;
                inputArea.appendChild(wrapper);
            }
            document.querySelectorAll('.remove-btn').forEach((btn) => {
                btn.onclick = () => {
                    if (inputCount > 1) {
                        inputCount--;
                        renderInputs();
                    }
                };
            });
        }
    }

    btnUrl.addEventListener('click', () => {
        currentType = 'url';
        inputCount = 1;
        renderInputs();
        activate(btnUrl, btnPdf);
    });

    btnPdf.addEventListener('click', () => {
        currentType = 'pdf';
        inputCount = 1;
        renderInputs();
        activate(btnPdf, btnUrl);
    });

    addInputBtn.addEventListener('click', () => {
        if (currentType === 'pdf') {
            inputCount++;
            renderInputs();
        }
    });

    toggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
            toggleButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    btn3.addEventListener('click', () => {
        const selectedToggle = document.querySelector('.summary-toggle.active');
        const summaryLength = selectedToggle ? selectedToggle.dataset.value : 'normal';

        if (currentType === 'pdf') {
            const files = Array.from(inputArea.querySelectorAll('input[type="file"]'))
                .map(input => input.files[0])
                .filter(file => file && file.type === 'application/pdf');

            if (files.length === 0) {
                showToast('PDF 파일을 업로드하세요.');
                return;
            }

            Promise.all(files.map((file, idx) =>
                extractTextFromPDFAsync(file).then(text => ({
                    id: idx,
                    name: file.name,
                    text
                }))
            ))
            .then(fileTexts => {
                renderMultiResultPlaceholders(fileTexts);
                chrome.runtime.sendMessage({
                    type: 'gpt_summary_multi',
                    files: fileTexts,
                    summaryLength
                });
                if (compareResult) compareResult.textContent = '';
            });
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const tabId = tabs[0].id;
                const url = tabs[0].url;
                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabId },
                        func: () => {
                            let text = '';
                            if (document.querySelector('.newsct_article')) {
                                text = document.querySelector('.newsct_article').innerText;
                            } else if (document.querySelector('article')) {
                                text = document.querySelector('article').innerText;
                            } else if (document.querySelector('.article_view')) {
                                text = document.querySelector('.article_view').innerText;
                            } else if (document.querySelector('.se-main-container')) {
                                text = document.querySelector('.se-main-container').innerText;
                            } else if (document.body) {
                                text = document.body.innerText;
                            }
                            return text;
                        },
                    },
                    function (results) {
                        const pageText = results && results[0] && results[0].result ? results[0].result : '';
                        if (!pageText.trim()) {
                            showToast('페이지에서 텍스트를 추출할 수 없습니다.');
                            return;
                        }
                        resultText.textContent = `요약 진행 중... (선택: ${summaryLength})\n탭 URL: ${url}`;
                        chrome.runtime.sendMessage({
                            type: 'gpt_summary',
                            text: pageText,
                            summaryLength,
                            url: url
                        });
                        if (compareResult) compareResult.textContent = '';
                    }
                );
            });
        }
    });

    // 비교 버튼: 반드시 요약 결과만 비교
    if (compareBtn) {
        compareBtn.addEventListener('click', () => {
            const resultCards = Array.from(document.querySelectorAll('.result-card'));
            const summaries = [];
            const filenames = [];
            resultCards.forEach(card => {
                const content = card.querySelector('.summary-content').textContent.trim();
                const title = card.querySelector('b').textContent.trim();
                summaries.push(content);
                filenames.push(title);
            });

            if (summaries.length < 2) {
                showToast('두 개 이상의 논문 요약이 필요합니다.');
                return;
            }

            compareResult.textContent = '비교 중...';

            chrome.runtime.sendMessage({
                type: 'gpt_summary_compare',
                summaries,
                filenames
            });
        });
    }

    renderInputs();
    activate(btnUrl, btnPdf);
});

function activate(activeBtn, inactiveBtn) {
    activeBtn.classList.add('active-btn');
    inactiveBtn.classList.remove('active-btn');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hidden');
    }, 2000);
}

function extractTextFromPDFAsync(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = function () {
            const typedArray = new Uint8Array(this.result);
            pdfjsLib.getDocument(typedArray).promise.then((pdf) => {
                let textPromises = [];
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    textPromises.push(
                        pdf.getPage(pageNum).then(page =>
                            page.getTextContent().then(content => {
                                const text = content.items.map(item => item.str).join('');
                                return text.replace(/\s+/g, ' ').trim();
                            })
                        )
                    );
                }
                Promise.all(textPromises)
                    .then(pagesText => resolve(pagesText.join('\n')))
                    .catch(reject);
            });
        };
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });
}

function renderMultiResultPlaceholders(files) {
    const resultArea = document.getElementById('result-text');
    resultArea.innerHTML = '';
    files.forEach(file => {
        const card = document.createElement('div');
        card.id = `result-card-${file.id}`;
        card.className = 'result-card';
        card.innerHTML = `<b>${file.name}</b><div class="summary-content">요약 대기중...</div>`;
        resultArea.appendChild(card);
    });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'gpt_summary_stream') {
        const card = document.getElementById(`result-card-${message.id}`);
        if (card) {
            const content = card.querySelector('.summary-content');
            if (message.error) {
                content.textContent = message.result;
            } else if (message.done) {
                content.textContent = message.result;
            } else {
                content.textContent = message.accumulated;
            }
        }
    }
    if (message.type === 'gpt_summary_compare_result') {
        const compareResult = document.getElementById('compare-result');
        if (compareResult) {
            if (message.error) {
                compareResult.textContent = message.result;
            } else if (message.done) {
                compareResult.textContent = message.result;
            } else if (message.accumulated) {
                compareResult.textContent = message.accumulated;
            }
        }
    }
    if (message.type === 'gpt_summary_result') {
        const resultArea = document.getElementById('result-text');
        if (resultArea) {
            resultArea.innerHTML = `<b>요약 결과</b><div style="margin-top:5px;">${message.result}</div>`;
        }
    }
});
