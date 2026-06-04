const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const stepCounter = document.getElementById('stepCounter');
const stepsList = document.getElementById('stepsList');
const exportPreview = document.getElementById('exportPreview');
const exportFormat = document.getElementById('exportFormat');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const btnClear = document.getElementById('btnClear');
const btnCopyExport = document.getElementById('btnCopyExport');
const btnSaveHistory = document.getElementById('btnSaveHistory');

const tabBtnRecord = document.getElementById('tabBtnRecord');
const tabBtnHistory = document.getElementById('tabBtnHistory');
const tabRecord = document.getElementById('tabRecord');
const tabHistory = document.getElementById('tabHistory');

const historyList = document.getElementById('historyList');
const historyListView = document.getElementById('historyListView');
const historyDetailView = document.getElementById('historyDetailView');
const historyNameInput = document.getElementById('historyNameInput');
const historyStepsList = document.getElementById('historyStepsList');
const historyExportPreview = document.getElementById('historyExportPreview');
const historyExportFormat = document.getElementById('historyExportFormat');
const historyStepCounter = document.getElementById('historyStepCounter');
const btnBackHistory = document.getElementById('btnBackHistory');
const btnSaveHistoryName = document.getElementById('btnSaveHistoryName');
const btnLoadToRecorder = document.getElementById('btnLoadToRecorder');
const btnCopyHistoryExport = document.getElementById('btnCopyHistoryExport');
const btnExportAllHistory = document.getElementById('btnExportAllHistory');
const btnImportHistory = document.getElementById('btnImportHistory');
const historyFileInput = document.getElementById('historyFileInput');

let currentSteps = [];
let historySteps = [];
let activeHistoryId = null;
let draggedIndex = null;

function sendMessage(type, payload = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...payload }, resolve);
  });
}

