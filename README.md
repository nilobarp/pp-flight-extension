# Flight

A VS Code extension for navigating NestJS CQRS patterns, dependency injection, and running Cucumber test scenarios with full Test Explorer integration.

## Features

### NestJS Navigation
- **Go to Handler**: Navigate from commands, queries, and events to their handlers/subscribers
- **Go to Provider**: Navigate to provider implementations from injection points
- Code lens integration for quick navigation in TypeScript files

### Cucumber Testing & Navigation
- **Run Individual Scenarios**: Execute Cucumber scenarios directly from feature files with profile-specific run buttons
- **Test Explorer Integration**: Full integration with VS Code's native Test Explorer showing all scenarios organized by feature and profile
- **Profile-Based Testing**: Support for multiple Cucumber profiles (e.g., @cqrs, @api) with separate run buttons for each
- **Go to Step Definition**: Navigate from Gherkin steps in `.feature` files to their TypeScript step definitions
- **Flexible matching**: Works regardless of whether step is defined with `@given`, `@when`, or `@then` - they're interchangeable
- **Smart pattern recognition**: Handles regex patterns, parameterized steps (`{}`), and exact string matches
- **Table-aware**: Supports steps with DataTable arguments (steps ending with `:`)
- Code lens integration on every step and scenario

## Usage

### NestJS CQRS & DI
Right-click in any TypeScript file to access Flight commands via the context menu:
- **Go to Handler**: Jump from a Command/Query/Event class to its handler or subscriber
- **Go to Provider Implementation**: Navigate to provider definitions from injection points

### Cucumber Testing
Open any `.feature` file and:

#### Running Tests
- **CodeLens Buttons**: Click "▶ Run @profile" buttons above scenarios to run with specific profiles
- **Test Explorer**: View all scenarios in the Test Explorer panel, organized by:
  - Feature files
  - Profiles (@cqrs, @api, etc.)
  - Individual scenarios
- **Run from Explorer**: Click run buttons in Test Explorer to execute scenarios or entire feature files
- **Real-time Results**: See pass/fail status and detailed output in the Test Explorer

#### Navigation
- Click the "→ Go to step definition" code lens above any Given/When/Then step
- Right-click on a step line and select "Go to Step Definition" from the Flight menu
- Automatically finds matching step definitions in your step files

## Configuration

Configure Cucumber profiles in your VS Code settings:

```json
{
  "flight.cucumber.profiles": ["cqrs", "api", "integration"],
  "flight.cucumber.defaultProfile": "cqrs"
}
```

- **`flight.cucumber.profiles`**: Array of profile names to organize tests by (default: `["cqrs", "api"]`)
- **`flight.cucumber.defaultProfile`**: Default profile for CodeLens run buttons (default: `"cqrs"`)

## Requirements

- VS Code 1.105.0 or higher
- TypeScript project (for NestJS features)
- Cucumber-js with configured profiles in package.json (for testing features)
- cucumber-tsflow (for BDD step definitions)

## Supported Patterns

- NestJS `@CommandHandler`, `@QueryHandler`, `@EventsHandler` decorators
- NestJS dependency injection via `@Inject()` and constructor parameters
- Cucumber-tsflow `@given()`, `@when()`, `@then()`, `@binding()` decorators
- Gherkin `.feature` files with Given/When/Then/And/But steps
- Cucumber profiles defined with tags (e.g., @cqrs, @api)

## How Testing Works

1. **Automatic Discovery**: The extension scans all `.feature` files and parses scenarios with their tags
2. **Profile Organization**: Scenarios are grouped by their tags matching configured profiles
3. **Closest package.json**: Tests run from the directory containing the nearest package.json
4. **Command Execution**: Runs `npx cucumber-js -p <profile> --name="<scenario name>"`
5. **Results Integration**: Test results appear in VS Code's Test Explorer with pass/fail status and detailed output

## Release Notes

### 0.2.0

Major testing features added:
- **Test Explorer Integration**: Full integration with VS Code's native Testing panel
- **Profile-Based Testing**: Support for multiple Cucumber profiles with tag-based organization
- **Individual Scenario Execution**: Run specific scenarios with profile-specific CodeLens buttons
- **Smart Test Discovery**: Automatic parsing of feature files with tag and profile detection
- **Hierarchical Organization**: Tests organized as Feature → Profile → Scenario
- **Special Character Support**: Proper handling of scenario names with special characters
- **Accurate Exit Codes**: Correct reporting of test failures and passes

### 0.1.0

Enhanced Cucumber step matching:
- **Flexible keyword matching**: Steps can now be defined with any keyword (Given/When/Then) and matched regardless of which keyword is used in the feature file
- **Improved regex pattern matching**: Better support for parameterized steps with `{}` placeholders, capture groups, and regex patterns
- **Smart scoring**: Prioritizes exact matches over parameterized matches for more accurate navigation
- **Table support**: Properly handles steps with trailing colons that have DataTable arguments
- **Better error handling**: Graceful fallback to substring matching when regex patterns are complex

### 0.0.1

Initial release of Flight extension with support for:
- NestJS CQRS navigation (commands, queries, events)
- NestJS dependency injection navigation
- Cucumber/BDD step definition navigation

---

**Enjoy!**
