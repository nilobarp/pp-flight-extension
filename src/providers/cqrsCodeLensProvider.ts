import * as vscode from 'vscode';

export class CQRSCodeLensProvider implements vscode.CodeLensProvider {
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
