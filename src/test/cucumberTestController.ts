import * as vscode from 'vscode';
import * as path from 'path';

export class CucumberTestController {
    private testController: vscode.TestController;
    private testItemsMap = new Map<string, vscode.TestItem>();

    constructor(context: vscode.ExtensionContext) {
        this.testController = vscode.tests.createTestController(
            'cucumberTestController',
            'Cucumber Tests'
        );
        context.subscriptions.push(this.testController);

        // Set up the run profile
        this.testController.createRunProfile(
            'Run',
            vscode.TestRunProfileKind.Run,
            (request, token) => this.runTests(request, token),
            true
        );

        // Watch for .feature file changes
        const featureFileWatcher = vscode.workspace.createFileSystemWatcher('**/*.feature');
        context.subscriptions.push(featureFileWatcher);

        featureFileWatcher.onDidChange(uri => this.updateTestsFromDocument(uri));
        featureFileWatcher.onDidCreate(uri => this.updateTestsFromDocument(uri));
        featureFileWatcher.onDidDelete(uri => this.removeTestsFromDocument(uri));

        // Initialize tests from all open feature files
        this.initializeTests();
    }

    private async initializeTests() {
        const featureFiles = await vscode.workspace.findFiles('**/*.feature');
        for (const uri of featureFiles) {
            await this.updateTestsFromDocument(uri);
        }
    }

    private async updateTestsFromDocument(uri: vscode.Uri) {
        const document = await vscode.workspace.openTextDocument(uri);
        await this.parseFeatureFile(document);
    }

    private removeTestsFromDocument(uri: vscode.Uri) {
        const fileId = this.getFileId(uri);
        const testItem = this.testItemsMap.get(fileId);
        if (testItem) {
            this.testController.items.delete(testItem.id);
            this.testItemsMap.delete(fileId);
        }
    }

    private getFileId(uri: vscode.Uri): string {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (workspaceFolder) {
            return path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
        }
        return uri.fsPath;
    }

