const pdfjsLib = window['pdfjsLib'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';

document.addEventListener('DOMContentLoaded', () => {
    const btnUrl = document.getElementById('url-summary-btn'); // URL
    const btnPdf = document.getElementById('pdf-summary-btn'); // PDF
    const addInputBtn = document.getElementById('add-input');
    const inputArea = document.getElementById('input-area');
    const btn3 = document.getElementById('summary-btn'); // 요약 실행
    const resultText = document.getElementById('result-text');
    const toggleButtons = document.querySelectorAll('.summary-toggle');

    let currentType = 'url'; // url 또는 pdf
    let inputCount = 1;

    // 현재 요약 타입에 맞게 입력 영역 렌더링
    function renderInputs() {
        inputArea.innerHTML = '';
        if (currentType === 'url') {
            // 현재 탭 가져오기
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const currentUrl = tabs[0].url;
                const wrapper = document.createElement('div');
                wrapper.className = 'inputGroup';
                // 입력창 대신 URL 텍스트만 보여주기
                wrapper.innerHTML = `<span style="font-size:15px;word-break:break-all;">${currentUrl}</span>`;
                inputArea.appendChild(wrapper);

                // 저장해두고 요약 버튼 누를 때 사용
                inputArea.dataset.url = currentUrl;
            });
        } else {
            // PDF 입력 기존대로
            for (let i = 0; i < inputCount; i++) {
                const wrapper = document.createElement('div');
                wrapper.className = 'inputGroup';
                wrapper.innerHTML = `
                <input type="file" accept="application/pdf" />
                ${inputCount > 1 ? `<button class="remove-btn" data-index="${i}">x</button>` : ''}
            `;
                inputArea.appendChild(wrapper);
            }
            // x버튼 삭제 로직 동일하게
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

    // URL 버튼 클릭 시
    btnUrl.addEventListener('click', () => {
        currentType = 'url';
        inputCount = 1;

        renderInputs();
        activate(btnUrl, btnPdf);
    });

    // PDF 버튼 클릭 시
    btnPdf.addEventListener('click', () => {
        currentType = 'pdf';
        inputCount = 1;

        renderInputs();
        activate(btnPdf, btnUrl);
    });

    // + 버튼
    addInputBtn.addEventListener('click', () => {
        if (currentType === 'pdf') {
            const wrapper = document.createElement('div');
            wrapper.className = 'inputGroup';
            wrapper.innerHTML = `
            <input type="file" accept="application/pdf" />
            <button class="remove-btn">x</button>
        `;
            inputArea.appendChild(wrapper);

            wrapper.querySelector('.remove-btn').onclick = function () {
                wrapper.remove();
            };
        }
    });

    toggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
            toggleButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    btn3.addEventListener('click', () => {
        let valid = false;
        let values = [];

        if (currentType === 'url') {
            // inputArea에 저장된 자동 감지 URL 사용
            const url = inputArea.dataset.url; // renderInputs에서 chrome.tabs.query로 세팅
            valid = !!url;
            values = [url];
        } else {
            // 모든 파일 입력값 가져오기 (append 방식)
            values = Array.from(inputArea.querySelectorAll('input[type="file"]'))
                .map((input) => input.files[0])
                .filter((file) => file && file.type === 'application/pdf');
            valid = values.length > 0;
        }

        const selectedToggle = document.querySelector('.summary-toggle.active');
        const summaryLength = selectedToggle ? selectedToggle.dataset.value : 'normal';

        if (!valid) {
            showToast(currentType === 'url' ? '현재 탭의 URL을 찾을 수 없습니다.' : 'PDF 파일을 업로드하세요.');
            return;
        }

        if (currentType === 'pdf') {
            // 여러 개 모두 처리하려면 아래처럼 반복문 사용 가능
            values.forEach((pdfFile, idx) => {
                extractTextFromPDF(pdfFile, summaryLength);
                // idx가 필요하면 활용
            });
        } else {
            resultText.textContent = `요약 진행 중... (선택: ${summaryLength})\n탭 URL: ${values[0]}`;
        }
    });

    toggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
            toggleButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    renderInputs();
    activate(btnUrl, btnPdf);
});

// 토글 활성화/비활성화
function activate(activeBtn, inactiveBtn) {
    activeBtn.classList.add('active-btn');
    inactiveBtn.classList.remove('active-btn');
}

// 토스트 메세지
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

// pdf 파일 추출
function extractTextFromPDF(file, summaryLength) {
    const fileReader = new FileReader();

    fileReader.onload = function () {
        const typedArray = new Uint8Array(this.result);

        pdfjsLib.getDocument(typedArray).promise.then((pdf) => {
            let textPromises = [];
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                textPromises.push(
                    pdf.getPage(pageNum).then((page) =>
                        page.getTextContent().then((content) => {
                            const text = content.items.map((item) => item.str).join('');
                            return text.replace(/\s+/g, ' ').trim();
                        })
                    )
                );
            }

            Promise.all(textPromises).then((pagesText) => {
                const fullText = pagesText.join('\n');
                document.getElementById('result-text').textContent = 'GPT 요약 중...';
                chrome.runtime.sendMessage({
                    type: 'gpt_summary',
                    text: fullText,
                    summaryLength,
                });
                // 이후 onMessage 리스너가 실시간으로 화면을 갱신
            });
        });
    };

    fileReader.readAsArrayBuffer(file);
}

// 백그라운드의 메세지 수신
let accumulated = '';
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received in sidePanel:', message);

    if (message.type === 'gpt_summary_stream') {
        if (message.error) {
            document.getElementById('result-text').textContent = message.result;
        } else if (message.done) {
            document.getElementById('result-text').textContent = message.result;
        } else {
            accumulated = message.accumulated;
            document.getElementById('result-text').textContent = accumulated;
        }
    }
});
