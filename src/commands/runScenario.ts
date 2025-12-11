import * as vscode from 'vscode';
import { CucumberTestController } from '../test/cucumberTestController';

export function registerRunScenarioCommand(
    context: vscode.ExtensionContext,
    testController: CucumberTestController
) {
    const runScenarioCommand = vscode.commands.registerCommand(
        'flight.runScenario',
        async (document: vscode.TextDocument, line: number) => {
            await testController.runScenarioAtLine(document, line);
        }
    );
    context.subscriptions.push(runScenarioCommand);
    
    // New command for running with specific profile
    const runScenarioWithProfileCommand = vscode.commands.registerCommand(
        'flight.runScenarioWithProfile',
        async (document: vscode.TextDocument, line: number, profile: string) => {
            await testController.runScenarioAtLine(document, line, profile);
        }
    );
    context.subscriptions.push(runScenarioWithProfileCommand);
}

export function registerDebugScenarioCommand(
    context: vscode.ExtensionContext,
    testController: CucumberTestController
) {
    const debugScenarioCommand = vscode.commands.registerCommand(
        'flight.debugScenario',
        async (document: vscode.TextDocument, line: number) => {
            // Get workspace folder
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            // Find scenario name at the given line
            const path = require('path');
            const fs = require('fs');
            const text = document.getText();
            const lines = text.split('\n');
            const scenarioLine = lines[line]?.trim();
            const scenarioMatch = scenarioLine?.match(/^Scenario:\s*(.+)/);
            
            if (!scenarioMatch) {
                vscode.window.showErrorMessage('No scenario found at this line');
                return;
            }
            
            const scenarioName = scenarioMatch[1];

            // Get default profile from configuration
            const config = vscode.workspace.getConfiguration('flight.cucumber');
            const defaultProfile = config.get('defaultProfile', 'cqrs');

            // Escape special characters in scenario name for regex matching
            // Cucumber's --name option uses regex, so we need to escape regex special chars
            const escapedScenarioName = scenarioName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Find closest package.json folder
            let currentDir = path.dirname(document.uri.fsPath);
            let packageJsonDir = workspaceFolder.uri.fsPath;
            
            while (currentDir && currentDir.startsWith(workspaceFolder.uri.fsPath)) {
                const packageJsonPath = path.join(currentDir, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    packageJsonDir = currentDir;
                    break;
                }
                const parentDir = path.dirname(currentDir);
                if (parentDir === currentDir) {
                    break;
                }
                currentDir = parentDir;
            }

            // Start debug session
            await vscode.debug.startDebugging(workspaceFolder, {
                type: 'node',
                request: 'launch',
                name: `Debug Scenario: ${scenarioName}`,
                program: '${workspaceFolder}/node_modules/.bin/cucumber-js',
                args: ['-p', defaultProfile, '--name', escapedScenarioName],
                cwd: packageJsonDir,
                console: 'integratedTerminal',
                internalConsoleOptions: 'neverOpen'
            });
        }
    );
    context.subscriptions.push(debugScenarioCommand);
}
