Feature: IgnorePatterns
  Scenario: Markdown
    When I test patterns for "test.md"
    Then the output should contain exactly:
        And the exit status should be 0

  Scenario: AsciiDoc
    When I test patterns for "test.adoc"
    Then the output should contain exactly:
    And the exit status should be 0

  Scenario: reStructuredText
    When I test patterns for "test.rst"
    Then the output should contain exactly:
    And the exit status should be 0
