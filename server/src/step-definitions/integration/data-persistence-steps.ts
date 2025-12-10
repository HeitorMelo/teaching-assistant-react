/**
 * Integration Test Step Definitions for Data Persistence
 * 
 * Layer: Integration Tests (Middle-Upper of Testing Pyramid)
 * Context: Tests flow between API and data persistence layer
 * 
 * Uses supertest for HTTP calls and verifies data consistency
 * between write operations and subsequent read operations.
 */

import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import request from 'supertest';
import expect from 'expect';
import { app } from '../../server';

setDefaultTimeout(60 * 1000);

// =============================================================================
// Test State
// =============================================================================

let response: request.Response;
let currentClassId: string | null = null;
let createdStudentCPFs: string[] = [];
let initialEnrollmentCount: number = 0;

// =============================================================================
// Hooks
// =============================================================================

Before({ tags: '@integration' }, async function () {
  currentClassId = null;
  createdStudentCPFs = [];
  initialEnrollmentCount = 0;
});

After({ tags: '@integration' }, async function () {
  // Cleanup: Delete all created students
  for (const cpf of createdStudentCPFs) {
    try {
      await request(app).delete(`/api/students/${cpf}`);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  // Cleanup: Delete test class
  if (currentClassId) {
    try {
      await request(app).delete(`/api/classes/${currentClassId}`);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

async function createStudent(name: string, cpf: string): Promise<void> {
  await request(app)
    .post('/api/students')
    .send({ name, cpf });
  createdStudentCPFs.push(cpf);
}

async function enrollStudent(cpf: string): Promise<void> {
  if (!currentClassId) throw new Error('No class ID');
  await request(app)
    .post(`/api/classes/${currentClassId}/enroll`)
    .send({ studentCPF: cpf });
}

async function unenrollStudent(cpf: string): Promise<void> {
  if (!currentClassId) throw new Error('No class ID');
  await request(app)
    .delete(`/api/classes/${currentClassId}/enroll/${cpf}`);
}

async function addGrade(cpf: string, goal: string, grade: string): Promise<void> {
  if (!currentClassId) throw new Error('No class ID');
  await request(app)
    .put(`/api/classes/${currentClassId}/enrollments/${cpf}/evaluation`)
    .send({ goal, grade });
}

async function addCompleteGrades(cpf: string): Promise<void> {
  await addGrade(cpf, 'Requirements', 'MA');
  await addGrade(cpf, 'Design', 'MA');
  await addGrade(cpf, 'Tests', 'MA');
}

// =============================================================================
// GIVEN Steps
// =============================================================================

Given('the API server is running and connected to the data store', async function () {
  const res = await request(app).get('/api/students');
  expect(res.status).toBe(200);
});

Given('a test class {string} exists', async function (topic: string) {
  const res = await request(app)
    .post('/api/classes')
    .send({
      topic,
      semester: 1,
      year: 2025
    });
  
  currentClassId = res.body.id;
});

Given('the class has {int} enrolled students initially', async function (count: number) {
  initialEnrollmentCount = count;
  
  for (let i = 1; i <= count; i++) {
    const cpf = `9999999900${i}`;
    await createStudent(`Initial Student ${i}`, cpf);
    await enrollStudent(cpf);
  }
});

Given('the class has the following enrolled students:', async function (dataTable: DataTable) {
  const rows = dataTable.hashes();
  
  for (const row of rows) {
    await createStudent(row.name, row.cpf);
    await enrollStudent(row.cpf);
  }
  
  initialEnrollmentCount = rows.length;
});

Given('all students have complete grades', async function () {
  for (const cpf of createdStudentCPFs) {
    await addCompleteGrades(cpf);
  }
});

Given('the class has a student {string} with CPF {string}', async function (name: string, cpf: string) {
  await createStudent(name, cpf);
  await enrollStudent(cpf);
});

Given('the student has grades: Requirements={word}, Design={word}, Tests={word}', 
  async function (req: string, design: string, tests: string) {
    const cpf = createdStudentCPFs[createdStudentCPFs.length - 1];
    await addGrade(cpf, 'Requirements', req);
    await addGrade(cpf, 'Design', design);
    await addGrade(cpf, 'Tests', tests);
  }
);

// =============================================================================
// WHEN Steps
// =============================================================================

When('I enroll a new student {string} with CPF {string}', async function (name: string, cpf: string) {
  await createStudent(name, cpf);
  await enrollStudent(cpf);
});

When('I unenroll student with CPF {string}', async function (cpf: string) {
  await unenrollStudent(cpf);
});

When('I update the student\'s {string} grade to {string}', async function (goal: string, grade: string) {
  const cpf = createdStudentCPFs[createdStudentCPFs.length - 1];
  await addGrade(cpf, goal, grade);
});

When('I request the class report', async function () {
  if (!currentClassId) throw new Error('No class ID');
  response = await request(app).get(`/api/classes/${currentClassId}/report`);
});

When('I perform the following operations in sequence:', async function (dataTable: DataTable) {
  const operations = dataTable.hashes();
  
  for (const op of operations) {
    if (op.operation === 'enroll') {
      await createStudent(op.student, op.cpf);
      await enrollStudent(op.cpf);
    } else if (op.operation === 'unenroll') {
      await unenrollStudent(op.cpf);
    }
  }
});

// =============================================================================
// THEN Steps
// =============================================================================

Then('the {string} count should be {int}', function (field: string, expected: number) {
  expect(response.body[field]).toBe(expected);
});

Then('the student {string} should not appear in the students list', function (studentName: string) {
  const students = response.body.students || [];
  const found = students.find((s: any) => s.name === studentName);
  expect(found).toBeUndefined();
});

Then('the student {string} should have status {string}', function (studentName: string, expectedStatus: string) {
  const students = response.body.students || [];
  const student = students.find((s: any) => s.name === studentName);
  expect(student).toBeDefined();
  expect(student.status).toBe(expectedStatus);
});

Then('the {string} should be {int}', function (field: string, expected: number) {
  expect(response.body[field]).toBe(expected);
});

Then('the report should contain students:', function (dataTable: DataTable) {
  const expectedNames = dataTable.hashes().map(row => row.name);
  const actualNames = (response.body.students || []).map((s: any) => s.name);
  
  for (const name of expectedNames) {
    expect(actualNames).toContain(name);
  }
});
