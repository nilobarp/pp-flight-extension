import * as vscode from 'vscode';
import { HandlerFinder } from '../services/handlerFinder';

export function registerGoToHandlerCommand(context: vscode.ExtensionContext): void {
    const handlerFinder = new HandlerFinder();
    
    const goToHandlerDisposable = vscode.commands.registerCommand(
        'nestjs-cqrs-navigator.goToHandler',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const document = editor.document;
            const position = editor.selection.active;
            
            // Get the word at cursor position
            const wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange) {
                vscode.window.showInformationMessage('No command class found at cursor');
                return;
            }

            const word = document.getText(wordRange);
            
            // Check if it's a Command or Query class
            const isCommand = word.endsWith('Command');
            const isQuery = word.endsWith('Query');
            
            if (!isCommand && !isQuery) {
                vscode.window.showInformationMessage('Cursor is not on a Command or Query class');
                return;
            }

            // Derive handler name from command/query name
            const handlerName = `${word}Handler`;
            const type = isCommand ? 'Command' : 'Query';
            
            // Search for the handler
            const handlerLocation = await handlerFinder.findHandler(handlerName, word);
            
            if (handlerLocation) {
                const doc = await vscode.workspace.openTextDocument(handlerLocation.uri);
                await vscode.window.showTextDocument(doc, {
                    selection: handlerLocation.range
                });
            } else {
                vscode.window.showWarningMessage(`${type} handler not found: ${handlerName}`);
            }
        }
    );

    context.subscriptions.push(goToHandlerDisposable);
}
