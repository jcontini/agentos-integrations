#!/usr/bin/env node
/**
 * Browser automation script using Playwright
 * 
 * Captures console logs, errors, and network activity for debugging.
 * Screenshots are optional and expensive (tokens) - use sparingly.
 */

import { chromium } from 'playwright';
import { join } from 'path';
import { homedir } from 'os';

const action = process.env.PARAM_ACTION || process.argv[2];
const url = process.env.PARAM_URL;
const selector = process.env.PARAM_SELECTOR;
const text = process.env.PARAM_TEXT;
const script = process.env.PARAM_SCRIPT;
const waitMs = parseInt(process.env.PARAM_WAIT_MS || '1000', 10);
const includeScreenshot = process.env.PARAM_SCREENSHOT === 'true';
const headless = process.env.SETTING_HEADLESS !== 'false';
const downloadsDir = process.env.AGENTOS_DOWNLOADS || join(homedir(), 'Downloads');

// Collected diagnostics
const consoleLogs = [];
const consoleErrors = [];
const networkRequests = [];
const networkErrors = [];

async function run() {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    const entry = { type: msg.type(), text: msg.text() };
    if (msg.type() === 'error') {
      consoleErrors.push(entry);
    }
    consoleLogs.push(entry);
  });
  
  // Capture page errors (uncaught exceptions)
  page.on('pageerror', error => {
    consoleErrors.push({ type: 'exception', text: error.message });
  });
  
  // Capture network requests
  page.on('requestfailed', request => {
    networkErrors.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || 'Unknown error'
    });
  });
  
  page.on('response', response => {
    const status = response.status();
    if (status >= 400) {
      networkErrors.push({
        url: response.url(),
        status,
        statusText: response.statusText()
      });
    }
    // Only track non-asset requests to reduce noise
    const url = response.url();
    if (!url.match(/\.(png|jpg|jpeg|gif|svg|css|woff|woff2|ttf|ico)(\?|$)/)) {
      networkRequests.push({
        url: url.length > 100 ? url.substring(0, 100) + '...' : url,
        status,
        method: response.request().method()
      });
    }
  });
  
  try {
    // Navigate to URL
    if (url) {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(waitMs);
    }
    
    let result = { success: true };
    
    // Helper to add diagnostics to result
    const addDiagnostics = () => {
      if (consoleErrors.length > 0) {
        result.console_errors = consoleErrors.slice(-10); // Last 10 errors
      }
      if (networkErrors.length > 0) {
        result.network_errors = networkErrors.slice(-10); // Last 10 errors
      }
    };
    
    // Helper to optionally add screenshot
    const maybeScreenshot = async (prefix) => {
      if (includeScreenshot) {
        const screenshotPath = join(downloadsDir, `browser-${prefix}-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        result.screenshot = screenshotPath;
      }
    };
    
    switch (action) {
      case 'inspect': {
        // Diagnostic overview without screenshot
        result.title = await page.title();
        result.url = page.url();
        
        // Get visible text summary
        const bodyText = await page.locator('body').textContent();
        result.text_preview = bodyText?.trim().substring(0, 500) + (bodyText?.length > 500 ? '...' : '');
        
        // Get all headings for structure
        const headings = await page.locator('h1, h2, h3').allTextContents();
        if (headings.length > 0) {
          result.headings = headings.slice(0, 10).map(h => h.trim()).filter(Boolean);
        }
        
        // Get all buttons and links for interactivity
        const buttons = await page.locator('button, [role="button"]').allTextContents();
        if (buttons.length > 0) {
          result.buttons = buttons.slice(0, 15).map(b => b.trim()).filter(Boolean);
        }
        
        // Get form inputs
        const inputs = await page.locator('input, textarea, select').evaluateAll(els => 
          els.map(el => ({
            type: el.type || el.tagName.toLowerCase(),
            name: el.name || el.id || el.placeholder || null,
            value: el.value ? (el.value.length > 50 ? el.value.substring(0, 50) + '...' : el.value) : null
          })).filter(i => i.name)
        );
        if (inputs.length > 0) {
          result.inputs = inputs.slice(0, 10);
        }
        
        // Add console/network diagnostics
        if (consoleLogs.length > 0) {
          result.console_logs = consoleLogs.slice(-15);
        }
        result.network_requests = networkRequests.slice(-20);
        addDiagnostics();
        
        await maybeScreenshot('inspect');
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'console': {
        // Just get console logs
        result.title = await page.title();
        result.console_logs = consoleLogs;
        result.console_errors = consoleErrors;
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'network': {
        // Just get network activity
        result.title = await page.title();
        result.requests = networkRequests;
        result.errors = networkErrors;
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'screenshot': {
        const screenshotPath = join(downloadsDir, `browser-screenshot-${Date.now()}.png`);
        if (selector) {
          const element = await page.locator(selector).first();
          await element.screenshot({ path: screenshotPath });
        } else {
          await page.screenshot({ path: screenshotPath, fullPage: false });
        }
        result.screenshot = screenshotPath;
        result.title = await page.title();
        result.url = page.url();
        addDiagnostics();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'click': {
        if (!selector) throw new Error('selector is required for click action');
        await page.locator(selector).first().click();
        await page.waitForTimeout(waitMs);
        result.clicked = selector;
        result.title = await page.title();
        result.url = page.url();
        addDiagnostics();
        await maybeScreenshot('click');
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'type': {
        if (!selector) throw new Error('selector is required for type action');
        if (!text) throw new Error('text is required for type action');
        await page.locator(selector).first().fill(text);
        await page.waitForTimeout(waitMs);
        result.typed = { selector, text };
        result.title = await page.title();
        result.url = page.url();
        addDiagnostics();
        await maybeScreenshot('type');
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'get_text': {
        if (!selector) throw new Error('selector is required for get_text action');
        const elements = await page.locator(selector).all();
        const texts = await Promise.all(elements.map(el => el.textContent()));
        result.texts = texts.map(t => t?.trim()).filter(Boolean);
        result.count = result.texts.length;
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'evaluate': {
        if (!script) throw new Error('script is required for evaluate action');
        const evalResult = await page.evaluate(script);
        result.result = evalResult;
        addDiagnostics();
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      case 'get_html': {
        const html = selector 
          ? await page.locator(selector).first().innerHTML()
          : await page.content();
        result.html = html;
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error) {
    console.log(JSON.stringify({ 
      success: false, 
      error: error.message,
      console_errors: consoleErrors,
      network_errors: networkErrors
    }, null, 2));
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
