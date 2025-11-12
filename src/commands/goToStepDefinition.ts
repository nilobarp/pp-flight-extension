import * as vscode from 'vscode';
import { StepDefinitionFinder } from '../services/stepDefinitionFinder';

export function registerGoToStepDefinitionCommand(context: vscode.ExtensionContext): void {
    const stepFinder = new StepDefinitionFinder();
    
    const goToStepDisposable = vscode.commands.registerCommand(
        'nestjs-cqrs-navigator.goToStepDefinition',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const document = editor.document;
            
            // Only work with .feature files
            if (!document.fileName.endsWith('.feature')) {
                vscode.window.showInformationMessage('This command only works in .feature files');
                return;
            }

            const position = editor.selection.active;
            const line = document.lineAt(position.line);
            const lineText = line.text;
            
            // Extract step information
            const stepInfo = StepDefinitionFinder.extractStepText(lineText);
            
            if (!stepInfo) {
                vscode.window.showInformationMessage('Cursor is not on a Gherkin step');
                return;
            }

            // Show progress
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Searching for step definition...',
                    cancellable: false
                },
                async () => {
                    // Search for the step definition
                    const location = await stepFinder.findStepDefinition(
                        stepInfo.text,
                        stepInfo.keyword
                    );
                    
                    if (location) {
                        const doc = await vscode.workspace.openTextDocument(location.uri);
                        await vscode.window.showTextDocument(doc, {
                            selection: location.range,
                            preview: false
                        });
                    } else {
                        vscode.window.showWarningMessage(
                            `Step definition not found: ${stepInfo.keyword} ${stepInfo.text}`
                        );
                    }
                }
            );
        }
    );

    context.subscriptions.push(goToStepDisposable);
}
