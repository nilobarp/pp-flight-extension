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
            
            // Search for the handler using TypeScript language server
            const handlerLocation = await findHandlerUsingLanguageServer(handlerName, word);
            
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

async function findHandlerUsingLanguageServer(
    handlerName: string,
    commandName: string
): Promise<vscode.Location | null> {
    console.log(`Searching for handler: ${handlerName} for command: ${commandName}`);
    
    // Search for handler class in workspace using symbols
    const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
        'vscode.executeWorkspaceSymbolProvider',
        handlerName
    );

    console.log(`Found ${symbols?.length || 0} symbols for ${handlerName}`);
    
    if (symbols && symbols.length > 0) {
        symbols.forEach(s => console.log(`Symbol: ${s.name}, kind: ${s.kind}, location: ${s.location.uri.fsPath}`));
        
        // Find the class symbol (not constructor or methods)
        const handlerClass = symbols.find(
            symbol => symbol.kind === vscode.SymbolKind.Class && symbol.name === handlerName
        );
        
        if (handlerClass) {
            console.log(`Found handler class via symbols: ${handlerClass.location.uri.fsPath}`);
            return handlerClass.location;
        }
    }

    // Fallback 1: Search using text search for @CommandHandler or @QueryHandler decorator
    console.log('Trying decorator search...');
    const decoratorResults = await findHandlerByDecorator(commandName, handlerName);
    if (decoratorResults) {
        console.log(`Found via decorator: ${decoratorResults.uri.fsPath}`);
        return decoratorResults;
    }

    // Fallback 2: search for files containing the handler name
    console.log('Trying file name search...');
    const handlerFile = await findHandlerFile(handlerName);
    if (handlerFile) {
        console.log(`Found handler file: ${handlerFile.fsPath}`);
        const doc = await vscode.workspace.openTextDocument(handlerFile);
        const location = await findClassInDocument(doc, handlerName);
        if (location) {
            return location;
        }
    }

    console.log('Handler not found in any search method');
    return null;
}

async function findHandlerByDecorator(commandName: string, handlerName: string): Promise<vscode.Location | null> {
    try {
        const exclude = '{**/node_modules/**,**/dist/**,**/out/**}';
        
        // Search all TypeScript files in common NestJS locations
        const patterns = [
            '**/*handler*.ts',
            '**/*handlers*.ts',
            '**/commands/**/*.ts',
            '**/queries/**/*.ts',
            '**/cqrs/**/*.ts',
        ];

        const allFiles: vscode.Uri[] = [];
        for (const pattern of patterns) {
            const files = await vscode.workspace.findFiles(pattern, exclude, 500);
            allFiles.push(...files);
        }

        // Remove duplicates
        const uniqueFiles = Array.from(new Set(allFiles.map(f => f.fsPath))).map(p => vscode.Uri.file(p));
        
        console.log(`Searching ${uniqueFiles.length} files for decorator with ${commandName}`);

        for (const file of uniqueFiles) {
            try {
                const doc = await vscode.workspace.openTextDocument(file);
                const text = doc.getText();
                
                // Check if this file contains the decorator (handle different spacing/formatting)
                const decoratorPatterns = [
                    `@CommandHandler(${commandName})`,
                    `@QueryHandler(${commandName})`,
                    `@CommandHandler( ${commandName} )`,
                    `@QueryHandler( ${commandName} )`,
                ];
                
                let foundDecorator = false;
                let decoratorIndex = -1;
                
                for (const pattern of decoratorPatterns) {
                    if (text.includes(pattern)) {
                        foundDecorator = true;
                        decoratorIndex = text.indexOf(pattern);
                        console.log(`Found decorator in ${file.fsPath}`);
                        break;
                    }
                }
                
                if (foundDecorator && decoratorIndex >= 0) {
                    // Find the class after the decorator
                    const afterDecorator = text.substring(decoratorIndex);
                    const classMatch = /export\s+class\s+(\w+)/g.exec(afterDecorator);
                    
                    if (classMatch) {
                        const className = classMatch[1];
                        console.log(`Found class: ${className}`);
                        const classPosition = doc.positionAt(decoratorIndex + classMatch.index);
                        const range = new vscode.Range(classPosition, classPosition);
                        return new vscode.Location(doc.uri, range);
                    }
                }
            } catch (error) {
                console.error(`Error reading file ${file.fsPath}:`, error);
                continue;
            }
        }
    } catch (error) {
        console.error('Error searching for handler:', error);
    }

    return null;
}

async function findClassInDocument(
    document: vscode.TextDocument,
    className: string
): Promise<vscode.Location | null> {
    const text = document.getText();
    const classRegex = new RegExp(`class\\s+${className}\\b`, 'g');
    const match = classRegex.exec(text);
    
    if (match) {
        const position = document.positionAt(match.index);
        const range = new vscode.Range(position, position);
        return new vscode.Location(document.uri, range);
    }
    
    return null;
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
        
        // Find all Command and Query classes
        const commandRegex = /class\s+(\w+(?:Command|Query))\b/g;
        let match;
        
        while ((match = commandRegex.exec(text)) !== null) {
            const commandName = match[1];
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, position);
            
            const type = commandName.endsWith('Query') ? 'Query' : 'Command';
            
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
