@service
Feature: Report API - Service Layer Tests
  As an API consumer
  I need the Report API to return accurate and well-structured data
  So that client applications can display correct performance reports

  # Layer: Service Tests (Middle of Testing Pyramid)
  # Context: Tests API Controller and HTTP responses using mocked data
  # Fast execution with supertest - no browser automation

  Background:
    Given the API server is running
    And the test database is initialized

  # ===========================================================================
  # TEST 1: Schema Validation
  # ===========================================================================
  @schema
  Scenario: Report API response matches expected JSON schema
    Given a class "Software Engineering" exists with enrolled students
    When I request the report for that class
    Then the response status should be 200
    And the response body should have the following keys:
      | key                   |
      | classId               |
      | topic                 |
      | semester              |
      | year                  |
      | totalEnrolled         |
      | studentsAverage       |
      | approvedCount         |
      | approvedFinalCount    |
      | notApprovedCount      |
      | failedByAbsenceCount  |
      | pendingCount          |
      | evaluationPerformance |
      | students              |
      | generatedAt           |

  # ===========================================================================
  # TEST 2: Calculation Accuracy
  # ===========================================================================
  @calculation
  Scenario: Report API returns accurate calculated averages
    Given a class "Test Class" exists with the following students:
      | name    | cpf         | goal1 | goal2 | goal3 |
      | Alice   | 11111111111 | MA    | MA    | MA    |
      | Bob     | 22222222222 | MPA   | MPA   | MPA   |
      | Charlie | 33333333333 | MANA  | MANA  | MANA  |
    When I request the report for that class
    Then the response status should be 200
    And the "totalEnrolled" should be 3
    And the "approvedCount" should be 1
    And the "notApprovedCount" should be 1
    And the "pendingCount" should be 1

  # ===========================================================================
  # TEST 3: Error Handling - Non-existent Class
  # ===========================================================================
  @error
  Scenario: Report API returns 404 for non-existent class
    Given no class exists with ID "nonexistent-class-id-12345"
    When I request the report for class ID "nonexistent-class-id-12345"
    Then the response status should be 404
    And the response body should contain an "error" message

  # ===========================================================================
  # TEST 4: Pending State - No Evaluations
  # ===========================================================================
  @pending-state
  Scenario: Report API handles class with no evaluations gracefully
    Given a class "Empty Evaluations Class" exists with enrolled students but no grades
    When I request the report for that class
    Then the response status should be 200
    And the "studentsAverage" should be null
    And the "pendingCount" should equal "totalEnrolled"
    And the "evaluationPerformance" should be an empty array
    And no field should contain "undefined" or "NaN"

  # ===========================================================================
  # TEST 5: Empty Class State
  # ===========================================================================
  @empty-state
  Scenario: Report API handles empty class gracefully
    Given a class "Empty Class" exists with no enrolled students
    When I request the report for that class
    Then the response status should be 200
    And the "totalEnrolled" should be 0
    And the "studentsAverage" should be null
    And the "students" should be an empty array
