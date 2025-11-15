import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

let browser: Browser;
let page: Page;
const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';

// Test data to clean up
let testStudentCPF: string;

Before(async function () {
  browser = await launch({ 
    headless: false, // Set to true for CI/CD
    slowMo: 50 // Slow down actions for visibility
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

After(async function () {
  // Clean up test student if it exists
  if (testStudentCPF) {
    try {
      await fetch(`${serverUrl}/api/students/${testStudentCPF}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.log('Clean up: Student may not exist or server unavailable');
    }
  }
  
  if (browser) {
    await browser.close();
  }
});

Given('the student management system is running', async function () {
  await page.goto(baseUrl);
  await page.waitForSelector('h1', { timeout: 10000 });
  const title = await page.$eval('h1', el => el.textContent);
  expect(title || '').toContain('Teaching Assistant React');
});

Given('the server is available', async function () {
  try {
    const response = await fetch(`${serverUrl}/api/students`);
    expect(response.status).toBe(200);
  } catch (error) {
    throw new Error('Server is not available. Make sure the backend server is running on port 3005');
  }
});

Given('there is no student with CPF {string} in the system', async function (cpf: string) {
  testStudentCPF = cpf;
  
  // Try to delete the student if it exists (cleanup before test)
  try {
    await fetch(`${serverUrl}/api/students/${cpf}`, {
      method: 'DELETE'
    });
  } catch (error) {
    // Student may not exist, which is fine
  }
  
  // Verify student doesn't exist
  try {
    const response = await fetch(`${serverUrl}/api/students/${cpf}`);
    if (response.status === 200) {
      throw new Error(`Student with CPF ${cpf} already exists in the system`);
    }
  } catch (error) {
    // Expected - student should not exist
  }
});

When('I navigate to the Students tab', async function () {
  // Check if we're already on the students tab
  const studentsTab = await page.$('button.tab-button:first-of-type');
  if (studentsTab) {
    const isActive = await page.evaluate(el => el?.classList.contains('active'), studentsTab);
    
    if (!isActive) {
      await studentsTab.click();
    }
  }
  
  // Wait for the student form to be visible
  await page.waitForSelector('form', { timeout: 5000 });
});

When('I fill in the student form with:', async function (dataTable: DataTable) {
  const data = dataTable.rowsHash();
  
  // Fill in the name field
  await page.waitForSelector('input[name="name"]');
  await page.click('input[name="name"]');
  await page.type('input[name="name"]', data.name);
  
  // Fill in the CPF field
  await page.click('input[name="cpf"]');
  await page.type('input[name="cpf"]', data.cpf);
  
  // Fill in the email field
  await page.click('input[name="email"]');
  await page.type('input[name="email"]', data.email);
});

When('I submit the student form', async function () {
  // Click the submit button
  const submitButton = await page.$('button[type="submit"]');
  expect(submitButton).toBeTruthy();
  
  await submitButton?.click();
  
  // Wait for the form to be processed and student to appear
  await new Promise(resolve => setTimeout(resolve, 2000));
});

Then('I should see {string} in the student list', async function (studentName: string) {
  // Wait for the student list to update
  await page.waitForSelector('.students-list table', { timeout: 10000 });
  
  // Check if the student appears in the table
  const studentRows = await page.$$('tbody tr');
  let studentFound = false;
  
  for (const row of studentRows) {
    const nameCell = await row.$('td:first-child');
    if (nameCell) {
      const name = await page.evaluate(el => el.textContent, nameCell);
      if (name === studentName) {
        studentFound = true;
        break;
      }
    }
  }
  
  expect(studentFound).toBe(true);
});

Then('the student should have CPF {string}', async function (expectedCPF: string) {
  // Find the row containing our test student and verify CPF
  const studentRows = await page.$$('tbody tr');
  
  for (const row of studentRows) {
    const cpfCell = await row.$('td:nth-child(2)');
    if (cpfCell) {
      const cpf = await page.evaluate(el => el.textContent, cpfCell);
      if (cpf === expectedCPF) {
        return; // CPF found and matches
      }
    }
  }
  
  throw new Error(`Student with CPF ${expectedCPF} not found in the student list`);
});

Then('the student should have email {string}', async function (expectedEmail: string) {
  // Find the row containing our test student and verify email
  const studentRows = await page.$$('tbody tr');
  
  for (const row of studentRows) {
    const emailCell = await row.$('td:nth-child(3)');
    if (emailCell) {
      const email = await page.evaluate(el => el.textContent, emailCell);
      if (email === expectedEmail) {
        return; // Email found and matches
      }
    }
  }
  
  throw new Error(`Student with email ${expectedEmail} not found in the student list`);
});

Then('I clean up by removing the test student', async function () {
  if (testStudentCPF) {
    try {
      const response = await fetch(`${serverUrl}/api/students/${testStudentCPF}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log(`Successfully cleaned up test student with CPF: ${testStudentCPF}`);
      }
    } catch (error) {
      console.log(`Warning: Could not clean up test student: ${error}`);
    }
  }
});