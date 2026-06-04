const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const stepCounter = document.getElementById('stepCounter');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnExport = document.getElementById('btnExport');
const btnClear = document.getElementById('btnClear');
const btnOpenPanel = document.getElementById('btnOpenPanel');
const btnSaveHistory = document.getElementById('btnSaveHistory');
const exportFormat = document.getElementById('exportFormat');

function sendMessage(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, resolve);
  });
}

function updateUI({ isRecording, stepCount }) {
  if (isRecording) {
    statusDot.classList.add('recording');
    statusText.textContent = I18N.statusRecording;
    stepCounter.textContent = I18N.stepsRecording(stepCount);
    document.getElementById('statusIndicator').title = I18N.statusRecording;
    btnStart.disabled = true;
    btnStop.disabled = false;
  } else {
    statusDot.classList.remove('recording');
    statusText.textContent = I18N.statusIdle;
    stepCounter.textContent = I18N.stepsRecorded(stepCount);
    document.getElementById('statusIndicator').title = I18N.statusNotRecording;
    btnStart.disabled = false;
    btnStop.disabled = true;
  }
}

async function refreshStatus() {
  const res = await sendMessage('GET_STATUS');
  if (res) {
    updateUI({
      isRecording: res.isRecording,
      stepCount: res.stepCount || 0
    });
  }
}

btnStart.addEventListener('click', async () => {
  await sendMessage('START_RECORDING');
  await refreshStatus();
});

btnStop.addEventListener('click', async () => {
  const status = await sendMessage('GET_STATUS');
  await sendMessage('STOP_RECORDING');
  await refreshStatus();
  if (status?.steps?.length && confirm(I18N.promptSaveOnStop)) {
    const name = prompt(I18N.confirmSaveHistoryName);
    if (name !== null) {
      await sendMessage('SAVE_TO_HISTORY', { name, steps: status.steps });
    }
  }
});

btnSaveHistory.addEventListener('click', async () => {
  const status = await sendMessage('GET_STATUS');
  if (!status?.steps?.length) return;
  const name = prompt(I18N.confirmSaveHistoryName);
  if (name === null) return;
  const res = await sendMessage('SAVE_TO_HISTORY', { name, steps: status.steps });
  if (res?.ok) {
    btnSaveHistory.textContent = I18N.historySaved;
    setTimeout(() => { btnSaveHistory.textContent = '💾 ისტორიაში'; }, 2000);
  }
});

btnClear.addEventListener('click', async () => {
  if (!confirm(I18N.confirmClear)) return;
  await sendMessage('CLEAR_STEPS');
  await refreshStatus();
});

btnOpenPanel.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {
      chrome.runtime.openOptionsPage?.();
    }
  }
});

btnExport.addEventListener('click', async () => {
  const format = exportFormat.value;
  const res = await sendMessage('EXPORT_STEPS', { format });
  if (!res?.content) return;

  const extensions = {
    text: 'txt',
    json: 'json',
    playwright: 'spec.ts',
    cypress: 'cy.js',
    selenium: 'py',
    'selenium-csharp': 'cs'
  };

  const blob = new Blob([res.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const ext = extensions[format] || 'txt';
  const filename = `test-case-${Date.now()}.${ext}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.recordedSteps || changes.isRecording) {
    refreshStatus();
  }
});

refreshStatus();
