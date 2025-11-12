# Flight

A VS Code extension for navigating NestJS CQRS patterns, dependency injection, and Cucumber test scenarios.

## Features

### NestJS Navigation
- **Go to Handler**: Navigate from commands, queries, and events to their handlers/subscribers
- **Go to Provider**: Navigate to provider implementations from injection points
- Code lens integration for quick navigation in TypeScript files

### Cucumber/BDD Navigation
- **Go to Step Definition**: Navigate from Gherkin steps in `.feature` files to their TypeScript step definitions
- **Flexible matching**: Works regardless of whether step is defined with `@given`, `@when`, or `@then` - they're interchangeable
- **Smart pattern recognition**: Handles regex patterns, parameterized steps (`{}`), and exact string matches
- **Table-aware**: Supports steps with DataTable arguments (steps ending with `:`)
- Code lens integration on every step for instant navigation

## Usage

### NestJS CQRS & DI
Right-click in any TypeScript file to access Flight commands via the context menu:
- **Go to Handler**: Jump from a Command/Query/Event class to its handler or subscriber
- **Go to Provider Implementation**: Navigate to provider definitions from injection points

### Cucumber Features
Open any `.feature` file and:
- Click the "→ Go to step definition" code lens above any Given/When/Then step
- Right-click on a step line and select "Go to Step Definition" from the Flight menu
- Automatically finds matching step definitions in your step files

## Requirements

- VS Code 1.105.0 or higher
- TypeScript project (for NestJS features)
- Cucumber-js with cucumber-tsflow (for BDD features)

## Supported Patterns

- NestJS `@CommandHandler`, `@QueryHandler`, `@EventsHandler` decorators
- NestJS dependency injection via `@Inject()` and constructor parameters
- Cucumber-tsflow `@given()`, `@when()`, `@then()`, `@binding()` decorators
- Gherkin `.feature` files with Given/When/Then/And/But steps

## Release Notes

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

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
