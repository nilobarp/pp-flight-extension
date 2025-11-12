import * as vscode from 'vscode';
import { ProviderFinder } from '../services/providerFinder';

export function registerGoToProviderCommand(context: vscode.ExtensionContext): void {
    const providerFinder = new ProviderFinder();
    
    const goToProviderDisposable = vscode.commands.registerCommand(
        'nestjs-cqrs-navigator.goToProvider',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const document = editor.document;
            const position = editor.selection.active;
            
            // Get the token at cursor
            const token = await getInjectionToken(document, position);
            if (!token) {
                vscode.window.showInformationMessage('No injection token found at cursor');
                return;
            }

            console.log(`Found injection token: ${token}`);
            
            // Find the provider implementation
            const providerLocation = await providerFinder.findProviderImplementation(token);
            
            if (providerLocation) {
                const doc = await vscode.workspace.openTextDocument(providerLocation.uri);
                await vscode.window.showTextDocument(doc, {
                    selection: providerLocation.range
                });
            } else {
                vscode.window.showWarningMessage(`Provider implementation not found for: ${token}`);
            }
        }
    );

    context.subscriptions.push(goToProviderDisposable);
}

/**
 * Extract the injection token from @Inject() decorator
 */
async function getInjectionToken(
    document: vscode.TextDocument,
    position: vscode.Position
): Promise<string | null> {
    const line = document.lineAt(position.line);
    const lineText = line.text;

    // Check if we're on a line with @Inject
    if (lineText.includes('@Inject')) {
        // Extract token from @Inject(TOKEN)
        const injectMatch = /@Inject\(([\w_]+)\)/.exec(lineText);
        if (injectMatch) {
            return injectMatch[1];
        }
    }

    // Check if cursor is on a parameter with type annotation
    const wordRange = document.getWordRangeAtPosition(position);
    if (!wordRange) {
        return null;
    }

    const word = document.getText(wordRange);

    // Look for @Inject decorator above this line
    for (let i = position.line; i >= Math.max(0, position.line - 5); i--) {
        const checkLine = document.lineAt(i).text;
        if (checkLine.includes('@Inject')) {
            const injectMatch = /@Inject\(([\w_]+)\)/.exec(checkLine);
            if (injectMatch) {
                return injectMatch[1];
            }
        }
    }

    // If no @Inject found, use the type at cursor (for interface navigation)
    return word;
}
