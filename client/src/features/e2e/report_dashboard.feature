@e2e @gui
Feature: Report Dashboard - E2E GUI Tests
  As a professor
  I want to view class performance reports in the browser
  So that I can analyze student performance visually

  # Layer: E2E Tests (Top of Testing Pyramid)
  # Context: Browser automation with Puppeteer
  # Focus: User visibility, rendering, and interaction
  # Slow execution - use sparingly for critical paths

  Background:
    Given the application is running at "http://127.0.0.1:3004"
    And the API server is running at "http://127.0.0.1:3005"

  # ===========================================================================
  # TEST 1: Critical Components Visibility
  # ===========================================================================
  @critical-path
  Scenario: Report modal displays all critical components
    Given a test class "E2E Dashboard Test" exists with students and grades
    And I am on the Classes page
    When I click the Report button for the test class
    Then I should see the report modal
    And I should see the "Enrollment Statistics" section
    And I should see the "Student Status Distribution" pie chart container
    And I should see the "Evaluation Performance" bar chart container
    And I should see the students table

  # ===========================================================================
  # TEST 2: Data Formatting - Null Grade Display
  # ===========================================================================
  @data-formatting
  Scenario: Students with no grades display hyphen instead of NaN
    Given a test class "Formatting Test" exists
    And the class has a student "No Grades Student" with no evaluations
    And I am on the Classes page
    When I click the Report button for the test class
    Then I should see the report modal
    And the student "No Grades Student" grade cell should display "–"
    And no cell should display "NaN"
    And no cell should display "undefined"

  # ===========================================================================
  # TEST 3: Empty State UI
  # ===========================================================================
  @empty-state
  Scenario: Empty class displays proper empty state message
    Given a test class "Empty State Test" exists with no students
    And I am on the Classes page
    When I click the Report button for the test class
    Then I should see the report modal
    And the enrollment count should show "0"
    And I should see an empty state message or illustration
    And the charts should display gracefully with no data

  # ===========================================================================
  # TEST 4: Modal Interaction - Close Behavior
  # ===========================================================================
  @interaction
  Scenario: Report modal closes correctly
    Given a test class "Close Test" exists with students
    And I am on the Classes page
    When I click the Report button for the test class
    Then I should see the report modal
    When I click the close button on the modal
    Then the report modal should not be visible
    And I should see the classes table

  # ===========================================================================
  # TEST 5: Status Colors and Visual Indicators
  # ===========================================================================
  @visual
  Scenario: Status indicators display correct colors
    Given a test class "Visual Test" exists with mixed student statuses
    And I am on the Classes page
    When I click the Report button for the test class
    Then I should see the report modal
    And approved students should have a green indicator
    And failed students should have a red indicator
    And pending students should have an orange indicator

  # ===========================================================================
  # TEST 6: Pie Chart Data Verification via SVG DOM Inspection
  # ===========================================================================
  @chart-data @pie-chart
  Scenario: Pie Chart renders correct data segments
    Given I am viewing the report for a class with "1 Approved" and "1 Failed" student
    When I look at the "Student Status Distribution" pie chart
    Then I should see exactly 2 distinct segments in the chart SVG
    And the legend should display "Approved" and "Failed"

  # ===========================================================================
  # TEST 7: Bar Chart Data Verification via Performance Table
  # ===========================================================================
  @chart-data @bar-chart
  Scenario: Bar Chart data is correctly reflected in the performance table
    Given I am viewing the report for a class where goal "Tests" has average "10.0"
    When I look at the "Evaluation Performance" section
    Then the performance table should show goal "Tests" with average "10.00"
    And the bar chart should render with at least 1 data point
