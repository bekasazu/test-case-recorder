importScripts('i18n.js', 'export.js');

const STORAGE_KEYS = {
  STEPS: 'recordedSteps',
  RECORDING: 'isRecording',
  HISTORY: 'testCaseHistory'
};

function generateId() {
  return `tc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function getHistory() {
  const result = await getStorage([STORAGE_KEYS.HISTORY]);
  return result[STORAGE_KEYS.HISTORY] || [];
}

async function saveHistory(history) {
  await setStorage({ [STORAGE_KEYS.HISTORY]: history });
}

async function saveToHistory(name, stepsOverride) {
  const steps = stepsOverride || (await getSteps());
  if (!steps.length) return { ok: false, reason: 'no_steps' };

  const history = await getHistory();
  const now = new Date().toISOString();
  const entry = {
    id: generateId(),
    name: name.trim() || I18N.historyUntitled(now),
    createdAt: now,
    updatedAt: now,
    startUrl: steps[0]?.pageUrl || null,
    stepCount: steps.length,
    steps: renumberSteps(JSON.parse(JSON.stringify(steps)))
  };

  history.unshift(entry);
  await saveHistory(history);
  return { ok: true, entry, history };
}

async function updateHistoryEntry(id, updates) {
  const history = await getHistory();
  const idx = history.findIndex((e) => e.id === id);
  if (idx === -1) return { ok: false, reason: 'not_found' };

  const entry = history[idx];
  if (updates.name !== undefined) entry.name = updates.name.trim() || entry.name;
  if (updates.steps !== undefined) {
    entry.steps = renumberSteps(JSON.parse(JSON.stringify(updates.steps)));
    entry.stepCount = entry.steps.length;
    entry.startUrl = entry.steps[0]?.pageUrl || entry.startUrl;
  }
  entry.updatedAt = new Date().toISOString();
  history[idx] = entry;
  await saveHistory(history);
  return { ok: true, entry, history };
}

async function deleteHistoryEntry(id) {
  const history = await getHistory();
  const filtered = history.filter((e) => e.id !== id);
  await saveHistory(filtered);
  return { ok: true, history: filtered };
}

async function loadHistoryEntry(id) {
  const history = await getHistory();
  const entry = history.find((e) => e.id === id);
  if (!entry) return { ok: false, reason: 'not_found' };

  const steps = renumberSteps(JSON.parse(JSON.stringify(entry.steps)));
  await saveSteps(steps);
  return { ok: true, entry, steps };
}

async function updateStep(stepNumber, updates) {
  const steps = await getSteps();
  const idx = steps.findIndex((s) => s.stepNumber === stepNumber);
  if (idx === -1) return { ok: false, reason: 'not_found' };

  const step = { ...steps[idx], ...updates };
  if (updates.recommendedSelector !== undefined && step.selector) {
    step.selector = {
      ...step.selector,
      recommendedSelector: updates.recommendedSelector,
      cssSelector: updates.recommendedSelector
    };
  }
  if (updates.selectorRecommended !== undefined && step.selector) {
    step.selector.recommendedSelector = updates.selectorRecommended;
    step.selector.cssSelector = updates.selectorRecommended;
  }
  steps[idx] = step;
  await saveSteps(steps);
  return { ok: true, steps };
}

async function replaceSteps(steps) {
  const normalized = renumberSteps(steps || []);
  await saveSteps(normalized);
  return { ok: true, steps: normalized };
}

async function importHistory(entries) {
  if (!Array.isArray(entries)) return { ok: false, reason: 'invalid_format' };
  const history = await getHistory();
  const imported = entries.map((e) => ({
    id: e.id || generateId(),
    name: e.name || I18N.historyUntitled(e.createdAt || new Date().toISOString()),
    createdAt: e.createdAt || new Date().toISOString(),
    updatedAt: e.updatedAt || new Date().toISOString(),
    startUrl: e.startUrl || e.steps?.[0]?.pageUrl || null,
    stepCount: (e.steps || []).length,
    steps: renumberSteps(e.steps || [])
  }));
  const merged = [...imported, ...history];
  await saveHistory(merged);
  return { ok: true, history: merged, importedCount: imported.length };
}

async function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

async function setStorage(data) {
  return chrome.storage.local.set(data);
}

async function getSteps() {
  const result = await getStorage([STORAGE_KEYS.STEPS]);
  return result[STORAGE_KEYS.STEPS] || [];
}

async function saveSteps(steps) {
  await setStorage({ [STORAGE_KEYS.STEPS]: steps });
}

function renumberSteps(steps) {
  return steps.map((step, index) => ({
    ...step,
    stepNumber: index + 1
  }));
}

async function startRecording(senderTabId) {
  await setStorage({
    [STORAGE_KEYS.RECORDING]: true,
    [STORAGE_KEYS.STEPS]: []
  });

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'RECORDING_STATE',
          isRecording: true
        });
      } catch {
        /* content script not injected */
      }
    }
  }

  if (senderTabId) {
    try {
      await chrome.sidePanel.open({ tabId: senderTabId });
    } catch {
      /* side panel may be unavailable */
    }
  }
}

async function stopRecording() {
  await setStorage({ [STORAGE_KEYS.RECORDING]: false });

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'RECORDING_STATE',
          isRecording: false
        });
      } catch {
        /* ignore */
      }
    }
  }
}

async function addStep(step) {
  const { [STORAGE_KEYS.RECORDING]: isRecording } = await getStorage([STORAGE_KEYS.RECORDING]);
  if (!isRecording) return { ok: false, reason: 'not_recording' };

  const steps = await getSteps();
  step.stepNumber = steps.length + 1;
  steps.push(step);
  await saveSteps(steps);
  return { ok: true, steps };
}

async function addNavigationStep(url, title) {
  const { [STORAGE_KEYS.RECORDING]: isRecording } = await getStorage([STORAGE_KEYS.RECORDING]);
  if (!isRecording || !url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;

  const steps = await getSteps();
  const last = steps[steps.length - 1];
  if (last?.pageUrl === url) return;
  if (last?.action === 'Navigate' && last.value === url) return;

  const step = {
    stepNumber: steps.length + 1,
    timestamp: new Date().toISOString(),
    action: 'Navigate',
    description: I18N.descNavigate(url),
    value: url,
    selector: {
      id: null,
      name: null,
      cssSelector: 'body',
      fullCssPath: 'body',
      xpath: '/html/body',
      relativeXpath: '//body',
      dataAttributes: {},
      ariaLabel: null,
      ariaRole: null,
      placeholder: null,
      type: null,
      tagName: 'BODY',
      textContent: '',
      href: null,
      selectorReliability: 1,
      recommendedSelector: 'body'
    },
    pageUrl: url,
    pageTitle: title || url,
    isNavigation: true,
    screenshotNote: I18N.screenshotNavigate
  };

  steps.push(step);
  await saveSteps(steps);
}

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.url) {
    await addNavigationStep(tab.url, tab.title);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'START_RECORDING': {
          await startRecording(sender.tab?.id);
          sendResponse({ ok: true, isRecording: true });
          break;
        }
        case 'STOP_RECORDING': {
          await stopRecording();
          sendResponse({ ok: true, isRecording: false });
          break;
        }
        case 'ADD_STEP': {
          const result = await addStep(message.step);
          sendResponse(result);
          break;
        }
        case 'GET_STEPS': {
          const steps = await getSteps();
          const { [STORAGE_KEYS.RECORDING]: isRecording } = await getStorage([STORAGE_KEYS.RECORDING]);
          sendResponse({ steps, isRecording: !!isRecording });
          break;
        }
        case 'CLEAR_STEPS': {
          await saveSteps([]);
          sendResponse({ ok: true, steps: [] });
          break;
        }
        case 'DELETE_STEP': {
          let steps = await getSteps();
          steps = steps.filter((s) => s.stepNumber !== message.stepNumber);
          steps = renumberSteps(steps);
          await saveSteps(steps);
          sendResponse({ ok: true, steps });
          break;
        }
        case 'REORDER_STEPS': {
          const steps = renumberSteps(message.steps || []);
          await saveSteps(steps);
          sendResponse({ ok: true, steps });
          break;
        }
        case 'UPDATE_STEP': {
          const result = await updateStep(message.stepNumber, message.updates || {});
          sendResponse(result);
          break;
        }
        case 'REPLACE_STEPS': {
          const result = await replaceSteps(message.steps);
          sendResponse(result);
          break;
        }
        case 'SAVE_TO_HISTORY': {
          const steps = message.steps || (await getSteps());
          const result = await saveToHistory(message.name || '', steps);
          sendResponse(result);
          break;
        }
        case 'GET_HISTORY': {
          const history = await getHistory();
          sendResponse({
            ok: true,
            history: history.map(({ id, name, createdAt, updatedAt, startUrl, stepCount }) => ({
              id,
              name,
              createdAt,
              updatedAt,
              startUrl,
              stepCount
            }))
          });
          break;
        }
        case 'GET_HISTORY_ENTRY': {
          const history = await getHistory();
          const entry = history.find((e) => e.id === message.id);
          sendResponse(entry ? { ok: true, entry } : { ok: false, reason: 'not_found' });
          break;
        }
        case 'UPDATE_HISTORY_ENTRY': {
          const result = await updateHistoryEntry(message.id, {
            name: message.name,
            steps: message.steps
          });
          sendResponse(result);
          break;
        }
        case 'DELETE_HISTORY_ENTRY': {
          const result = await deleteHistoryEntry(message.id);
          sendResponse(result);
          break;
        }
        case 'LOAD_HISTORY_ENTRY': {
          const result = await loadHistoryEntry(message.id);
          sendResponse(result);
          break;
        }
        case 'IMPORT_HISTORY': {
          const result = await importHistory(message.entries);
          sendResponse(result);
          break;
        }
        case 'EXPORT_HISTORY': {
          const history = await getHistory();
          sendResponse({ ok: true, history });
          break;
        }
        case 'EXPORT_STEPS': {
          const steps = message.steps || (await getSteps());
          const format = message.format || 'text';
          const content = exportSteps(steps, format);
          sendResponse({ ok: true, content, format, totalSteps: steps.length });
          break;
        }
        case 'GET_STATUS': {
          const steps = await getSteps();
          const { [STORAGE_KEYS.RECORDING]: isRecording } = await getStorage([STORAGE_KEYS.RECORDING]);
          sendResponse({
            isRecording: !!isRecording,
            stepCount: steps.length,
            steps
          });
          break;
        }
        default:
          sendResponse({ ok: false, error: 'unknown_message' });
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  })();
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
});
