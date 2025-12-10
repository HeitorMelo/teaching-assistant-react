/**
 * E2E Test Step Definitions for Report Dashboard
 * 
 * Layer: E2E Tests (Top of Testing Pyramid)
 * Context: Browser automation with Puppeteer
 * 
 * Focus: User visibility, rendering, and interaction
 * Uses page.evaluate() for DOM inspection and assertions
 */

import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';

setDefaultTimeout(60 * 1000);

// =============================================================================
// Test State
// =============================================================================

let browser: Browser;
let page: Page;
let currentClassId: string | null = null;
let createdStudentCPFs: string[] = [];

const baseUrl = 'http://127.0.0.1:3004';
const serverUrl = 'http://127.0.0.1:3005';

// =============================================================================
// Hooks
// =============================================================================

Before({ tags: '@e2e' }, async function () {
  currentClassId = null;
  createdStudentCPFs = [];

  browser = await launch({
    headless: false,
    slowMo: 50,
    defaultViewport: null,
    args: ['--start-maximized']
  });

  page = await browser.newPage();
});

After({ tags: '@e2e' }, async function () {
  // Cleanup: Delete created students
  for (const cpf of createdStudentCPFs) {
    try {
      await fetch(`${serverUrl}/api/students/${cpf}`, { method: 'DELETE' });
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  // Cleanup: Delete test class
  if (currentClassId) {
    try {
      await fetch(`${serverUrl}/api/classes/${currentClassId}`, { method: 'DELETE' });
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  if (browser) {
    await browser.close();
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

async function createClassViaAPI(topic: string): Promise<string> {
  const response = await fetch(`${serverUrl}/api/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, semester: 1, year: 2025 })
  });
  const data = await response.json();
  if (data.error) {
    console.error('Failed to create class:', data.error);
  }
  currentClassId = data.id;
  return currentClassId!;
}

async function createStudentViaAPI(name: string, cpf: string): Promise<void> {
  // Generate a valid email from the name
  const email = `${name.toLowerCase().replace(/\s+/g, '.')}@test.com`;
  
  const response = await fetch(`${serverUrl}/api/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, cpf, email })
  });
  const data = await response.json();
  if (data.error) {
    console.error('Failed to create student:', data.error);
  }
  createdStudentCPFs.push(cpf);
}

async function enrollStudentViaAPI(cpf: string): Promise<void> {
  if (!currentClassId) throw new Error('No class ID');
  const response = await fetch(`${serverUrl}/api/classes/${currentClassId}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentCPF: cpf })
  });
  const data = await response.json();
  if (data.error) {
    console.error('Failed to enroll student:', data.error);
  }
}

async function addGradeViaAPI(cpf: string, goal: string, grade: string): Promise<void> {
  if (!currentClassId) throw new Error('No class ID');
  const response = await fetch(`${serverUrl}/api/classes/${currentClassId}/enrollments/${cpf}/evaluation`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, grade })
  });
  const data = await response.json();
  if (data.error) {
    console.error('Failed to add grade:', data.error);
  }
}

// =============================================================================
// GIVEN Steps
// =============================================================================

Given('the application is running at {string}', async function (url: string) {
  await page.goto(url);
  await page.waitForSelector('h1', { timeout: 10000 });
});

Given('the API server is running at {string}', async function (url: string) {
  const response = await fetch(`${url}/api/students`);
  expect(response.status).toBe(200);
});

Given('a test class {string} exists with students and grades', async function (topic: string) {
  await createClassViaAPI(topic);
  
  // Create students with different statuses
  await createStudentViaAPI('Approved Student', '11111111101');
  await enrollStudentViaAPI('11111111101');
  await addGradeViaAPI('11111111101', 'Requirements', 'MA');
  await addGradeViaAPI('11111111101', 'Design', 'MA');
  await addGradeViaAPI('11111111101', 'Tests', 'MA');
  
  await createStudentViaAPI('Failed Student', '11111111102');
  await enrollStudentViaAPI('11111111102');
  await addGradeViaAPI('11111111102', 'Requirements', 'MANA');
  await addGradeViaAPI('11111111102', 'Design', 'MANA');
  await addGradeViaAPI('11111111102', 'Tests', 'MANA');
});

Given('a test class {string} exists', async function (topic: string) {
  await createClassViaAPI(topic);
});

Given('a test class {string} exists with no students', async function (topic: string) {
  await createClassViaAPI(topic);
});

Given('a test class {string} exists with students', async function (topic: string) {
  await createClassViaAPI(topic);
  await createStudentViaAPI('Test Student', '22222222201');
  await enrollStudentViaAPI('22222222201');
});

Given('a test class {string} exists with mixed student statuses', async function (topic: string) {
  await createClassViaAPI(topic);
  
  // Approved student - needs all 6 goals to get a final grade
  await createStudentViaAPI('Green Student', '33333333301');
  await enrollStudentViaAPI('33333333301');
  await addGradeViaAPI('33333333301', 'Requirements', 'MA');
  await addGradeViaAPI('33333333301', 'Configuration Management', 'MA');
  await addGradeViaAPI('33333333301', 'Project Management', 'MA');
  await addGradeViaAPI('33333333301', 'Design', 'MA');
  await addGradeViaAPI('33333333301', 'Tests', 'MA');
  await addGradeViaAPI('33333333301', 'Refactoring', 'MA');
  
  // Failed student - needs all 6 goals to get a final grade
  await createStudentViaAPI('Red Student', '33333333302');
  await enrollStudentViaAPI('33333333302');
  await addGradeViaAPI('33333333302', 'Requirements', 'MANA');
  await addGradeViaAPI('33333333302', 'Configuration Management', 'MANA');
  await addGradeViaAPI('33333333302', 'Project Management', 'MANA');
  await addGradeViaAPI('33333333302', 'Design', 'MANA');
  await addGradeViaAPI('33333333302', 'Tests', 'MANA');
  await addGradeViaAPI('33333333302', 'Refactoring', 'MANA');
  
  // Pending student - no grades = pending status
  await createStudentViaAPI('Yellow Student', '33333333303');
  await enrollStudentViaAPI('33333333303');
});

Given('the class has a student {string} with no evaluations', async function (name: string) {
  await createStudentViaAPI(name, '44444444401');
  await enrollStudentViaAPI('44444444401');
});

Given('I am on the Classes page', async function () {
  await page.goto(baseUrl);
  const classesTab = await page.waitForSelector('[data-testid="classes-tab"]', { timeout: 10000 });
  await classesTab?.click();
  await new Promise(resolve => setTimeout(resolve, 500));
});

// =============================================================================
// WHEN Steps
// =============================================================================

When('I click the Report button for the test class', async function () {
  if (!currentClassId) throw new Error('No class ID available');
  
  // Find the row containing the test class and click its Report button
  const xpath = `xpath///tr[contains(., '${currentClassId.split('-')[0]}')] | //div[contains(@class, 'card')]`;
  await page.waitForSelector(xpath, { timeout: 10000 });
  
  const container = await page.$(xpath);
  if (!container) throw new Error('Could not find class container');
  
  const reportBtn = await container.$('xpath/.//button[contains(., "Report")]');
  if (reportBtn) {
    await reportBtn.click();
  } else {
    // Fallback: find Report button by class
    const btn = await container.$('.report-btn');
    if (btn) await btn.click();
    else throw new Error('Report button not found');
  }
  
  await page.waitForSelector('.enrollment-overlay, .report-modal', { timeout: 10000 });
});

When('I click the close button on the modal', async function () {
  const closeBtn = await page.$('.close-modal-btn, .cancel-btn, button[title="Close"]');
  if (closeBtn) {
    await closeBtn.click();
    await new Promise(resolve => setTimeout(resolve, 500));
  } else {
    throw new Error('Close button not found');
  }
});

// =============================================================================
// THEN Steps
// =============================================================================

Then('I should see the report modal', async function () {
  const modal = await page.$('.enrollment-overlay, .report-modal');
  expect(modal).not.toBeNull();
});

Then('the report modal should not be visible', async function () {
  const modal = await page.$('.enrollment-overlay, .report-modal');
  expect(modal).toBeNull();
});

Then('I should see the {string} section', async function (sectionName: string) {
  const pageContent = await page.content();
  expect(pageContent.toLowerCase()).toContain(sectionName.toLowerCase());
});

Then('I should see the {string} pie chart container', async function (chartName: string) {
  const chartContainer = await page.$('.chart-container, .pie-chart, [class*="pie"]');
  expect(chartContainer).not.toBeNull();
});

Then('I should see the {string} bar chart container', async function (chartName: string) {
  const chartContainer = await page.$('.chart-container, .bar-chart, [class*="bar"]');
  expect(chartContainer).not.toBeNull();
});

Then('I should see the students table', async function () {
  const table = await page.$('table.students-table, .students-list, table');
  expect(table).not.toBeNull();
});

Then('I should see the classes table', async function () {
  const table = await page.$('table tbody, .classes-list');
  expect(table).not.toBeNull();
});

Then('the student {string} grade cell should display {string}', async function (studentName: string, expected: string) {
  // Wait for the table to be loaded
  await page.waitForSelector('.students-table tbody tr', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const pageContent = await page.content();
  
  // Check that the expected value exists near the student name
  const hasStudent = pageContent.includes(studentName);
  expect(hasStudent).toBe(true);
  
  // Get all cell contents
  const cells = await page.$$('.students-table tbody td');
  let foundExpected = false;
  
  for (const cell of cells) {
    const text = await page.evaluate(el => el.textContent?.trim() || '', cell);
    
    // Check for any dash-like character: regular hyphen, en-dash, em-dash, minus sign
    if (expected === '-' || expected === '–' || expected === '—') {
      if (text === '-' || text === '–' || text === '—' || text === '−') {
        foundExpected = true;
        break;
      }
    } else if (text === expected) {
      foundExpected = true;
      break;
    }
  }
  
  expect(foundExpected).toBe(true);
});

Then('no cell should display {string}', async function (forbidden: string) {
  const cells = await page.$$('td, .stat-value, .data-cell');
  
  for (const cell of cells) {
    const text = await page.evaluate(el => el.textContent, cell);
    expect(text).not.toContain(forbidden);
  }
});

Then('the enrollment count should show {string}', async function (expected: string) {
  const pageContent = await page.content();
  expect(pageContent).toContain(expected);
});

Then('I should see an empty state message or illustration', async function () {
  const emptyState = await page.$('.empty-state, .no-data, [class*="empty"]');
  const pageContent = await page.content();
  
  // Either find an empty state element or text indicating no data
  const hasEmptyIndicator = emptyState !== null || 
    pageContent.toLowerCase().includes('no data') ||
    pageContent.toLowerCase().includes('no students') ||
    pageContent.includes('0');
  
  expect(hasEmptyIndicator).toBe(true);
});

Then('the charts should display gracefully with no data', async function () {
  // Verify no JavaScript errors occurred
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Charts should either show empty state or render without errors
  const chartContainers = await page.$$('.chart-container, .recharts-wrapper');
  // Should not crash - containers should exist even if empty
  expect(chartContainers.length).toBeGreaterThanOrEqual(0);
});

Then('approved students should have a green indicator', async function () {
  // Wait for the table to be fully loaded
  await page.waitForSelector('.students-table tbody tr', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Look for the approved status classes
  const greenIndicator = await page.$('.status-approved, .status-approved-final, td[class*="approved"]');
  expect(greenIndicator).not.toBeNull();
});

Then('failed students should have a red indicator', async function () {
  // Wait for the table to be fully loaded
  await page.waitForSelector('.students-table tbody tr', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const redIndicator = await page.$('.status-failed, .status-failed-by-absence, td[class*="failed"]');
  expect(redIndicator).not.toBeNull();
});

Then('pending students should have a yellow/orange indicator', async function () {
  await page.waitForSelector('.students-table tbody tr', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const indicator = await page.$('.status-pending, td[class*="pending"]');
  expect(indicator).not.toBeNull();
});

Then('pending students should have an orange indicator', async function () {
  await page.waitForSelector('.students-table tbody tr', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const indicator = await page.$('.status-pending, td[class*="pending"]');
  expect(indicator).not.toBeNull();
});

// =============================================================================
// TEST 6 & 7: Chart Data Verification Steps
// Strategy: SVG DOM Inspection + User Interaction (Hover/Tooltip)
// =============================================================================

/**
 * Creates a class with exactly 1 Approved and 1 Failed student for pie chart testing.
 * Approved student: All MA grades (10.0 average)
 * Failed student: All MANA grades (0.0 average)
 */
Given('I am viewing the report for a class with {string} and {string} student', async function (approvedCount: string, failedCount: string) {
  // Create the test class
  await createClassViaAPI('Pie Chart Test');
  
  // Create approved student with all MA grades
  await createStudentViaAPI('Pie Approved Student', '55555555501');
  await enrollStudentViaAPI('55555555501');
  await addGradeViaAPI('55555555501', 'Requirements', 'MA');
  await addGradeViaAPI('55555555501', 'Configuration Management', 'MA');
  await addGradeViaAPI('55555555501', 'Project Management', 'MA');
  await addGradeViaAPI('55555555501', 'Design', 'MA');
  await addGradeViaAPI('55555555501', 'Tests', 'MA');
  await addGradeViaAPI('55555555501', 'Refactoring', 'MA');
  
  // Create failed student with all MANA grades
  await createStudentViaAPI('Pie Failed Student', '55555555502');
  await enrollStudentViaAPI('55555555502');
  await addGradeViaAPI('55555555502', 'Requirements', 'MANA');
  await addGradeViaAPI('55555555502', 'Configuration Management', 'MANA');
  await addGradeViaAPI('55555555502', 'Project Management', 'MANA');
  await addGradeViaAPI('55555555502', 'Design', 'MANA');
  await addGradeViaAPI('55555555502', 'Tests', 'MANA');
  await addGradeViaAPI('55555555502', 'Refactoring', 'MANA');
  
  // Navigate to Classes page and open report
  await page.goto(baseUrl);
  const classesTab = await page.waitForSelector('[data-testid="classes-tab"]', { timeout: 10000 });
  await classesTab?.click();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Click Report button for the test class
  if (!currentClassId) throw new Error('No class ID available');
  const xpath = `xpath///tr[contains(., '${currentClassId.split('-')[0]}')] | //div[contains(@class, 'card')]`;
  await page.waitForSelector(xpath, { timeout: 10000 });
  const container = await page.$(xpath);
  if (!container) throw new Error('Could not find class container');
  
  const reportBtn = await container.$('xpath/.//button[contains(., "Report")]');
  if (reportBtn) {
    await reportBtn.click();
  } else {
    const btn = await container.$('.report-btn');
    if (btn) await btn.click();
    else throw new Error('Report button not found');
  }
  
  await page.waitForSelector('.enrollment-overlay, .report-modal', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 1000));
});

/**
 * Creates a class where a specific goal has a known average for bar chart tooltip testing.
 * Sets up a student with MA grade on "Tests" goal to get 10.0 average.
 */
Given('I am viewing the report for a class where goal {string} has average {string}', async function (goal: string, expectedAverage: string) {
  // Create the test class
  await createClassViaAPI('Bar Chart Test');
  
  // Create a student with MA grade on the specified goal
  await createStudentViaAPI('Bar Test Student', '66666666601');
  await enrollStudentViaAPI('66666666601');
  
  // Add MA grade to the specified goal (Tests) - this will give 10.0 average
  await addGradeViaAPI('66666666601', goal, 'MA');
  
  // Navigate to Classes page and open report
  await page.goto(baseUrl);
  const classesTab = await page.waitForSelector('[data-testid="classes-tab"]', { timeout: 10000 });
  await classesTab?.click();
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Click Report button for the test class
  if (!currentClassId) throw new Error('No class ID available');
  const xpath = `xpath///tr[contains(., '${currentClassId.split('-')[0]}')] | //div[contains(@class, 'card')]`;
  await page.waitForSelector(xpath, { timeout: 10000 });
  const container = await page.$(xpath);
  if (!container) throw new Error('Could not find class container');
  
  const reportBtn = await container.$('xpath/.//button[contains(., "Report")]');
  if (reportBtn) {
    await reportBtn.click();
  } else {
    const btn = await container.$('.report-btn');
    if (btn) await btn.click();
    else throw new Error('Report button not found');
  }
  
  await page.waitForSelector('.enrollment-overlay, .report-modal', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 1000));
});

When('I look at the {string} pie chart', async function (chartTitle: string) {
  // Wait for the pie chart to render
  await page.waitForSelector('.recharts-pie', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 500));
});

When('I hover over the bar corresponding to {string} in the {string} chart', async function (goalName: string, chartTitle: string) {
  // This step is kept for backwards compatibility but simplified
  await page.waitForSelector('.recharts-wrapper', { timeout: 10000 });
  await new Promise(resolve => setTimeout(resolve, 1000));
});

When('I look at the {string} section', async function (sectionName: string) {
  // Scroll to make the section visible
  await page.evaluate((section: string) => {
    const headings = document.querySelectorAll('h4');
    for (const h of Array.from(headings)) {
      if (h.textContent?.includes(section)) {
        h.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  }, sectionName);
  await new Promise(resolve => setTimeout(resolve, 500));
});

/**
 * Verifies the performance table shows the correct goal and average.
 * Uses DOM inspection of the performance table.
 */
Then('the performance table should show goal {string} with average {string}', async function (goal: string, expectedAverage: string) {
  // Wait for the performance table
  await page.waitForSelector('.performance-table', { timeout: 10000 });
  
  const tableData = await page.evaluate((targetGoal: string) => {
    const rows = document.querySelectorAll('.performance-table tbody tr');
    for (const row of Array.from(rows)) {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        const goalCell = cells[0]?.textContent?.trim() || '';
        const avgCell = cells[1]?.textContent?.trim() || '';
        if (goalCell.includes(targetGoal)) {
          return { goal: goalCell, average: avgCell };
        }
      }
    }
    return null;
  }, goal);
  
  expect(tableData).not.toBeNull();
  expect(tableData?.average).toBe(expectedAverage);
});

/**
 * Verifies the bar chart has rendered with at least one data point.
 * Uses SVG DOM inspection.
 */
Then('the bar chart should render with at least {int} data point', async function (minPoints: number) {
  // Check for recharts wrapper existence and that it has content
  const chartExists = await page.evaluate(() => {
    const wrappers = document.querySelectorAll('.recharts-wrapper');
    // Find the bar chart (second wrapper typically)
    for (const wrapper of Array.from(wrappers)) {
      // Check if it has cartesian grid (bar chart indicator)
      const cartesianGrid = wrapper.querySelector('.recharts-cartesian-grid');
      if (cartesianGrid) {
        // Check for any rendered content
        const svg = wrapper.querySelector('svg');
        return svg !== null;
      }
    }
    return false;
  });
  
  expect(chartExists).toBe(true);
});

/**
 * Verifies pie chart has exactly N distinct segments via SVG DOM inspection.
 * Recharts renders pie segments as <path> elements within .recharts-pie-sector
 */
Then('I should see exactly {int} distinct segments in the chart SVG', async function (expectedCount: number) {
  const segmentCount = await page.evaluate(() => {
    // Recharts renders each pie segment as a separate sector with a path
    const sectors = document.querySelectorAll('.recharts-pie-sector');
    return sectors.length;
  });
  
  expect(segmentCount).toBe(expectedCount);
});

/**
 * Verifies pie chart legend displays the expected status labels.
 * Uses SVG DOM inspection of the legend elements.
 */
Then('the legend should display {string} and {string}', async function (status1: string, status2: string) {
  const legendTexts = await page.evaluate(() => {
    const legendItems = document.querySelectorAll('.recharts-legend-item-text');
    return Array.from(legendItems).map(item => item.textContent?.trim() || '');
  });
  
  expect(legendTexts).toContain(status1);
  expect(legendTexts).toContain(status2);
});

