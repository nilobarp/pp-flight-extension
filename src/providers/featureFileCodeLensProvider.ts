import * as vscode from 'vscode';
import { StepDefinitionFinder } from '../services/stepDefinitionFinder';

export class FeatureFileCodeLensProvider implements vscode.CodeLensProvider {
    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        // Only provide code lenses for .feature files
        if (!document.fileName.endsWith('.feature')) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Add run button for Scenario lines
            const scenarioMatch = trimmedLine.match(/^Scenario:\s*(.+)/);
            if (scenarioMatch) {
                const position = new vscode.Position(i, 0);
                const range = new vscode.Range(position, position);

                // Add "Run" button
                const runCodeLens = new vscode.CodeLens(range, {
                    title: '▶ Run',
                    command: 'flight.runScenario',
                    arguments: [document, i]
                });
                codeLenses.push(runCodeLens);

                // Add "Debug" button
                const debugCodeLens = new vscode.CodeLens(range, {
                    title: '🐛 Debug',
                    command: 'flight.debugScenario',
                    arguments: [document, i]
                });
                codeLenses.push(debugCodeLens);
            }
            
            const stepInfo = StepDefinitionFinder.extractStepText(line);

            if (stepInfo) {
                const position = new vscode.Position(i, 0);
                const range = new vscode.Range(position, position);

                const codeLens = new vscode.CodeLens(range, {
                    title: `→ Go to step definition`,
                    command: 'nestjs-cqrs-navigator.goToStepDefinition',
                    arguments: []
                });

                codeLenses.push(codeLens);
            }
        }

        return codeLenses;
    }
}
