# ტესტ-ქეისის ჩამწერი (Test Case Recorder)

Chrome გაფართოება, რომელიც **ჩაწერს მომხმარებლის ქმედებებს** (დაკლიკება, შეყვანა, ნავიგაცია) ნებისმიერ ვებ-გვერდზე და **ავტომატურად ქმნის სტრუქტურირებულ ტესტ-ქეისებს** QA ავტომატიზაციისთვის.

> **Tech stack:** Pure JavaScript · Chrome Extension Manifest V3 · `chrome.storage.local` · გარე დამოკიდებულებების გარეშე

---

## ✨ ძირითადი შესაძლებლობები

- **ჩაწერა** — click, input (debounced 500ms), change, submit, Enter/Tab
- **სელექტორების გენერაცია** — data-testid, id, aria-label, name, CSS, XPath + საიმედოობის შეფასება (1–5)
- **SPA ნავიგაცია** — pushState, popstate, hashchange, tab URL ცვლილებები
- **API/ქსელის მოთხოვნების ჩაწერა** — `chrome.debugger` + Chrome DevTools Protocol-ის `Network` დომენი (არა `fetch`/`XHR` monkey-patch): იჭერს XHR/Fetch მოთხოვნებს request/response headers, body-თი და აკავშირებს უახლოეს UI ნაბიჯთან (`relatedStep`)
- **ექსპორტი** — Plain Text, JSON, Playwright, Cypress, Selenium (Python), Selenium (C#), Postman Collection v2.1, HAR
- **ისტორია** — სახელწოდებული ჩანაწერები, რედაქტირება, JSON backup/import
- **ქართული UI** — popup, side panel, DevTools panel

---

## 📁 პროექტის სტრუქტურა

```
test-case-recorder/
├── manifest.json          # MV3 კონფიგურაცია
├── background.js          # Service worker — storage, messaging, history
├── content.js             # Event capture + selector engine
├── export.js              # ექსპორტის ფორმატები (6 ტიპი: text/json/playwright/cypress/selenium×2)
├── i18n.js                # ქართული ინტერფეისის ტექსტები
├── postman-generator.js    # Postman v2.1 / HAR გენერატორი
├── devtools.html/js       # DevTools პანელის რეგისტრაცია
├── popup/                 # Popup UI (დაწყება/გაჩერება, ექსპორტი)
├── panel/                 # Side panel + DevTools panel UI
└── icons/                 # 16, 48, 128 px ხატულები
```

> **შენიშვნა:** API/ქსელის capture აღარ იყენებს გვერდში ინექცირებულ სკრიპტს
> (ძველი `api-interceptor.js` მოცილებულია). ამის ნაცვლად `background.js`
> `chrome.debugger`-ით უერთდება აქტიურ ტაბს და პირდაპირ CDP-ის
> `Network.*` მოვლენებს კითხულობს — გვერდის `fetch`/`XHR`/CSP-ს საერთოდ
> არ ეხება.

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
- **ქსელის აქტივობა** — ჩაწერის დროს დაჭერილი XHR/Fetch მოთხოვნები (headers, body, სტატუსი, timing), ბმული შესაბამის UI ნაბიჯთან
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
| Postman Collection | `.json` | `postman-generator.js` — ჯგუფდება domain/endpoint/method-ის მიხედვით, response-ების ჩართვა ოფციონალურია |
| HAR | `.har` | სტანდარტული HTTP Archive — ნებისმიერ HAR viewer-ში/DevTools-ში ჩატვირთვადი |

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
| `apiRequests` | ჩაწერისას დაჭერილი ქსელის მოთხოვნები (`chrome.debugger`-ით) |
| `isRecording` | ჩაწერის სტატუსი |
| `attachedTabId` | ტაბი, რომელზეც ამჟამად ერთვის `chrome.debugger` (ჩაწერის დროს) |
| `testCaseHistory` | ისტორიის ჩანაწერები |

მონაცემები ინახება Chrome-ის ლოკალურ storage-ში. JSON ექსპორტი/იმპორტი გამოიყენე backup-ისთვის.

---

## 🧪 ტესტირების შემოწმება

- [ ] ჩაწერა იწყება/ჩერდება popup-დან და panel-დან
- [ ] click და input (debounced) იჭერება
- [ ] SPA ნავიგაცია ავტომატურად იწერება
- [ ] ყველა 8 ექსპორტის ფორმატი გენერირდება (მათ შორის Postman და HAR)
- [ ] XHR/Fetch მოთხოვნები ჩანს "ქსელის აქტივობა" ტაბში ჩაწერისას
- [ ] request/response headers და body სწორად ჩანს (მათ შორის sensitive header-ების დაფარვა)
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
| ქსელის მოთხოვნები არ ჩანს | `chrome://extensions` → "ტესტ-ჩამწერის" errors ნახვა; `chrome.debugger` ერთ ტაბზე მხოლოდ ერთ debugger client-ს უშვებს — თუ იმავე ტაბზე ღიაა ხელით Chrome DevTools (F12), `debugger.attach` ჩაიშლება. დახურე DevTools და თავიდან დაიწყე ჩაწერა |
| "ეს გაფართოება debug-ავს ამ ტაბს" ბანერი | ნორმალურია — `chrome.debugger` API-ის სტანდარტული გაფრთხილებაა ჩაწერის დროს, ქრება Stop-ზე |
| ჩაწერის დაწყებისას ტაბი გადაიტვირთა | `chrome.debugger.attach` ხანდახან ტაბის reload-ს იწვევს ძველ Chrome ვერსიებში — Chrome-ის განახლება მოგვარებს |

---

## 📋 Permissions

| Permission | მიზეზი |
|------------|--------|
| `activeTab` | აქტიურ ტაბზე ჩაწერა |
| `scripting` | content script injection |
| `storage` | ნაბიჯები, ისტორია და API მოთხოვნები |
| `tabs` | URL ცვლილებების თვალყურის დევნება, ჩაწერისას აქტიური ტაბის მოძებნა |
| `debugger` | `chrome.debugger` + CDP `Network` დომენი — API/ქსელის მოთხოვნების ჩაწერა |
| `sidePanel` | Side panel UI |
| `<all_urls>` | ნებისმიერ საიტზე ჩაწერა |

---

## 📄 ვერსია

**v1.2.1** — Manifest V3 · Chrome Extension · API/ქსელის ჩაწერა `chrome.debugger`-ზეა გადატანილი (`api-interceptor.js` მოცილებულია)

---

## 👤 ავტორი

Beka Sazuashvili