#!/usr/bin/env node
/**
 * Browser automation script using Playwright
 * 
 * Captures console logs, errors, and network activity for debugging.
 * Screenshots are optional and expensive (tokens) - use sparingly.
 * 
 * For run_flow: Resolves element selectors to screen coordinates,
 * then executes OS-level input actions via AgentOS for screen recording.
 */

import { chromium } from 'playwright';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

const action = process.env.PARAM_ACTION || process.argv[2];
const url = process.env.PARAM_URL;
const selector = process.env.PARAM_SELECTOR;
const text = process.env.PARAM_TEXT;
const script = process.env.PARAM_SCRIPT;
const actionsJson = process.env.PARAM_ACTIONS;
const waitMs = parseInt(process.env.PARAM_WAIT_MS || '1000', 10);
const includeScreenshot = process.env.PARAM_SCREENSHOT === 'true';
const headless = process.env.SETTING_HEADLESS !== 'false';
const slowMo = parseInt(process.env.SETTING_SLOW_MO || '0', 10);
const timeout = parseInt(process.env.SETTING_TIMEOUT || '30', 10) * 1000;
const locale = process.env.SETTING_LOCALE || 'en-US';
const userAgentSetting = process.env.SETTING_USER_AGENT || 'chrome';

const userAgents = {
  chrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
};

const userAgent = userAgents[userAgentSetting] || userAgents.chrome;
const downloadsDir = process.env.AGENTOS_DOWNLOADS || join(homedir(), 'Downloads');

// Path to AgentOS binary (set by plugin executor)
const agentosPath = process.env.AGENTOS_BIN || 'agentos';

/**
 * Execute input actions via AgentOS CLI.
 * This performs OS-level mouse/keyboard input that screen recorders can capture.
 */
function executeInputActions(actions) {
  if (!actions || actions.length === 0) {
    return { success: true, actions_executed: 0 };
  }
  
  try {
    const actionsJson = JSON.stringify(actions);
    const result = execSync(`"${agentosPath}" input --actions '${actionsJson}'`, {
      encoding: 'utf-8',
      timeout: 60000 // 60 second timeout
    });
    return JSON.parse(result);
  } catch (error) {
    return {
      success: false,
      error: `Failed to execute input actions: ${error.message}`,
      stderr: error.stderr?.toString() || ''
    };
  }
}

// Collected diagnostics
const consoleLogs = [];
const consoleErrors = [];
const networkRequests = [];
const networkErrors = [];

/**
 * Get screen coordinates for an element, accounting for window position and browser chrome.
 * @param {Page} page - Playwright page
 * @param {string} selector - CSS selector
 * @param {string} anchor - Where to click: 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'
 * @returns {Promise<{screenX: number, screenY: number} | {error: string}>}
 */
async function getScreenCoordinates(page, selector, anchor = 'center') {
  // First ensure element is in view
  try {
    const element = page.locator(selector).first();
    await element.scrollIntoViewIfNeeded({ timeout: 5000 });
  } catch (e) {
    return { error: `Element not found or not scrollable: ${selector}` };
  }

  // Small delay to let scroll settle
  await page.waitForTimeout(100);

  // Get screen coordinates via JavaScript
  const coords = await page.evaluate(({ sel, anchor }) => {
    const el = document.querySelector(sel);
    if (!el) return { error: 'Element not found' };

    const rect = el.getBoundingClientRect();
    
    // Check if element is visible
    if (rect.width === 0 || rect.height === 0) {
      return { error: 'Element has no size (hidden or collapsed)' };
    }

    // Window position on screen
    const windowX = window.screenX;
    const windowY = window.screenY;

    // Browser chrome offset (toolbars, tabs, bookmark bar, etc.)
    // outerHeight - innerHeight = total vertical chrome (usually all at top)
    const chromeHeight = window.outerHeight - window.innerHeight;
    // Horizontal chrome is usually minimal (window frame)
    const chromeWidth = (window.outerWidth - window.innerWidth) / 2;

    // Calculate anchor point within element
    let offsetX, offsetY;
    switch (anchor) {
      case 'top-left':
        offsetX = 5;
        offsetY = 5;
        break;
      case 'top-right':
        offsetX = rect.width - 5;
        offsetY = 5;
        break;
      case 'bottom-left':
        offsetX = 5;
        offsetY = rect.height - 5;
        break;
      case 'bottom-right':
        offsetX = rect.width - 5;
        offsetY = rect.height - 5;
        break;
      case 'center':
      default:
        offsetX = rect.width / 2;
        offsetY = rect.height / 2;
    }

    return {
      screenX: Math.round(windowX + chromeWidth + rect.x + offsetX),
      screenY: Math.round(windowY + chromeHeight + rect.y + offsetY),
      // Include debug info
      debug: {
        windowPos: { x: windowX, y: windowY },
        chrome: { width: chromeWidth, height: chromeHeight },
        elementRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        anchor: { x: offsetX, y: offsetY }
      }
    };
  }, { sel: selector, anchor });

  return coords;
}

