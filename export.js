/**
 * Shared export formatters for recorded test steps.
 */

function reliabilityStars(score) {
  const filled = Math.min(5, Math.max(1, Math.round(score)));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

function formatPlainText(steps) {
  const t = typeof I18N !== 'undefined' ? I18N : null;
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const startUrl = steps[0]?.pageUrl || 'N/A';
  let out = t
    ? `${t.exportTestCase(generatedAt)}\n${t.exportUrl(startUrl)}\n${t.exportTotalSteps(steps.length)}\n\n${t.exportStepsHeader}\n`
    : `TEST CASE: Generated on ${generatedAt}\nURL: ${startUrl}\nTotal Steps: ${steps.length}\n\nSTEPS:\n`;
  out += '──────────────────────────────────────\n';

  steps.forEach((step) => {
    out += `${step.stepNumber}. ${step.description}\n`;
    const sel = step.selector?.recommendedSelector;
    if (sel) out += t ? `${t.exportElement(sel)}\n` : `   Element: ${sel}\n`;
    if (step.value) out += t ? `${t.exportValue(step.value)}\n` : `   Value: ${step.value}\n`;
    if (step.pageTitle) out += t ? `${t.exportPage(step.pageTitle)}\n` : `   Page: ${step.pageTitle}\n`;
    out += `   URL: ${step.pageUrl}\n\n`;
  });

  out += '──────────────────────────────────────\n';
  return out;
}

function formatJSON(steps) {
  return JSON.stringify(
    {
      metadata: {
        generatedAt: new Date().toISOString(),
        startUrl: steps[0]?.pageUrl || null,
        browser: 'Chrome',
        totalSteps: steps.length
      },
      steps
    },
    null,
    2
  );
}

function escapeForTs(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function playwrightLocator(step) {
  const sel = step.selector?.recommendedSelector || 'body';
  const action = step.action;

  if (action === 'Navigate') {
    const url = step.pageUrl || step.value;
    if (url) {
      const pattern = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `  await page.goto('${escapeForTs(url)}');`;
    }
    return `  await page.waitForLoadState('networkidle');`;
  }

  if (action === 'Click') {
    return `  await page.click('${escapeForTs(sel)}');`;
  }
  if (action === 'Type') {
    const val = escapeForTs(step.value || '');
    return `  await page.fill('${escapeForTs(sel)}', '${val}');`;
  }
  if (action === 'Select') {
    const val = escapeForTs(step.value || '');
    return `  await page.selectOption('${escapeForTs(sel)}', '${val}');`;
  }
  if (action === 'Submit') {
    return `  await page.locator('${escapeForTs(sel)}').press('Enter');`;
  }
  if (action === 'Key') {
    const key = step.value === 'Tab' ? 'Tab' : 'Enter';
    return `  await page.locator('${escapeForTs(sel)}').press('${key}');`;
  }

  return `  // ${step.description}`;
}

function formatPlaywright(steps) {
  let code = `import { test, expect } from '@playwright/test';\n\n`;
  code += `test('Generated Test Case', async ({ page }) => {\n`;
  const startUrl = steps[0]?.pageUrl;
  if (startUrl) {
    code += `  await page.goto('${escapeForTs(startUrl)}');\n`;
  }
  steps.forEach((step, i) => {
    code += `\n  // Step ${i + 1}: ${step.description}\n`;
    if (step.action === 'Navigate' && step.pageUrl) {
      const url = step.pageUrl;
      const fragment = url.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean).pop() || '';
      if (fragment) {
        code += `  await page.waitForURL('**/${escapeForTs(fragment)}**');\n`;
      } else {
        code += `  await page.waitForURL('${escapeForTs(url)}');\n`;
      }
    } else {
      code += playwrightLocator(step) + '\n';
    }
  });
  code += `});\n`;
  return code;
}

function cypressCommand(step) {
  const sel = step.selector?.recommendedSelector || 'body';
  const action = step.action;

  if (action === 'Navigate') {
    if (step.pageUrl) {
      const part = step.pageUrl.replace(/^https?:\/\/[^/]+/, '') || step.pageUrl;
      return `    cy.url().should('include', '${escapeForTs(part)}');`;
    }
    return `    cy.url().should('exist');`;
  }
  if (action === 'Click') {
    return `    cy.get('${escapeForTs(sel)}').click();`;
  }
  if (action === 'Type') {
    return `    cy.get('${escapeForTs(sel)}').type('${escapeForTs(step.value || '')}');`;
  }
  if (action === 'Select') {
    return `    cy.get('${escapeForTs(sel)}').select('${escapeForTs(step.value || '')}');`;
  }
  if (action === 'Submit') {
    return `    cy.get('${escapeForTs(sel)}').submit();`;
  }
  if (action === 'Key') {
    const key = step.value === 'Tab' ? '{tab}' : '{enter}';
    return `    cy.get('${escapeForTs(sel)}').type('${key}');`;
  }
  return `    // ${step.description}`;
}

function formatCypress(steps) {
  let code = `describe('Generated Test Case', () => {\n`;
  code += `  it('should complete the user flow', () => {\n`;
  steps.forEach((step, i) => {
    code += `\n    // Step ${i + 1}: ${step.description}\n`;
    code += cypressCommand(step) + '\n';
  });
  code += `  });\n});\n`;
  return code;
}

function seleniumBy(step) {
  const sel = step.selector;
  if (!sel) return { by: 'By.CSS_SELECTOR', value: "'body'" };

  if (sel.recommendedSelector?.startsWith('[data-testid=')) {
    const m = sel.recommendedSelector.match(/\[data-testid="([^"]+)"/);
    if (m) return { by: 'By.CSS_SELECTOR', value: `'[data-testid=\"${m[1]}\"]'` };
  }
  if (sel.id && sel.recommendedSelector === `#${sel.id}`) {
    return { by: 'By.ID', value: `"${sel.id}"` };
  }
  if (sel.name && sel.recommendedSelector?.includes('[name=')) {
    return { by: 'By.NAME', value: `"${sel.name}"` };
  }
  return { by: 'By.CSS_SELECTOR', value: `'${sel.recommendedSelector?.replace(/'/g, "\\'") || 'body'}'` };
}

function formatSelenium(steps) {
  let code = `from selenium import webdriver\n`;
  code += `from selenium.webdriver.common.by import By\n`;
  code += `from selenium.webdriver.support.ui import WebDriverWait, Select\n`;
  code += `from selenium.webdriver.support import expected_conditions as EC\n\n`;
  code += `def test_generated_flow():\n`;
  code += `    driver = webdriver.Chrome()\n`;
  code += `    wait = WebDriverWait(driver, 10)\n\n`;

  steps.forEach((step, i) => {
    code += `    # Step ${i + 1}: ${step.description}\n`;
    const { by, value } = seleniumBy(step);

    if (step.action === 'Navigate') {
      if (step.pageUrl) {
        const part = step.pageUrl.includes('/')
          ? step.pageUrl.split('/').filter(Boolean).pop()
          : step.pageUrl;
        code += `    wait.until(EC.url_contains("${part}"))\n`;
      }
    } else if (step.action === 'Click') {
      code += `    wait.until(EC.element_to_be_clickable((${by}, ${value}))).click()\n`;
    } else if (step.action === 'Type') {
      const pyVal = (step.value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      code += `    driver.find_element(${by}, ${value}).send_keys("${pyVal}")\n`;
    } else if (step.action === 'Select') {
      code += `    Select(driver.find_element(${by}, ${value})).select_by_value("${step.value || ''}")\n`;
    } else if (step.action === 'Submit' || step.action === 'Key') {
      code += `    driver.find_element(${by}, ${value}).submit()\n`;
    }
    code += '\n';
  });

  code += `    driver.quit()\n`;
  return code;
}

function escapeCsharp(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/"/g, '""');
}

function seleniumCsharpLocator(step) {
  const sel = step.selector;
  if (!sel) return 'By.CssSelector("body")';

  if (sel.recommendedSelector?.startsWith('[data-testid=')) {
    const m = sel.recommendedSelector.match(/\[data-testid="([^"]+)"/);
    if (m) return `By.CssSelector("[data-testid=\\"${escapeCsharp(m[1])}\\"]")`;
  }
  if (sel.id && sel.recommendedSelector === `#${sel.id}`) {
    return `By.Id("${escapeCsharp(sel.id)}")`;
  }
  if (sel.name && sel.recommendedSelector?.includes('[name=')) {
    return `By.Name("${escapeCsharp(sel.name)}")`;
  }
  const css = escapeCsharp(sel.recommendedSelector || 'body');
  return `By.CssSelector("${css}")`;
}

function formatSeleniumCsharp(steps) {
  let code = `using OpenQA.Selenium;\n`;
  code += `using OpenQA.Selenium.Chrome;\n`;
  code += `using OpenQA.Selenium.Support.UI;\n\n`;
  code += `namespace GeneratedTests\n{\n`;
  code += `    public class GeneratedTestCase\n    {\n`;
  code += `        public void TestGeneratedFlow()\n        {\n`;
  code += `            IWebDriver driver = new ChromeDriver();\n`;
  code += `            WebDriverWait wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));\n\n`;

  const startUrl = steps[0]?.pageUrl;
  if (startUrl) {
    code += `            driver.Navigate().GoToUrl("${escapeCsharp(startUrl)}");\n\n`;
  }

  steps.forEach((step, i) => {
    code += `            // Step ${i + 1}: ${step.description}\n`;
    const locator = seleniumCsharpLocator(step);

    if (step.action === 'Navigate') {
      if (step.pageUrl) {
        const part = step.pageUrl.includes('/')
          ? step.pageUrl.split('/').filter(Boolean).pop()
          : step.pageUrl;
        code += `            wait.Until(d => d.Url.Contains("${escapeCsharp(part)}"));\n`;
      }
    } else if (step.action === 'Click') {
      code += `            wait.Until(d => d.FindElement(${locator}).Displayed);\n`;
      code += `            driver.FindElement(${locator}).Click();\n`;
    } else if (step.action === 'Type') {
      const val = escapeCsharp(step.value || '');
      code += `            driver.FindElement(${locator}).SendKeys("${val}");\n`;
    } else if (step.action === 'Select') {
      const val = escapeCsharp(step.value || '');
      code += `            new SelectElement(driver.FindElement(${locator})).SelectByValue("${val}");\n`;
    } else if (step.action === 'Submit' || step.action === 'Key') {
      code += `            driver.FindElement(${locator}).Submit();\n`;
    }
    code += '\n';
  });

  code += `            driver.Quit();\n`;
  code += `        }\n`;
  code += `    }\n`;
  code += `}\n`;
  return code;
}

function exportSteps(steps, format) {
  switch (format) {
    case 'text':
      return formatPlainText(steps);
    case 'json':
      return formatJSON(steps);
    case 'playwright':
      return formatPlaywright(steps);
    case 'cypress':
      return formatCypress(steps);
    case 'selenium':
      return formatSelenium(steps);
    case 'selenium-csharp':
      return formatSeleniumCsharp(steps);
    default:
      return formatPlainText(steps);
  }
}

// Export for service worker and panel/popup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    exportSteps,
    reliabilityStars,
    formatPlainText,
    formatJSON,
    formatPlaywright,
    formatCypress,
    formatSelenium,
    formatSeleniumCsharp
  };
}
