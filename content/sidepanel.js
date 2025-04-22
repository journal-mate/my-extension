
document.getElementById('summarizePage').onclick = async () => {
  const [tab] = await chrome.runtime.sendMessage({ type: "get_active_tab" });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => document.body.innerText.slice(0, 3000),
  }, async (results) => {
    const text = results[0].result;
    alert("요약 준비 완료: " + text.slice(0, 100) + "...");
  });
};

document.getElementById('pasteText').onclick = async () => {
  const customText = document.getElementById('customText').value;
  alert("입력된 텍스트 요약: " + customText.slice(0, 100));
};
