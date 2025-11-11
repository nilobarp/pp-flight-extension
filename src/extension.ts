// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "flight" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('flight.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Flight!');
	});

	context.subscriptions.push(disposable);
    
    // Register CodeLens provider
    const codeLensProvider = new CQRSCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: 'typescript', scheme: 'file' },
            codeLensProvider
        )
    );

    // Register the go to handler command
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
            
            // Check if it's a Command class (ends with 'Command')
            if (!word.endsWith('Command')) {
                vscode.window.showInformationMessage('Cursor is not on a Command class');
                return;
            }

            // Derive handler name from command name
            const handlerName = `${word}Handler`;
            
            // Search for the handler file
            const handlerFile = await findHandlerFile(handlerName);
            
            if (handlerFile) {
                const doc = await vscode.workspace.openTextDocument(handlerFile);
                await vscode.window.showTextDocument(doc);
                
                // Try to jump to the handler class definition
                await jumpToClassDefinition(doc, handlerName);
            } else {
                vscode.window.showWarningMessage(`Handler not found: ${handlerName}`);
            }
        }
    );

    context.subscriptions.push(goToHandlerDisposable);
}

async function findHandlerFile(handlerName: string): Promise<vscode.Uri | null> {
    // Convert PascalCase to kebab-case for filename
    const fileName = handlerName
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();
    
    // Search patterns
    const patterns = [
        `**/${fileName}.ts`,
        `**/${fileName}.handler.ts`,
        `**/handlers/${fileName}.ts`,
        `**/*${handlerName}*.ts`
    ];

    for (const pattern of patterns) {
        const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1);
        if (files.length > 0) {
            return files[0];
        }
    }

    return null;
}

async function jumpToClassDefinition(document: vscode.TextDocument, className: string) {
    const text = document.getText();
    const classRegex = new RegExp(`class\\s+${className}\\b`, 'g');
    const match = classRegex.exec(text);
    
    if (match) {
        const position = document.positionAt(match.index);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
    }
}

class CQRSCodeLensProvider implements vscode.CodeLensProvider {
    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        
        // Find all Command classes
        const commandRegex = /class\s+(\w+Command)\b/g;
        let match;
        
        while ((match = commandRegex.exec(text)) !== null) {
            const commandName = match[1];
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, position);
            
            const codeLens = new vscode.CodeLens(range, {
                title: `→ Go to ${commandName}Handler`,
                command: 'nestjs-cqrs-navigator.goToHandler',
                arguments: []
            });
            
            codeLenses.push(codeLens);
        }
        
        return codeLenses;
    }
}

// This method is called when your extension is deactivated
export function deactivate() {}
