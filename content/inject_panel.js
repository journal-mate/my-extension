
const existing = document.getElementById('gpt_side_panel');
if (existing) existing.remove();

const panel = document.createElement('div');
panel.id = 'gpt_side_panel';
panel.innerHTML = `
  <style>
    #gpt_side_panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100%;
      background: #fff;
      box-shadow: -2px 0 10px rgba(0,0,0,0.15);
      z-index: 99998;
      font-family: 'Segoe UI', sans-serif;
      padding: 24px;
      box-sizing: border-box;
    }

    .logo {
      font-size: 24px;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }

    .section {
      margin-bottom: 20px;
    }

    .section-title {
      font-weight: bold;
      margin-bottom: 8px;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    input[type="text"], input[type="file"] {
      width: 100%;
      padding: 10px;
      border: 1px solid #aaa;
      border-radius: 4px;
      margin-top: 8px;
    }

    button {
      width: 100%;
      margin-top: 16px;
      padding: 12px;
      background-color: #444;
      color: white;
      border: none;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }

    .output-section {
      margin-top: 30px;
    }

    textarea {
      width: 100%;
      height: 180px;
      margin-top: 12px;
      padding: 12px;
      border: 1px solid #ccc;
      border-radius: 6px;
      resize: vertical;
    }
  </style>

  <div class="logo">
    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Check_mark_23x20_01.svg/32px-Check_mark_23x20_01.svg.png" width="24"/>
    <span>JournalMate</span>
  </div>

  <div class="section">
    <div class="section-title">▼ 텍스트 선택</div>
    <div class="radio-group">
      <label class="radio-option">
        <input type="radio" name="source" value="url" checked />
        현재 웹페이지 사용
      </label>
      <input type="text" placeholder="URL 페이지를 복사해서 넣어주세요" />
      
      <label class="radio-option">
        <input type="radio" name="source" value="pdf" />
        PDF 업로드
      </label>
      <input type="file" />
    </div>
    <button>해당 텍스트 요약 버튼</button>
  </div>

  <div class="output-section">
    <div class="section-title">▼ 결과 출력 [번역]</div>
    <textarea readonly></textarea>
  </div>
`;

document.body.appendChild(panel);
