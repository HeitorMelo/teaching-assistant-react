@integration
Feature: Data Persistence - Integration Layer Tests
  As a system
  I need data changes to be immediately reflected in API responses
  So that reports always show current and accurate information

  # Layer: Integration Tests (Middle-Upper of Testing Pyramid)
  # Context: Tests flow between API and data persistence layer
  # Verifies write-read consistency and data integrity

  Background:
    Given the API server is running and connected to the data store
    And a test class "Integration Test Class" exists

  # ===========================================================================
  # TEST 1: Write-Read Consistency - Student Enrollment
  # ===========================================================================
  @write-read
  Scenario: New student enrollment is immediately reflected in report
    Given the class has 2 enrolled students initially
    When I enroll a new student "New Student" with CPF "77777777701"
    And I request the class report
    Then the "totalEnrolled" count should be 3

  # ===========================================================================
  # TEST 2: Data Deletion - Student Unenrollment
  # ===========================================================================
  @deletion
  Scenario: Student unenrollment is immediately reflected in report
    Given the class has the following enrolled students:
      | name      | cpf         |
      | Student A | 66666666601 |
      | Student B | 66666666602 |
      | Student C | 66666666603 |
    And all students have complete grades
    When I unenroll student with CPF "66666666603"
    And I request the class report
    Then the "totalEnrolled" count should be 2
    And the student "Student C" should not appear in the students list

  # ===========================================================================
  # TEST 3: Grade Update Consistency
  # ===========================================================================
  @update
  Scenario: Grade updates are immediately reflected in calculations
    Given the class has a student "Grade Test" with CPF "55555555501"
    And the student has grades: Requirements=MA, Design=MA, Tests=MANA
    When I update the student's "Tests" grade to "MA"
    And I request the class report
    Then the student "Grade Test" should have status "APPROVED"
    And the "approvedCount" should be 1

  # ===========================================================================
  # TEST 4: Concurrent Data Integrity
  # ===========================================================================
  @integrity
  Scenario: Multiple operations maintain data integrity
    Given the class has 1 enrolled student initially
    When I perform the following operations in sequence:
      | operation | student     | cpf         |
      | enroll    | Student X   | 44444444401 |
      | enroll    | Student Y   | 44444444402 |
      | unenroll  | -           | 44444444401 |
    And I request the class report
    Then the "totalEnrolled" count should be 2
    And the report should contain students:
      | name      |
      | Student Y |
