// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CQRSCodeLensProvider } from './providers/cqrsCodeLensProvider';
import { InjectionCodeLensProvider } from './providers/injectionCodeLensProvider';
import { FeatureFileCodeLensProvider } from './providers/featureFileCodeLensProvider';
import { registerGoToHandlerCommand } from './commands/goToHandler';
import { registerGoToProviderCommand } from './commands/goToProvider';
import { registerGoToStepDefinitionCommand } from './commands/goToStepDefinition';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('"flight extension" is now active!');

	// Register sample hello world command
	const disposable = vscode.commands.registerCommand('flight.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Flight!');
	});
	context.subscriptions.push(disposable);
    
    // Register CodeLens providers
    const cqrsCodeLensProvider = new CQRSCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: 'typescript', scheme: 'file' },
            cqrsCodeLensProvider
        )
    );

    const injectionCodeLensProvider = new InjectionCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { language: 'typescript', scheme: 'file' },
            injectionCodeLensProvider
        )
    );

    const featureFileCodeLensProvider = new FeatureFileCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            { pattern: '**/*.feature' },
            featureFileCodeLensProvider
        )
    );

    // Register commands
    registerGoToHandlerCommand(context);
    registerGoToProviderCommand(context);
    registerGoToStepDefinitionCommand(context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
