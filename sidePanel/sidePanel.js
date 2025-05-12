const pdfjsLib = window['pdfjsLib'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';

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

    // 요약 버튼 클릭 시 입력값 검사
    btn3.addEventListener('click', () => {
        console.log('[요약 버튼 클릭됨]');

        const isSimple = btn1.classList.contains('active-btn');
        console.log(`[현재 모드]: ${isSimple ? '단순 요약' : '비교 요약'}`);

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

        console.log(`[URL 입력 필드 개수]: ${urlInputs.length}`);
        console.log(`[파일 입력 필드 개수]: ${fileInputs.length}`);

        const hasURL = Array.from(urlInputs).some((input) => input.value.trim() !== '');
        const files = Array.from(fileInputs)
            .map((input) => input.files[0])
            .filter((file) => file);

        console.log(`[URL 입력 여부]: ${hasURL}`);
        console.log(`[업로드된 파일 수]: ${files.length}`);

        const selectedToggle = document.querySelector('.summary-toggle.active');
        const summaryLength = selectedToggle ? selectedToggle.dataset.value : 'normal';
        console.log(`[선택된 요약 정도]: ${summaryLength}`);

        if (!hasURL && files.length === 0) {
            const mode = isSimple
                ? '단순 요약 불가: URL 또는 파일을 입력하세요.'
                : '비교 요약 불가: URL 또는 파일을 입력하세요.';
            console.warn(mode);
            showToast(mode);
            return;
        }

        // 파일 검증
        const pdfFile = files.find((file) => file.type === 'application/pdf');
        if (pdfFile) {
            console.log('[PDF 파일 발견] 추출 시작:', pdfFile.name);
            extractTextFromPDF(pdfFile); // PDF 내용 추출 함수 호출
        } else if (files.length > 0) {
            console.warn('[토스트] PDF 파일만 지원합니다.');
            showToast('PDF 파일만 지원합니다.');
        } else {
            console.log(`[요약 진행 중] 요약 길이 설정: ${summaryLength}`);
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
    }, 2000); // 2초 후 사라짐
}

// PDF.js 라이브러리로 pdf 처리
function extractTextFromPDF(file) {
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
                document.getElementById('result-text').textContent = fullText;
            });
        });
    };

    fileReader.readAsArrayBuffer(file);
}
