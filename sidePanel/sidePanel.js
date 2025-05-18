
const pdfjsLib = window['pdfjsLib'];
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

document.addEventListener('DOMContentLoaded', () => {
    const btn1 = document.getElementById('btn1'); // 단순 요약
    const btn2 = document.getElementById('btn2'); // 비교 요약
    const btn3 = document.getElementById('btn3'); // 요약 실행
    const t1 = document.getElementById('t1'); // 단순 입력
    const t2 = document.getElementById('t2'); // 비교 입력
    const resultText = document.getElementById('result-text');
    const toggleButtons = document.querySelectorAll('.summary-toggle');

    btn1.addEventListener('click', () => {
        t1.style.display = 'block';
        t2.style.display = 'none';
        activate(btn1, btn2);
    });

    btn2.addEventListener('click', () => {
        t1.style.display = 'none';
        t2.style.display = 'block';
        activate(btn2, btn1);
    });

    toggleButtons.forEach((button) => {
        button.addEventListener('click', () => {
            toggleButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    btn3.addEventListener('click', () => {
        console.log('[요약 버튼 클릭됨]');

        const isSimple = btn1.classList.contains('active-btn');
        const urlInputs = isSimple
            ? t1.querySelectorAll('input[type="text"]')
            : t2.querySelectorAll('input[type="text"]');
        const fileInputs = isSimple
            ? t1.querySelectorAll('input[type="file"]')
            : t2.querySelectorAll('input[type="file"]');

        if (!urlInputs || !fileInputs) {
            console.error('t1 또는 t2 요소를 찾을 수 없습니다.');
            return;
        }

        const hasURL = Array.from(urlInputs).some((input) => input.value.trim() !== '');
        const files = Array.from(fileInputs)
            .map((input) => input.files[0])
            .filter((file) => file);

        const selectedToggle = document.querySelector('.summary-toggle.active');
        const summaryLength = selectedToggle ? selectedToggle.dataset.value : 'normal';

        if (!hasURL && files.length === 0) {
            const mode = isSimple
                ? '단순 요약 불가: URL 또는 파일을 입력하세요.'
                : '비교 요약 불가: URL 또는 파일을 입력하세요.';
            showToast(mode);
            return;
        }

        const pdfFile = files.find((file) => file.type === 'application/pdf');
        if (pdfFile) {
            extractTextFromPDF(pdfFile, summaryLength); // pass summaryLength
        } else if (files.length > 0) {
            showToast('PDF 파일만 지원합니다.');
        } else {
            resultText.textContent = `요약 진행 중... (선택: ${summaryLength})`;
        }
    });

    activate(btn1, btn2);
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
                document.getElementById('result-text').textContent = "GPT 요약 중...";

                requestSummaryViaBackground(fullText, summaryLength)
                    .then(result => {
                        document.getElementById('result-text').textContent = result;
                    })
                    .catch(err => {
                        console.error('GPT 요약 실패:', err);
                        document.getElementById('result-text').textContent = "요약 중 오류 발생";
                    });
            });
        });
    };

    fileReader.readAsArrayBuffer(file);
}

function requestSummaryViaBackground(text, summaryLength) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                type: "gpt_summary",
                text,
                summaryLength
            },
            (response) => {
                if (chrome.runtime.lastError || !response) {
                    reject(chrome.runtime.lastError || new Error("No response"));
                } else {
                    resolve(response.result);
                }
            }
        );
    });
}
