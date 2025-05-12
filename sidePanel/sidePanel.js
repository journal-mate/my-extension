document.addEventListener('DOMContentLoaded', () => {
    const btn1 = document.getElementById('btn1');
    const btn2 = document.getElementById('btn2');
    const btn3 = document.getElementById('btn3');
    const t1 = document.getElementById('t1');
    const t2 = document.getElementById('t2');
    const resultText = document.getElementById('result-text');

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

    // 요약 버튼 클릭 시 입력값 검사
    btn3.addEventListener('click', () => {
        const isSimple = btn1.classList.contains('active-btn');
        const urlInputs = isSimple
            ? t1.querySelectorAll('input[type="text"]')
            : t2.querySelectorAll('input[type="text"]');
        const fileInputs = isSimple
            ? t1.querySelectorAll('input[type="file"]')
            : t2.querySelectorAll('input[type="file"]');

        const hasURL = Array.from(urlInputs).some((input) => input.value.trim() !== '');
        const hasFile = Array.from(fileInputs).some((input) => input.files.length > 0);

        if (!hasURL && !hasFile) {
            const mode = isSimple
                ? '단순 요약 불가: URL 또는 파일을 입력하세요.'
                : '비교 요약 불가: URL 또는 파일을 입력하세요.';
            showToast(mode);
        } else {
            resultText.textContent = '요약 진행 중...';
        }
    });

    // 초기 상태 설정 (단순 요약 버튼 활성화)
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