    public async parseFeatureFile(document: vscode.TextDocument) {
        const uri = document.uri;
        const fileId = this.getFileId(uri);
        
        // Remove existing test item for this file
        const existingItem = this.testItemsMap.get(fileId);
        if (existingItem) {
            this.testController.items.delete(existingItem.id);
        }

        const text = document.getText();
        const lines = text.split('\n');
        
        let featureName = 'Unknown Feature';
        let featureItem: vscode.TestItem | undefined;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Match Feature:
            const featureMatch = line.match(/^Feature:\s*(.+)/);
            if (featureMatch) {
                featureName = featureMatch[1];
                const featureId = `${fileId}`;
                featureItem = this.testController.createTestItem(
                    featureId,
                    featureName,
                    uri
                );
                featureItem.range = new vscode.Range(i, 0, i, line.length);
                this.testController.items.add(featureItem);
                this.testItemsMap.set(fileId, featureItem);
            }
            
            // Match Scenario:
            const scenarioMatch = line.match(/^Scenario:\s*(.+)/);
            if (scenarioMatch && featureItem) {
                const scenarioName = scenarioMatch[1];
                const scenarioId = `${fileId}:${i}`;
                const scenarioItem = this.testController.createTestItem(
                    scenarioId,
                    scenarioName,
                    uri
                );
                scenarioItem.range = new vscode.Range(i, 0, i, line.length);
                // Store scenario name in description for later retrieval
                scenarioItem.description = scenarioName;
                featureItem.children.add(scenarioItem);
            }
        }
    }

    private async runTests(
        request: vscode.TestRunRequest,
        token: vscode.CancellationToken
    ): Promise<void> {
        const run = this.testController.createTestRun(request);
        const queue: vscode.TestItem[] = [];

        if (request.include) {
            request.include.forEach(test => queue.push(test));
        } else {
            this.testController.items.forEach(test => queue.push(test));
        }

        for (const test of queue) {
            if (token.isCancellationRequested) {
                run.skipped(test);
                continue;
            }

            if (test.children.size > 0) {
                // This is a feature file, run all scenarios
                test.children.forEach(scenario => {
                    queue.push(scenario);
                });
            } else {
                // This is a scenario, run it
                await this.runScenario(test, run);
            }
        }

        run.end();
    }

    private async findClosestPackageJsonFolder(uri: vscode.Uri): Promise<string | undefined> {
        const fs = require('fs');
        let currentDir = path.dirname(uri.fsPath);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        const rootPath = workspaceFolder?.uri.fsPath;

        while (currentDir && (!rootPath || currentDir.startsWith(rootPath))) {
            const packageJsonPath = path.join(currentDir, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                return currentDir;
            }
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                break;
            }
            currentDir = parentDir;
        }
        return rootPath;
    }

    private async runScenario(test: vscode.TestItem, run: vscode.TestRun): Promise<void> {
        run.started(test);
        
        try {
            const uri = test.uri;
            if (!uri) {
                run.errored(test, new vscode.TestMessage('No URI found for test'));
                return;
            }

            const lineNumber = test.range?.start.line;
            if (lineNumber === undefined) {
                run.errored(test, new vscode.TestMessage('No line number found for scenario'));
                return;
            }

            // Get scenario name from test label
            const scenarioName = test.label;

            // Find closest package.json folder
            const cwd = await this.findClosestPackageJsonFolder(uri);
            if (!cwd) {
                run.errored(test, new vscode.TestMessage('No package.json folder found'));
                return;
            }

            // Run cucumber command with scenario name
            run.appendOutput(`Running: npx cucumber-js -p cqrs --name="${scenarioName}"\r\n`);
            run.appendOutput(`From directory: ${cwd}\r\n`);
            
            const result = await this.executeCucumber(cwd, scenarioName);
            
            if (result.exitCode === 0) {
                run.appendOutput(`✓ Scenario passed\r\n`);
                run.passed(test);
            } else {
                const message = new vscode.TestMessage(result.stderr || result.stdout || 'Test failed');
                run.appendOutput(`✗ Scenario failed\r\n${result.stderr}\r\n${result.stdout}\r\n`);
                run.failed(test, message);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            run.errored(test, new vscode.TestMessage(message));
            run.appendOutput(`Error: ${message}\r\n`);
        }
    }

    private executeCucumber(cwd: string, scenarioName: string): Promise<{
        exitCode: number;
        stdout: string;
        stderr: string;
    }> {
        return new Promise((resolve) => {
            const { spawn } = require('child_process');
            let stdout = '';
            let stderr = '';

            // Escape special characters in scenario name for regex matching
            // Cucumber's --name option uses regex, so we need to escape regex special chars
            const escapedScenarioName = scenarioName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            const process = spawn('npx', ['cucumber-js', '-p', 'cqrs', '--name', escapedScenarioName], {
                cwd: cwd,
                shell: false
            });

            process.stdout.on('data', (data: Buffer) => {
                const output = data.toString();
                stdout += output;
            });

            process.stderr.on('data', (data: Buffer) => {
                const output = data.toString();
                stderr += output;
            });

            process.on('close', (code: number | null) => {
                resolve({
                    exitCode: code ?? 0,
                    stdout,
                    stderr
                });
            });

            process.on('error', (error: Error) => {
                resolve({
                    exitCode: 1,
                    stdout,
                    stderr: error.message
                });
            });
        });
    }

    public async runScenarioAtLine(document: vscode.TextDocument, line: number): Promise<void> {
        // Find the test item for this scenario
        const fileId = this.getFileId(document.uri);
        const scenarioId = `${fileId}:${line}`;
        
        // Search for the test item
        let testItem: vscode.TestItem | undefined;
        this.testController.items.forEach(item => {
            item.children.forEach(child => {
                if (child.id === scenarioId) {
                    testItem = child;
                }
            });
        });

        if (!testItem) {
            // Re-parse the file if test item not found
            await this.parseFeatureFile(document);
            
            // Try again
            this.testController.items.forEach(item => {
                item.children.forEach(child => {
                    if (child.id === scenarioId) {
                        testItem = child;
                    }
                });
            });
        }

        if (testItem) {
            const request = new vscode.TestRunRequest([testItem]);
            await this.runTests(request, new vscode.CancellationTokenSource().token);
        } else {
            vscode.window.showErrorMessage('Could not find test for this scenario');
        }
    }
}
