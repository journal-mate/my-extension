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

    let currentType = 'url'; // url 또는 pdf
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

    // PDF 요약 처리
    btn3.addEventListener('click', () => {
        if (currentType === 'pdf') {
            const files = Array.from(inputArea.querySelectorAll('input[type="file"]'))
                .map(input => input.files[0])
                .filter(file => file && file.type === 'application/pdf');

            if (files.length === 0) {
                showToast('PDF 파일을 업로드하세요.');
                return;
            }

            const selectedToggle = document.querySelector('.summary-toggle.active');
            const summaryLength = selectedToggle ? selectedToggle.dataset.value : 'normal';

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
                // 비교 결과 초기화
                if (compareResult) compareResult.textContent = '';
            });
        } else {
            // URL 처리(기존)
            const url = inputArea.dataset.url;
            const selectedToggle = document.querySelector('.summary-toggle.active');
            const summaryLength = selectedToggle ? selectedToggle.dataset.value : 'normal';
            if (!url) {
                showToast('현재 탭의 URL을 찾을 수 없습니다.');
                return;
            }
            resultText.textContent = `요약 진행 중... (선택: ${summaryLength})\n탭 URL: ${url}`;
            // 필요시 gpt_summary 메시지 전송
        }
    });

    // 비교하기 버튼 처리
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

            if (compareResult) compareResult.textContent = '비교 중...';

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

// 활성화
function activate(activeBtn, inactiveBtn) {
    activeBtn.classList.add('active-btn');
    inactiveBtn.classList.remove('active-btn');
}

// 토스트 메시지
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

// 비동기로 PDF 텍스트 추출
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

// 여러 PDF 결과 카드 미리 그리기
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

// background에서 오는 메시지로 각 카드별로 결과 갱신 및 비교 결과 갱신
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
            compareResult.textContent = message.error ? message.result : message.result;
        }
    }
});
