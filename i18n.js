/**
 * ქართული ინტერფეისი — Test Case Recorder
 */
var I18N = {
  extensionName: 'ტესტ-ქეისის ჩამწერი',
  extensionDescription:
    'ჩაწერს მომხმარებლის ქმედებებს და ქმნის სტრუქტურირებულ ტესტ-ქეისებს QA ავტომატიზაციისთვის.',

  statusIdle: 'უმოქმედო',
  statusRecording: 'ჩაწერა',
  statusNotRecording: 'ჩაწერა არ მიმდინარეობს',

  stepsRecorded: (n) => `${n} ნაბიჯი ჩაწერილია`,
  stepsRecording: (n) => `ჩაწერა: ${n} ნაბიჯი`,
  stepsCount: (n) => `${n} ნაბიჯი`,

  btnStart: '▶ ჩაწერის დაწყება',
  btnStop: '⏹ ჩაწერის გაჩერება',
  btnStartShort: '▶ დაწყება',
  btnStopShort: '⏹ გაჩერება',
  btnClear: 'გასუფთავება',
  btnDownload: 'ჩამოტვირთვა',
  btnOpenPanel: 'პანელის გახსნა',
  btnCopyExport: 'ექსპორტის კოპირება',
  btnCopied: 'დაკოპირდა!',

  exportLabel: 'ექსპორტი',
  exportFormatLabel: 'ექსპორტის ფორმატი',
  exportPlainText: 'ჩვეულებრივი ტექსტი',
  exportJson: 'JSON',
  exportPlaywright: 'Playwright (TypeScript)',
  exportCypress: 'Cypress',
  exportSelenium: 'Selenium (Python)',
  exportSeleniumCsharp: 'Selenium (C#)',
  exportAsPlainText: 'ექსპორტი — ჩვეულებრივი ტექსტი',
  exportAsJson: 'ექსპორტი — JSON',
  exportAsPlaywright: 'ექსპორტი — Playwright (TypeScript)',
  exportAsCypress: 'ექსპორტი — Cypress',
  exportAsSelenium: 'ექსპორტი — Selenium (Python)',
  exportAsSeleniumCsharp: 'ექსპორტი — Selenium (C#)',

  recordedSteps: 'ჩაწერილი ნაბიჯები',
  exportPreview: 'ექსპორტის გადახედვა',
  exportPreviewPlaceholder: '// ექსპორტის გადახედვა აქ გამოჩნდება',
  emptySteps:
    'ნაბიჯები ჯერ არ არის. დაიწყეთ ჩაწერა და იმოქმედეთ გვერდზე.',

  confirmClear: 'წავშალოთ ყველა ჩაწერილი ნაბიჯი?',
  dragToReorder: 'გადაადგილება რიგის შესაცვლელად',
  reliability: 'საიმედოობა',
  deleteStep: 'ნაბიჯის წაშლა',
  selector: 'სელექტორი',
  value: 'მნიშვნელობა',

  actionClick: 'დაკლიკება',
  actionType: 'შეყვანა',
  actionSelect: 'არჩევა',
  actionNavigate: 'ნავიგაცია',
  actionSubmit: 'გაგზავნა',
  actionKey: 'ღილაკი',

  // ნაბიჯის აღწერები (content.js)
  descClickButton: (label) => `დაკლიკება ${label} ღილაკზე`,
  descClickLink: (label) => `დაკლიკება ${label} ბმულზე`,
  descClickElement: (label) => `დაკლიკება ელემენტზე ${label}`,
  descType: (value, label) => `შეყვანა "${value}" ველში ${label}`,
  descSelect: (value, label) => `არჩევა "${value}" — ${label}`,
  descSubmit: (label) => `ფორმის გაგზავნა (${label})`,
  descKey: (key, label) => `ღილაკი ${key} — ${label}`,
  descNavigate: (url) => `გადასვლა: ${url}`,

  screenshotClick: 'სკრინშოტი დაკლიკებამდე',
  screenshotType: 'სკრინშოტი ველის შევსების შემდეგ',
  screenshotNavigate: 'სკრინშოტი გვერდის ჩატვირთვის შემდეგ',
  screenshotSelect: 'სკრინშოტი არჩევის შემდეგ',
  screenshotSubmit: 'სკრინშოტი გაგზავნამდე',
  screenshotDefault: 'სკრინშოტის გადაღება',

  // ტექსტური ექსპორტი
  exportTestCase: (date) => `ტესტ-ქეისი: შექმნილია ${date}`,
  exportUrl: (url) => `URL: ${url}`,
  exportTotalSteps: (n) => `სულ ნაბიჯი: ${n}`,
  exportStepsHeader: 'ნაბიჯები:',
  exportElement: (sel) => `   ელემენტი: ${sel}`,
  exportValue: (val) => `   მნიშვნელობა: ${val}`,
  exportPage: (title) => `   გვერდი: ${title}`,

  devtoolsPanelName: 'ტესტ-ჩამწერი',

  tabRecording: 'ჩაწერა',
  tabHistory: 'ისტორია',
  btnSaveHistory: '💾 ისტორიაში შენახვა',
  historyTitle: 'ტესტ-ქეისების ისტორია',
  historyEmpty: 'ისტორია ცარიელია. შეინახეთ ჩაწერილი ტესტ-ქეისი.',
  historySteps: (n) => `${n} ნაბიჯი`,
  historyLoad: 'ჩატვირთვა',
  historyView: 'ნახვა',
  historyDelete: 'წაშლა',
  historyBack: '← უკან',
  historyLoadToRecorder: 'ჩამწერაში ჩატვირთვა',
  historySaveChanges: 'ცვლილებების შენახვა',
  historyRename: 'სახელის შეცვლა',
  historyExportAll: 'ყველას ექსპორტი',
  historyImport: 'JSON იმპორტი',
  historyImported: (n) => `${n} ჩანაწერი იმპორტირდა`,
  confirmDeleteHistory: 'წავშალოთ ეს ჩანაწერი ისტორიიდან?',
  confirmSaveHistoryName: 'შეიყვანეთ ტესტ-ქეისის სახელი:',
  historyUntitled: (date) => {
    const d = new Date(date);
    return `ტესტ-ქეისი ${d.toLocaleDateString('ka-GE')} ${d.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}`;
  },
  historySaved: 'ისტორიაში შენახულია!',
  historyUpdated: 'განახლდა!',
  editStep: 'რედაქტირება',
  saveStep: 'შენახვა',
  cancelEdit: 'გაუქმება',
  fieldDescription: 'აღწერა',
  fieldAction: 'მოქმედება',
  fieldValue: 'მნიშვნელობა',
  fieldSelector: 'სელექტორი',
  fieldPageUrl: 'გვერდის URL',
  viewingHistory: 'ისტორიის ნახვა',
  promptSaveOnStop: 'შევინახოთ ეს ჩაწერა ისტორიაში?',

  actionLabel(action) {
    const map = {
      Click: this.actionClick,
      Type: this.actionType,
      Select: this.actionSelect,
      Navigate: this.actionNavigate,
      Submit: this.actionSubmit,
      Key: this.actionKey
    };
    return map[action] || action;
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.I18N = I18N;
}
