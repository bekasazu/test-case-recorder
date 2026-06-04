# ტესტ-ქეისის ჩამწერი (Test Case Recorder)

Chrome გაფართოება, რომელიც **ჩაწერს მომხმარებლის ქმედებებს** (დაკლიკება, შეყვანა, ნავიგაცია) ნებისმიერ ვებ-გვერდზე და **ავტომატურად ქმნის სტრუქტურირებულ ტესტ-ქეისებს** QA ავტომატიზაციისთვის.

> **Tech stack:** Pure JavaScript · Chrome Extension Manifest V3 · `chrome.storage.local` · გარე დამოკიდებულებების გარეშე

---

## ✨ ძირითადი შესაძლებლობები

- **ჩაწერა** — click, input (debounced 500ms), change, submit, Enter/Tab
- **სელექტორების გენერაცია** — data-testid, id, aria-label, name, CSS, XPath + საიმედოობის შეფასება (1–5)
- **SPA ნავიგაცია** — pushState, popstate, hashchange, tab URL ცვლილებები
- **ექსპორტი** — Plain Text, JSON, Playwright, Cypress, Selenium (Python), Selenium (C#)
- **ისტორია** — სახელწოდებული ჩანაწერები, რედაქტირება, JSON backup/import
- **ქართული UI** — popup, side panel, DevTools panel

---

## 📁 პროექტის სტრუქტურა

```
test-case-recorder/
├── manifest.json          # MV3 კონფიგურაცია
├── background.js          # Service worker — storage, messaging, history
├── content.js             # Event capture + selector engine
├── export.js              # ექსპორტის ფორმატები (6 ტიპი)
├── i18n.js                # ქართული ინტერფეისის ტექსტები
├── devtools.html/js       # DevTools პანელის რეგისტრაცია
├── popup/                 # Popup UI (დაწყება/გაჩერება, ექსპორტი)
├── panel/                 # Side panel + DevTools panel UI
└── icons/                 # 16, 48, 128 px ხატულები
```

---

## 🚀 ინსტალაცია

1. გახსენი Chrome-ში: `chrome://extensions`
2. ჩართე **Developer mode** (მარჯვენა ზედა კუთხე)
3. დააჭირე **Load unpacked**
4. აირჩიე ეს საქაღალდე: `test-case-recorder/`

გაფართოება გამოჩნდება როგორც **„ტესტ-ქეისის ჩამწერი“**.

---

## 📖 გამოყენება

### 1. ჩაწერის დაწყება

1. გახსენი სასურველი ვებ-გვერდი (მაგ. [saucedemo.com](https://www.saucedemo.com))
2. დააჭირე გაფართოების ხატულას → **▶ ჩაწერის დაწყება**
3. შეასრულე ქმედებები გვერდზე (დაკლიკება, შეყვანა, ნავიგაცია)
4. **⏹ ჩაწერის გაჩერება** — სურვილის შემთხვევაში შეგიძლია ისტორიაში შეინახო

### 2. პანელის გახსნა

| გზა | როგორ |
|-----|--------|
| **Side Panel** | Popup → **პანელის გახსნა** |
| **DevTools** | F12 → ჩანართი **ტესტ-ჩამწერი** |

პანელში ხედავ:
- **ჩაწერა** — ნაბიჯების სია + ექსპორტის live preview
- **ისტორია** — ძველი ტესტ-ქეისები

### 3. ნაბიჯების მართვა

| მოქმედება | როგორ |
|-----------|--------|
| დეტალების ნახვა | დააკლიკე ნაბიჯზე |
| რედაქტირება | **✎** → შეცვალე აღწერა, მოქმედება, მნიშვნელობა, სელექტორი |
| წაშლა | **×** |
| რიგის შეცვლა | გადაათრიე **⋮⋮** handle-ით |

### 4. ისტორია

- **💾 ისტორიაში შენახვა** — მიუთითე სახელი
- **ისტორია** ტაბი — ყველა ძველი ჩანაწერი
- **ნახვა** — სრული დეტალი + რედაქტირება
- **ჩატვირთვა** — ჩამწერაში ჩასმა
- **ყველას ექსპორტი / JSON იმპორტი** — backup ფაილში

---

## 📤 ექსპორტის ფორმატები

| ფორმატი | გაფართოება | გამოყენება |
|---------|------------|------------|
| Plain Text | `.txt` | ადამიანისთვის წაკითხვადი |
| JSON | `.json` | სრული მონაცემები |
| Playwright | `.spec.ts` | `npx playwright test` |
| Cypress | `.cy.js` | Cypress runner |
| Selenium (Python) | `.py` | Python + Selenium |
| Selenium (C#) | `.cs` | C# + Selenium WebDriver |

**Playwright მაგალითი:**

```typescript
import { test, expect } from '@playwright/test';

test('Generated Test Case', async ({ page }) => {
  await page.goto('https://www.saucedemo.com');
  await page.fill('#user-name', 'standard_user');
  await page.click('#login-button');
});
```

---

## 🎯 სელექტორის პრიორიტეტი

| პრიორიტეტი | სელექტორი | საიმედოობა |
|------------|----------|------------|
| 1 | `[data-testid]` | ★★★★★ |
| 2 | `[data-cy]` / `[data-test]` | ★★★★★ |
| 3 | `#id` (სტაბილური) | ★★★★☆ |
| 4 | `[aria-label]` | ★★★★☆ |
| 5 | `[name]` | ★★★☆☆ |
| 6 | უნიკალური CSS კლასები | ★★★☆☆ |
| 7 | `[placeholder]` | ★★☆☆☆ |
| 8 | XPath ტექსტით | ★★☆☆☆ |
| 9 | სრული CSS path | ★☆☆☆☆ |

ავტოგენერირებული ID-ები (`:r1:`, `react-*`, `ember*`) იგნორირდება.

---

## 💾 მონაცემების შენახვა

| გასაღები | აღწერა |
|---------|--------|
| `recordedSteps` | მიმდინარე ჩაწერის ნაბიჯები |
| `isRecording` | ჩაწერის სტატუსი |
| `testCaseHistory` | ისტორიის ჩანაწერები |

მონაცემები ინახება Chrome-ის ლოკალურ storage-ში. JSON ექსპორტი/იმპორტი გამოიყენე backup-ისთვის.

---

## 🧪 ტესტირების შემოწმება

- [ ] ჩაწერა იწყება/ჩერდება popup-დან და panel-დან
- [ ] click და input (debounced) იჭერება
- [ ] SPA ნავიგაცია ავტომატურად იწერება
- [ ] ყველა 6 ექსპორტის ფორმატი გენერირდება
- [ ] ისტორიაში შენახვა, ჩატვირთვა, რედაქტირება
- [ ] JSON import/export მუშაობს
- [ ] Side panel და DevTools panel ორივე განახლდება real-time

---

## 🔧 Troubleshooting

| პრობლემა | გადაწყვეტა |
|----------|-----------|
| ნაბიჯები არ ჩანს | Reload გაფართოება `chrome://extensions`-ზე |
| პანელი ცარიელია | F12 → Console → შეცდომების შემოწმება; panel.js syntax error |
| ჩაწერა არ მუშაობს | გვერდი reload → Start Recording თავიდან |
| `chrome://` გვერდები | content script არ იშვება სისტემურ URL-ებზე |
| Side panel არ იხსნება | Chrome 114+ საჭიროა; ან DevTools → ტესტ-ჩამწერი |

---

## 📋 Permissions

| Permission | მიზეზი |
|------------|--------|
| `activeTab` | აქტიურ ტაბზე ჩაწერა |
| `scripting` | content script injection |
| `storage` | ნაბიჯები და ისტორია |
| `tabs` | URL ცვლილებების თვალყურის დევნება |
| `sidePanel` | Side panel UI |
| `<all_urls>` | ნებისმიერ საიტზე ჩაწერა |

---

## 📄 ვერსია

**v1.0.4** — Manifest V3 · Chrome Extension

---

## 👤 ავტორი

Beka Sazuashvili