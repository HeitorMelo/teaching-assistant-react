/**
 * Service Test Step Definitions for Report API
 * 
 * Layer: Service Tests (Middle of Testing Pyramid)
 * Context: Tests API Controller and HTTP responses
 * 
 * Uses supertest for fast HTTP testing without browser automation.
 * Data is created via API calls and cleaned up after each test.
 */

import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import request from 'supertest';
import expect from 'expect';
import { app } from '../../server';

setDefaultTimeout(30 * 1000);

// =============================================================================
// Test State
// =============================================================================

let response: request.Response;
let currentClassId: string | null = null;
let createdStudentCPFs: string[] = [];

const serverUrl = 'http://127.0.0.1:3005';

// =============================================================================
// Hooks
// =============================================================================

Before({ tags: '@service' }, async function () {
  currentClassId = null;
  createdStudentCPFs = [];
});

After({ tags: '@service' }, async function () {
  // Cleanup: Delete created students
  for (const cpf of createdStudentCPFs) {
    try {
      await request(app).delete(`/api/students/${cpf}`);
    } catch (e) {
      console.log(`Cleanup: Failed to delete student ${cpf}`);
    }
  }
  
  // Cleanup: Delete created class
  if (currentClassId) {
    try {
      await request(app).delete(`/api/classes/${currentClassId}`);
    } catch (e) {
      console.log(`Cleanup: Failed to delete class ${currentClassId}`);
    }
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

async function createClass(topic: string): Promise<string> {
  const res = await request(app)
    .post('/api/classes')
    .send({
      topic,
      semester: 1,
      year: 2025
    });
  
  currentClassId = res.body.id;
  return currentClassId!;
}

async function createStudent(name: string, cpf: string): Promise<void> {
  await request(app)
    .post('/api/students')
    .send({ name, cpf });
  createdStudentCPFs.push(cpf);
}

async function enrollStudent(classId: string, cpf: string): Promise<void> {
  await request(app)
    .post(`/api/classes/${classId}/enroll`)
    .send({ studentCPF: cpf });
}

async function addGrade(classId: string, cpf: string, goal: string, grade: string): Promise<void> {
  await request(app)
    .put(`/api/classes/${classId}/enrollments/${cpf}/evaluation`)
    .send({ goal, grade });
}

// =============================================================================
// GIVEN Steps
// =============================================================================

Given('the API server is running', async function () {
  const res = await request(app).get('/api/students');
  expect(res.status).toBe(200);
});

Given('the test database is initialized', async function () {
  // Server uses in-memory data, no additional setup needed
});

Given('a class {string} exists with enrolled students', async function (topic: string) {
  const classId = await createClass(topic);
  
  await createStudent('Test Student 1', '99999999901');
  await enrollStudent(classId, '99999999901');
  await addGrade(classId, '99999999901', 'Requirements', 'MA');
  await addGrade(classId, '99999999901', 'Design', 'MA');
  await addGrade(classId, '99999999901', 'Tests', 'MA');
});

Given('a class {string} exists with the following students:', async function (topic: string, dataTable: DataTable) {
  const classId = await createClass(topic);
  const rows = dataTable.hashes();
  
  for (const row of rows) {
    await createStudent(row.name, row.cpf);
    await enrollStudent(classId, row.cpf);
    
    // Add grades for each goal
    const goals = ['Requirements', 'Design', 'Tests'];
    const grades = [row.goal1, row.goal2, row.goal3];
    
    for (let i = 0; i < goals.length; i++) {
      if (grades[i]) {
        await addGrade(classId, row.cpf, goals[i], grades[i]);
      }
    }
  }
});

Given('no class exists with ID {string}', function (classId: string) {
  // No action needed - just confirm the ID doesn't exist
});

Given('a class {string} exists with enrolled students but no grades', async function (topic: string) {
  const classId = await createClass(topic);
  
  await createStudent('Pending Student 1', '88888888801');
  await enrollStudent(classId, '88888888801');
  
  await createStudent('Pending Student 2', '88888888802');
  await enrollStudent(classId, '88888888802');
});

Given('a class {string} exists with no enrolled students', async function (topic: string) {
  await createClass(topic);
});

// =============================================================================
// WHEN Steps
// =============================================================================

When('I request the report for that class', async function () {
  if (!currentClassId) throw new Error('No class ID available');
  response = await request(app).get(`/api/classes/${currentClassId}/report`);
});

When('I request the report for class ID {string}', async function (classId: string) {
  response = await request(app).get(`/api/classes/${classId}/report`);
});

// =============================================================================
// THEN Steps
// =============================================================================

Then('the response status should be {int}', function (expectedStatus: number) {
  expect(response.status).toBe(expectedStatus);
});

Then('the response body should have the following keys:', function (dataTable: DataTable) {
  const expectedKeys = dataTable.hashes().map(row => row.key);
  const actualKeys = Object.keys(response.body);
  
  for (const key of expectedKeys) {
    expect(actualKeys).toContain(key);
  }
});

Then('the response body should contain an {string} message', function (fieldName: string) {
  expect(response.body).toHaveProperty(fieldName);
});

Then('the {string} should be {int}', function (field: string, expected: number) {
  expect(response.body[field]).toBe(expected);
});

Then('the {string} should be null', function (field: string) {
  expect(response.body[field]).toBeNull();
});

Then('the {string} should equal {string}', function (field1: string, field2: string) {
  expect(response.body[field1]).toBe(response.body[field2]);
});

Then('the {string} should be an empty array', function (field: string) {
  expect(Array.isArray(response.body[field])).toBe(true);
  expect(response.body[field].length).toBe(0);
});

Then('no field should contain {string} or {string}', function (val1: string, val2: string) {
  const jsonStr = JSON.stringify(response.body);
  expect(jsonStr).not.toContain(val1);
  expect(jsonStr).not.toContain(val2);
});