function reliabilityStars(score) {
  const filled = Math.min(5, Math.max(1, Math.round(score || 1)));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

function shortUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname + u.pathname.slice(0, 40);
  } catch {
    return url || '';
  }
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('ka-GE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

function actionIcon(action) {
  switch (action) {
    case 'Click': return '▶';
    case 'Type': return '✏';
    case 'Navigate': return '↗';
    case 'Select': return '▼';
    case 'Submit': return '⏎';
    case 'Key': return '⌨';
    default: return '•';
  }
}

function actionClass(action) {
  if (action === 'Navigate') return 'navigate';
  if (action === 'Type') return 'type';
  return '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStepEditForm(step) {
  const sel = step.selector?.recommendedSelector || '';
  const actions = ['Click', 'Type', 'Select', 'Navigate', 'Submit', 'Key'];
  const actionOptions = actions
    .map((a) => `<option value="${a}" ${step.action === a ? 'selected' : ''}>${I18N.actionLabel(a)}</option>`)
    .join('');

  return `
    <form class="step-edit-form">
      <label>${I18N.fieldDescription}
        <input type="text" name="description" value="${escapeHtml(step.description || '')}">
      </label>
      <label>${I18N.fieldAction}
        <select name="action">${actionOptions}</select>
      </label>
      <label>${I18N.fieldValue}
        <input type="text" name="value" value="${escapeHtml(step.value || '')}">
      </label>
      <label>${I18N.fieldSelector}
        <input type="text" name="selector" value="${escapeHtml(sel)}">
      </label>
      <label>${I18N.fieldPageUrl}
        <input type="text" name="pageUrl" value="${escapeHtml(step.pageUrl || '')}">
      </label>
      <div class="step-edit-actions">
        <button type="submit" class="btn btn-save btn-sm">${I18N.saveStep}</button>
        <button type="button" class="btn btn-secondary btn-sm btn-cancel-edit">${I18N.cancelEdit}</button>
      </div>
    </form>
  `;
}

function applyStepEdit(step, formData) {
  const updated = { ...step };
  updated.description = formData.get('description');
  updated.action = formData.get('action');
  updated.value = formData.get('value') || null;
  updated.pageUrl = formData.get('pageUrl') || updated.pageUrl;
  const selectorVal = formData.get('selector');
  if (updated.selector) {
    updated.selector = {
      ...updated.selector,
      recommendedSelector: selectorVal,
      cssSelector: selectorVal
    };
  }
  return updated;
}

function renderStepsList(steps, container, options) {
  const { editable, draggable, onStepsChange, emptyText } = options;
  container.innerHTML = '';

  if (!steps.length) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.textContent = emptyText || I18N.emptySteps;
    container.appendChild(li);
    return;
  }

  steps.forEach((step, index) => {
    const li = document.createElement('li');
    li.className = 'step-item';
    li.draggable = !!draggable;
    li.dataset.index = String(index);
    li.dataset.stepNumber = String(step.stepNumber);

    const sel = step.selector?.recommendedSelector || '—';
    const stars = reliabilityStars(step.selector?.selectorReliability);

    li.innerHTML = `
      <div class="step-header">
        ${draggable ? `<span class="step-drag-handle" title="${I18N.dragToReorder}">⋮⋮</span>` : ''}
        <div class="step-body">
          <div class="step-meta">
            <span class="step-number">[${step.stepNumber}]</span>
            <span class="step-action ${actionClass(step.action)}">${actionIcon(step.action)} ${I18N.actionLabel(step.action).toUpperCase()}</span>
            <span class="step-stars" title="${I18N.reliability}">${stars}</span>
          </div>
          <div class="step-desc">${escapeHtml(step.description)}</div>
          ${step.action !== 'Navigate' ? `<div class="step-selector">${I18N.selector}: ${escapeHtml(sel)}</div>` : ''}
          ${step.value && step.action !== 'Navigate' ? `<div class="step-value">${I18N.value}: "${escapeHtml(step.value)}"</div>` : ''}
          <div class="step-url">URL: ${escapeHtml(shortUrl(step.pageUrl))}</div>
        </div>
        <div class="step-actions">
          ${editable ? `<button type="button" class="step-edit" title="${I18N.editStep}">✎</button>` : ''}
          <button type="button" class="step-delete" title="${I18N.deleteStep}" data-step="${step.stepNumber}">×</button>
        </div>
      </div>
      <div class="step-details">
        <pre>${escapeHtml(JSON.stringify(step.selector, null, 2))}</pre>
      </div>
      <div class="step-edit-panel hidden"></div>
    `;

    li.querySelector('.step-body').addEventListener('click', (e) => {
      if (e.target.closest('.step-delete, .step-edit, .step-edit-form')) return;
      if (li.classList.contains('editing')) return;
      li.classList.toggle('expanded');
    });

    const editBtn = li.querySelector('.step-edit');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const panel = li.querySelector('.step-edit-panel');
        const isEditing = li.classList.contains('editing');
        container.querySelectorAll('.step-item.editing').forEach((el) => {
          el.classList.remove('editing');
          const p = el.querySelector('.step-edit-panel');
          if (p) {
            p.classList.add('hidden');
            p.innerHTML = '';
          }
        });
        if (isEditing) {
          li.classList.remove('editing');
          panel.classList.add('hidden');
          panel.innerHTML = '';
          return;
        }
        li.classList.add('editing', 'expanded');
        panel.classList.remove('hidden');
        panel.innerHTML = buildStepEditForm(step);
        panel.querySelector('.btn-cancel-edit')?.addEventListener('click', () => {
          li.classList.remove('editing');
          panel.classList.add('hidden');
          panel.innerHTML = '';
        });
        panel.querySelector('form')?.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const fd = new FormData(ev.target);
          const updated = applyStepEdit(step, fd);
          const newSteps = steps.map((s) =>
            s.stepNumber === step.stepNumber ? updated : s
          );
          if (onStepsChange) await onStepsChange(newSteps);
        });
      });
    }

    li.querySelector('.step-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      const newSteps = steps
        .filter((s) => s.stepNumber !== step.stepNumber)
        .map((s, i) => ({ ...s, stepNumber: i + 1 }));
      if (onStepsChange) await onStepsChange(newSteps);
    });

    if (draggable) {
      li.addEventListener('dragstart', (e) => {
        draggedIndex = index;
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        draggedIndex = null;
        container.querySelectorAll('.step-item.drag-over').forEach((el) => el.classList.remove('drag-over'));
      });
      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        li.classList.add('drag-over');
      });
      li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
      li.addEventListener('drop', async (e) => {
        e.preventDefault();
        li.classList.remove('drag-over');
        const dropIndex = index;
        if (draggedIndex === null || draggedIndex === dropIndex) return;
        const reordered = [...steps];
        const [moved] = reordered.splice(draggedIndex, 1);
        reordered.splice(dropIndex, 0, moved);
        const renumbered = reordered.map((s, i) => ({ ...s, stepNumber: i + 1 }));
        if (onStepsChange) await onStepsChange(renumbered);
      });
    }

    container.appendChild(li);
  });
}

function renderCurrentSteps(steps) {
  currentSteps = steps;
  renderStepsList(steps, stepsList, {
    editable: true,
    draggable: true,
    emptyText: I18N.emptySteps,
    onStepsChange: async (newSteps) => {
      const res = await sendMessage('REPLACE_STEPS', { steps: newSteps });
      if (res?.steps) {
        renderCurrentSteps(res.steps);
        updatePreview(res.steps);
        updateToolbar(res.steps.length);
      }
    }
  });
}

