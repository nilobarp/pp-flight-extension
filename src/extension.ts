// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CQRSCodeLensProvider } from './providers/cqrsCodeLensProvider';
import { registerGoToHandlerCommand } from './commands/goToHandler';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('"flight extension" is now active!');

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

    // Register commands
    registerGoToHandlerCommand(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
