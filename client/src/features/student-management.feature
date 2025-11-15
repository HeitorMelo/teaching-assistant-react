Feature: Student Management
  As a professor
  I want to add students to the system
  So that I can manage student information

  Background:
    Given the student management system is running
    And the server is available

  Scenario: Add a new student without class association
    Given there is no student with CPF "12345678901" in the system
    When I navigate to the Students tab
    And I fill in the student form with:
      | field | value                    |
      | name  | Test Student             |
      | cpf   | 12345678901             |
      | email | test.student@email.com   |
    And I submit the student form
    Then I should see "Test Student" in the student list
    And the student should have CPF "12345678901"
    And the student should have email "test.student@email.com"
    And I clean up by removing the test student