/**
 * Process a flow of actions, resolving selectors to screen coordinates.
 * Returns an array of resolved input actions for OS-level execution.
 */
async function processFlow(page, actions) {
  const resolvedActions = [];
  
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const actionType = action.action;
    
    try {
      switch (actionType) {
        case 'goto': {
          await page.goto(action.url, { waitUntil: 'networkidle', timeout: 30000 });
          // Small wait after navigation
          await page.waitForTimeout(500);
          break;
        }
        
        case 'wait': {
          // Just add a wait action for OS-level execution
          resolvedActions.push({ input: 'wait', ms: action.ms || 1000 });
          break;
        }
        
        case 'wait_for': {
          const timeoutMs = action.timeout_ms || 10000;
          await page.locator(action.selector).first().waitFor({ state: 'visible', timeout: timeoutMs });
          break;
        }
        
        case 'click': {
          const coords = await getScreenCoordinates(page, action.selector, action.anchor || 'center');
          if (coords.error) {
            throw new Error(`Failed to get coordinates for ${action.selector}: ${coords.error}`);
          }
          // Move to element
          resolvedActions.push({
            input: 'move',
            x: coords.screenX,
            y: coords.screenY,
            duration_ms: action.duration_ms || 500,
            easing: 'ease_out'
          });
          // Small pause before click
          resolvedActions.push({ input: 'wait', ms: 50 });
          // Click
          resolvedActions.push({ input: 'click', button: action.button || 'left' });
          // Wait after click for any effects
          if (action.wait_after_ms) {
            resolvedActions.push({ input: 'wait', ms: action.wait_after_ms });
          }
          break;
        }
        
        case 'double_click': {
          const coords = await getScreenCoordinates(page, action.selector, action.anchor || 'center');
          if (coords.error) {
            throw new Error(`Failed to get coordinates for ${action.selector}: ${coords.error}`);
          }
          resolvedActions.push({
            input: 'move',
            x: coords.screenX,
            y: coords.screenY,
            duration_ms: action.duration_ms || 500,
            easing: 'ease_out'
          });
          resolvedActions.push({ input: 'wait', ms: 50 });
          resolvedActions.push({ input: 'double_click', button: 'left' });
          break;
        }
        
        case 'hover': {
          const coords = await getScreenCoordinates(page, action.selector, action.anchor || 'center');
          if (coords.error) {
            throw new Error(`Failed to get coordinates for ${action.selector}: ${coords.error}`);
          }
          resolvedActions.push({
            input: 'move',
            x: coords.screenX,
            y: coords.screenY,
            duration_ms: action.duration_ms || 500,
            easing: 'ease_out'
          });
          // Wait while hovering (for tooltips, dropdowns, etc.)
          if (action.hover_ms) {
            resolvedActions.push({ input: 'wait', ms: action.hover_ms });
          }
          break;
        }
        
        case 'type': {
          // First click on the element to focus it
          const coords = await getScreenCoordinates(page, action.selector, 'center');
          if (coords.error) {
            throw new Error(`Failed to get coordinates for ${action.selector}: ${coords.error}`);
          }
          resolvedActions.push({
            input: 'move',
            x: coords.screenX,
            y: coords.screenY,
            duration_ms: action.duration_ms || 300,
            easing: 'ease_out'
          });
          resolvedActions.push({ input: 'wait', ms: 50 });
          resolvedActions.push({ input: 'click', button: 'left' });
          resolvedActions.push({ input: 'wait', ms: 100 });
          // Type the text
          resolvedActions.push({
            input: 'type',
            text: action.text,
            delay_ms: action.delay_ms || 50
          });
          break;
        }
        
        case 'scroll': {
          // Scroll in the specified direction
          const direction = action.direction || 'down';
          const amount = action.amount || 300;
          const deltaY = direction === 'down' ? amount : -amount;
          resolvedActions.push({
            input: 'scroll',
            delta_x: 0,
            delta_y: deltaY
          });
          break;
        }
        
        case 'scroll_to': {
          // Scroll element into view using Playwright, then record a small scroll action
          const element = page.locator(action.selector).first();
          await element.scrollIntoViewIfNeeded({ timeout: 5000 });
          await page.waitForTimeout(300);
          break;
        }
        
        case 'key': {
          resolvedActions.push({
            input: 'key',
            key: action.key
          });
          break;
        }
        
        case 'key_combo': {
          resolvedActions.push({
            input: 'key_combo',
            keys: action.keys
          });
          break;
        }
        
        default:
          throw new Error(`Unknown flow action: ${actionType}`);
      }
    } catch (error) {
      return {
        success: false,
        error: `Action ${i} (${actionType}) failed: ${error.message}`,
        actions_processed: i,
        resolved_actions: resolvedActions
      };
    }
  }
  
  return {
    success: true,
    actions_processed: actions.length,
    resolved_actions: resolvedActions
  };
}