function updatePreview(steps) {
  if (!exportPreview) return;
  const codeEl = exportPreview.querySelector('code');
  if (!codeEl) return;
  const format = exportFormat?.value || 'text';
  codeEl.textContent = typeof exportSteps === 'function'
    ? exportSteps(steps || [], format)
    : I18N.exportPreviewPlaceholder;
}

function updateHistoryPreview(steps) {
  const format = historyExportFormat.value;
  historyExportPreview.querySelector('code').textContent = exportSteps(steps, format);
}

function updateToolbar(count) {
  stepCounter.textContent = I18N.stepsCount(count);
}

function updateUI({ isRecording, steps }) {
  const count = steps?.length || 0;
  if (isRecording) {
    statusDot.classList.add('recording');
    statusText.textContent = I18N.statusRecording;
    btnStart.disabled = true;
    btnStop.disabled = false;
    stepCounter.textContent = I18N.stepsRecording(count);
  } else {
    statusDot.classList.remove('recording');
    statusText.textContent = I18N.statusIdle;
    btnStart.disabled = false;
    btnStop.disabled = true;
    stepCounter.textContent = I18N.stepsCount(count);
  }
  renderCurrentSteps(steps || []);
  updatePreview(steps || []);
}

async function refresh() {
  try {
    const res = await sendMessage('GET_STATUS');
    if (res) {
      updateUI({ isRecording: res.isRecording, steps: res.steps || [] });
    } else {
      updateUI({ isRecording: false, steps: [] });
    }
  } catch (err) {
    console.error('Panel refresh failed:', err);
    updateUI({ isRecording: false, steps: [] });
  }
}

async function promptSaveToHistory(steps) {
  const name = prompt(I18N.confirmSaveHistoryName);
  if (name === null) return null;
  return sendMessage('SAVE_TO_HISTORY', { name, steps });
}

