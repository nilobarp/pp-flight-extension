import * as vscode from 'vscode';

export class InjectionCodeLensProvider implements vscode.CodeLensProvider {
    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        
        // Find all @Inject decorators
        const injectRegex = /@Inject\(([\w_]+)\)/g;
        let match;
        
        while ((match = injectRegex.exec(text)) !== null) {
            const token = match[1];
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, position);
            
            const codeLens = new vscode.CodeLens(range, {
                title: `→ Go to provider of ${token}`,
                command: 'nestjs-cqrs-navigator.goToProvider',
                arguments: []
            });
            
            codeLenses.push(codeLens);
        }
        
        return codeLenses;
    }
}
