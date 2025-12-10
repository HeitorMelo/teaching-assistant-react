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
let studentNameToCPF: Record<string, string> = {};

// =============================================================================
// Hooks
// =============================================================================

Before({ tags: '@integration' }, async function () {
  currentClassId = null;
  createdStudentCPFs = [];
  studentNameToCPF = {};
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

function normalizeCPF(cpf: string): string {
  return cpf.replace(/[.\-]/g, '');
}

async function createStudent(name: string, cpf: string): Promise<void> {
  const normalizedCPF = normalizeCPF(cpf);
  const email = `${name.toLowerCase().replace(/\s+/g, '.')}@test.com`;
  
  await request(app)
    .post('/api/students')
    .send({ name, cpf: normalizedCPF, email });
  createdStudentCPFs.push(normalizedCPF);
  studentNameToCPF[name] = normalizedCPF;
}

async function enrollStudent(cpf: string): Promise<void> {
  if (!currentClassId) throw new Error('No class ID');
  const normalizedCPF = normalizeCPF(cpf);
  await request(app)
    .post(`/api/classes/${currentClassId}/enroll`)
    .send({ studentCPF: normalizedCPF });
}

async function unenrollStudent(cpf: string): Promise<void> {
  if (!currentClassId) throw new Error('No class ID');
  const normalizedCPF = normalizeCPF(cpf);
  await request(app)
    .delete(`/api/classes/${currentClassId}/enroll/${normalizedCPF}`);
}

async function addGrade(cpf: string, goal: string, grade: string): Promise<void> {
  if (!currentClassId) throw new Error('No class ID');
  const normalizedCPF = normalizeCPF(cpf);
  await request(app)
    .put(`/api/classes/${currentClassId}/enrollments/${normalizedCPF}/evaluation`)
    .send({ goal, grade });
}

async function addCompleteGrades(cpf: string): Promise<void> {
  const goals = ['Requirements', 'Configuration Management', 'Project Management', 'Design', 'Tests', 'Refactoring'];
  for (const goal of goals) {
    await addGrade(cpf, goal, 'MA');
  }
}

// =============================================================================
// GIVEN Steps
// =============================================================================

Given('the API is connected to the Test Database', async function () {
  const res = await request(app).get('/api/students');
  expect(res.status).toBe(200);
});

Given('a fresh class {string} exists', async function (topic: string) {
  const res = await request(app)
    .post('/api/classes')
    .send({
      topic,
      semester: 1,
      year: 2025
    });
  
  currentClassId = res.body.id;
});

Given('the class {string} has exactly {string} existing students', async function (className: string, count: string) {
  const studentCount = parseInt(count, 10);
  
  for (let i = 1; i <= studentCount; i++) {
    const cpf = `9999999900${i.toString().padStart(2, '0')}`;
    await createStudent(`Existing Student ${i}`, cpf);
    await enrollStudent(cpf);
  }
});

Given('the class {string} has the following students:', async function (className: string, dataTable: DataTable) {
  const rows = dataTable.hashes();
  
  for (const row of rows) {
    await createStudent(row.Name, row.CPF);
    await enrollStudent(row.CPF);
  }
});

Given('the class {string} has a student {string}', async function (className: string, studentName: string) {
  const cpf = `8888888800${createdStudentCPFs.length + 1}`;
  await createStudent(studentName, cpf);
  await enrollStudent(cpf);
});

Given('{string} has the grades:', async function (studentName: string, dataTable: DataTable) {
  const cpf = studentNameToCPF[studentName];
  if (!cpf) throw new Error(`Student ${studentName} not found`);
  
  const rows = dataTable.hashes();
  for (const row of rows) {
    // Handle row format like: | Requirements | MA |
    const keys = Object.keys(row);
    if (keys.length >= 2) {
      const goal = keys[0];
      const grade = row[goal];
      await addGrade(cpf, goal, grade);
    }
  }
});

Given('the class {string} is empty', async function (className: string) {
  // Class already created in Background, just verify it has no enrollments
});

// =============================================================================
// WHEN Steps
// =============================================================================

When('I enroll a new student with CPF {string}', async function (cpf: string) {
  const studentName = `New Student ${createdStudentCPFs.length + 1}`;
  await createStudent(studentName, cpf);
  await enrollStudent(cpf);
});

When('I unenroll the student {string}', async function (cpf: string) {
  await unenrollStudent(cpf);
});

When('I update {string} grade for {string} to {string}', async function (studentName: string, goal: string, grade: string) {
  const cpf = studentNameToCPF[studentName];
  if (!cpf) throw new Error(`Student ${studentName} not found`);
  await addGrade(cpf, goal, grade);
});

When('I request the report for {string}', async function (className: string) {
  if (!currentClassId) throw new Error('No class ID');
  response = await request(app).get(`/api/classes/${currentClassId}/report`);
});

When('I perform the following operations in order:', async function (dataTable: DataTable) {
  const operations = dataTable.hashes();
  
  for (const op of operations) {
    const action = op.Action.toLowerCase();
    const cpf = op.CPF;
    const studentName = op['Student Name'];
    
    if (action === 'enroll') {
      await createStudent(studentName, cpf);
      await enrollStudent(cpf);
    } else if (action === 'unenroll') {
      await unenrollStudent(cpf);
    }
  }
});

// =============================================================================
// THEN Steps
// =============================================================================

Then('the {string} count should be {int}', function (field: string, expected: number) {
  expect(response.body[field]).toBe(expected);
});

Then('the student {string} should NOT be present in the list', function (studentName: string) {
  const students = response.body.students || [];
  const found = students.find((s: any) => s.name === studentName);
  expect(found).toBeUndefined();
});

Then('{string} should have status {string}', function (studentName: string, expectedStatus: string) {
  const students = response.body.students || [];
  const student = students.find((s: any) => s.name === studentName);
  expect(student).toBeDefined();
  expect(student.status).toBe(expectedStatus);
});

Then('the {string} should be {int}', function (field: string, expected: number) {
  expect(response.body[field]).toBe(expected);
});

Then('the list should contain {string} and {string}', function (name1: string, name2: string) {
  const students = response.body.students || [];
  const names = students.map((s: any) => s.name);
  
  expect(names).toContain(name1);
  expect(names).toContain(name2);
});

Then('the list should NOT contain {string}', function (studentName: string) {
  const students = response.body.students || [];
  const names = students.map((s: any) => s.name);
  
  expect(names).not.toContain(studentName);
});
