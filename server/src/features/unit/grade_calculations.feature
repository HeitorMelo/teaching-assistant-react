@unit
Feature: Grade Calculations - Domain Logic
  As a system
  I need to perform accurate grade calculations
  So that student performance is correctly evaluated

  # Layer: Unit Tests (Bottom of Testing Pyramid)
  # Context: Fast, in-memory validation of business rules
  # No database, no HTTP, no browser - pure function testing

  # ===========================================================================
  # TEST 1: Average Calculation with Null Values
  # ===========================================================================
  @average
  Scenario: Calculate average ignoring null values
    Given I have a list of grades with values [10, null, 5]
    When I calculate the average using calculateAverage
    Then the result should be 7.5

  # ===========================================================================
  # TEST 2: Divide by Zero Protection
  # ===========================================================================
  @average @edge-case
  Scenario: Calculate average returns 0 for empty grade list
    Given I have an empty list of grades
    When I calculate the average using calculateAverage
    Then the result should be 0

  # ===========================================================================
  # TEST 3: Status Grouping Logic
  # ===========================================================================
  @grouping
  Scenario: Group students by status correctly
    Given I have a list of students with statuses:
      | name    | status   |
      | Alice   | APPROVED |
      | Bob     | APPROVED |
      | Charlie | FAILED   |
    When I group students by status using groupStudentsByStatus
    Then the grouping should return:
      | status   | count |
      | APPROVED | 2     |
      | FAILED   | 1     |

  # ===========================================================================
  # TEST 4: Grade Acronym Conversion
  # ===========================================================================
  @conversion
  Scenario Outline: Convert grade acronym to numeric value
    Given I have a grade acronym "<acronym>"
    When I convert it using convertGradeToValue
    Then the numeric value should be <value>

    Examples:
      | acronym | value |
      | MA      | 10    |
      | MPA     | 7     |
      | MANA    | 0     |

  # ===========================================================================
  # TEST 5: Status Logic - Happy Path (All MA grades)
  # ===========================================================================
  @status @happy-path
  Scenario: Student with all MA grades should be APPROVED
    Given a student has the following grades:
      | goal         | grade |
      | Requirements | MA    |
      | Design       | MA    |
      | Tests        | MA    |
    When I determine the student status using determineStudentStatus
    Then the status should be "APPROVED"

  # ===========================================================================
  # TEST 6: Status Logic - Edge Case (All MANA grades)
  # ===========================================================================
  @status @edge-case
  Scenario: Student with all MANA grades should be FAILED
    Given a student has the following grades:
      | goal         | grade |
      | Requirements | MANA  |
      | Design       | MANA  |
      | Tests        | MANA  |
    When I determine the student status using determineStudentStatus
    Then the status should be "FAILED"