async function run() {
  // For run_flow, we need headed mode
  const useHeadless = action === 'run_flow' ? false : headless;
  
  const browser = await chromium.launch({ headless: useHeadless, slowMo });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent,
    locale
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
    // Navigate to URL (for non-flow actions)
    if (url && action !== 'run_flow') {
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
      case 'run_flow': {
        if (!actionsJson) {
          throw new Error('actions parameter is required for run_flow');
        }
        
        let actions;
        try {
          actions = JSON.parse(actionsJson);
        } catch (e) {
          throw new Error(`Invalid actions JSON: ${e.message}`);
        }
        
        if (!Array.isArray(actions)) {
          throw new Error('actions must be an array');
        }
        
        // Process flow to resolve coordinates
        const flowResult = await processFlow(page, actions);
        
        if (!flowResult.success) {
          result = flowResult;
          console.log(JSON.stringify(result, null, 2));
          break;
        }
        
        // Execute the resolved input actions via OS-level input
        if (flowResult.resolved_actions && flowResult.resolved_actions.length > 0) {
          const inputResult = executeInputActions(flowResult.resolved_actions);
          
          result = {
            success: inputResult.success,
            flow_actions_processed: flowResult.actions_processed,
            input_actions_executed: inputResult.actions_executed || 0,
            error: inputResult.error || null
          };
        } else {
          result = {
            success: true,
            flow_actions_processed: flowResult.actions_processed,
            input_actions_executed: 0,
            note: 'Flow contained no visible input actions'
          };
        }
        
        console.log(JSON.stringify(result, null, 2));
        break;
      }
      
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
    // For run_flow, keep browser open briefly so user can see final state
    if (action === 'run_flow') {
      // Don't close immediately - the Rust side will execute input actions
      // and we want the browser visible during that time
      // The browser will be closed when the process exits
    }
    await browser.close();
  }
}

run();