async function renderHistoryList() {
  const res = await sendMessage('GET_HISTORY');
  historyList.innerHTML = '';

  if (!res?.history?.length) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.textContent = I18N.historyEmpty;
    historyList.appendChild(li);
    return;
  }

  res.history.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <div class="history-item-body">
        <div class="history-item-name">${escapeHtml(entry.name)}</div>
        <div class="history-item-meta">
          <span>${I18N.historySteps(entry.stepCount)}</span>
          <span>${formatDate(entry.updatedAt || entry.createdAt)}</span>
        </div>
        <div class="history-item-url">${escapeHtml(shortUrl(entry.startUrl || ''))}</div>
      </div>
      <div class="history-item-actions">
        <button type="button" class="btn btn-secondary btn-sm btn-view" data-id="${entry.id}">${I18N.historyView}</button>
        <button type="button" class="btn btn-start btn-sm btn-load" data-id="${entry.id}">${I18N.historyLoad}</button>
        <button type="button" class="btn btn-clear btn-sm btn-del" data-id="${entry.id}">×</button>
      </div>
    `;

    li.querySelector('.btn-view').addEventListener('click', () => openHistoryDetail(entry.id));
    li.querySelector('.btn-load').addEventListener('click', async () => {
      await sendMessage('LOAD_HISTORY_ENTRY', { id: entry.id });
      switchTab('record');
      await refresh();
    });
    li.querySelector('.btn-del').addEventListener('click', async () => {
      if (!confirm(I18N.confirmDeleteHistory)) return;
      await sendMessage('DELETE_HISTORY_ENTRY', { id: entry.id });
      await renderHistoryList();
    });

    historyList.appendChild(li);
  });
}

async function openHistoryDetail(id) {
  const res = await sendMessage('GET_HISTORY_ENTRY', { id });
  if (!res?.entry) return;

  activeHistoryId = id;
  historySteps = res.entry.steps || [];
  historyNameInput.value = res.entry.name;
  historyStepCounter.textContent = I18N.stepsCount(historySteps.length);

  historyListView.classList.add('hidden');
  historyDetailView.classList.remove('hidden');

  renderStepsList(historySteps, historyStepsList, {
    editable: true,
    draggable: true,
    emptyText: I18N.emptySteps,
    onStepsChange: async (newSteps) => {
      historySteps = newSteps;
      historyStepCounter.textContent = I18N.stepsCount(newSteps.length);
      updateHistoryPreview(newSteps);
      await sendMessage('UPDATE_HISTORY_ENTRY', { id: activeHistoryId, steps: newSteps });
    }
  });
  updateHistoryPreview(historySteps);
}

function closeHistoryDetail() {
  activeHistoryId = null;
  historySteps = [];
  historyDetailView.classList.add('hidden');
  historyListView.classList.remove('hidden');
}

function switchTab(tab) {
  const isRecord = tab === 'record';
  tabBtnRecord.classList.toggle('active', isRecord);
  tabBtnHistory.classList.toggle('active', !isRecord);
  tabRecord.classList.toggle('hidden', !isRecord);
  tabHistory.classList.toggle('hidden', isRecord);
  if (!isRecord) {
    closeHistoryDetail();
    renderHistoryList();
  }
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

tabBtnRecord.addEventListener('click', () => switchTab('record'));
tabBtnHistory.addEventListener('click', () => switchTab('history'));

btnStart.addEventListener('click', async () => {
  await sendMessage('START_RECORDING');
  await refresh();
});

btnStop.addEventListener('click', async () => {
  const status = await sendMessage('GET_STATUS');
  await sendMessage('STOP_RECORDING');
  await refresh();
  if (status?.steps?.length) {
    const save = confirm(I18N.promptSaveOnStop);
    if (save) {
      const res = await promptSaveToHistory(status.steps);
      if (res?.ok) {
        btnSaveHistory.textContent = I18N.historySaved;
        setTimeout(() => { btnSaveHistory.textContent = I18N.btnSaveHistory; }, 2000);
      }
    }
  }
});

btnClear.addEventListener('click', async () => {
  if (!confirm(I18N.confirmClear)) return;
  await sendMessage('CLEAR_STEPS');
  await refresh();
});

btnSaveHistory.addEventListener('click', async () => {
  if (!currentSteps.length) return;
  const res = await promptSaveToHistory(currentSteps);
  if (res?.ok) {
    btnSaveHistory.textContent = I18N.historySaved;
    setTimeout(() => { btnSaveHistory.textContent = I18N.btnSaveHistory; }, 2000);
  }
});

exportFormat.addEventListener('change', () => updatePreview(currentSteps));

btnCopyExport.addEventListener('click', async () => {
  await navigator.clipboard.writeText(exportSteps(currentSteps, exportFormat.value));
  btnCopyExport.textContent = I18N.btnCopied;
  setTimeout(() => { btnCopyExport.textContent = I18N.btnCopyExport; }, 1500);
});

btnBackHistory.addEventListener('click', () => {
  closeHistoryDetail();
  renderHistoryList();
});

btnSaveHistoryName.addEventListener('click', async () => {
  if (!activeHistoryId) return;
  const res = await sendMessage('UPDATE_HISTORY_ENTRY', {
    id: activeHistoryId,
    name: historyNameInput.value,
    steps: historySteps
  });
  if (res?.ok) {
    btnSaveHistoryName.textContent = I18N.historyUpdated;
    setTimeout(() => { btnSaveHistoryName.textContent = I18N.historySaveChanges; }, 1500);
  }
});

btnLoadToRecorder.addEventListener('click', async () => {
  if (!activeHistoryId) return;
  await sendMessage('LOAD_HISTORY_ENTRY', { id: activeHistoryId });
  switchTab('record');
  await refresh();
});

historyExportFormat.addEventListener('change', () => updateHistoryPreview(historySteps));

btnCopyHistoryExport.addEventListener('click', async () => {
  await navigator.clipboard.writeText(exportSteps(historySteps, historyExportFormat.value));
  btnCopyHistoryExport.textContent = I18N.btnCopied;
  setTimeout(() => { btnCopyHistoryExport.textContent = I18N.btnCopyExport; }, 1500);
});

btnExportAllHistory.addEventListener('click', async () => {
  const res = await sendMessage('EXPORT_HISTORY');
  if (res?.history) downloadJson(res.history, `test-case-history-${Date.now()}.json`);
});

btnImportHistory.addEventListener('click', () => historyFileInput.click());

historyFileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const entries = Array.isArray(data) ? data : data.history || [data];
    const res = await sendMessage('IMPORT_HISTORY', { entries });
    if (res?.ok) {
      alert(I18N.historyImported(res.importedCount));
      await renderHistoryList();
    }
  } catch {
    alert('Invalid JSON file');
  }
  historyFileInput.value = '';
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.recordedSteps || changes.isRecording) {
    refresh();
  }
  if (changes.testCaseHistory && tabHistory && !tabHistory.classList.contains('hidden')) {
    if (historyListView && !historyListView.classList.contains('hidden')) {
      renderHistoryList();
    }
  }
});

updateUI({ isRecording: false, steps: [] });
refresh();
