import * as vscode from 'vscode';

export interface ProviderMapping {
    token: string;
    implementation: string;
    location: vscode.Location;
}

export class ProviderFinder {
    /**
     * Find the provider implementation for a given injection token
     */
    async findProviderImplementation(token: string): Promise<vscode.Location | null> {
        console.log(`Searching for provider implementation of token: ${token}`);

        // Strategy 1: Search in module files for provider mappings
        const moduleResult = await this.findInModuleProviders(token);
        if (moduleResult) {
            console.log(`Found provider in module: ${moduleResult.uri.fsPath}`);
            return moduleResult;
        }

        // Strategy 2: If token is an interface, search for implementations
        const implementationResult = await this.findInterfaceImplementation(token);
        if (implementationResult) {
            console.log(`Found interface implementation: ${implementationResult.uri.fsPath}`);
            return implementationResult;
        }

        console.log('Provider implementation not found');
        return null;
    }

    /**
     * Search in *.module.ts files for provider mappings
     * Example: { provide: REDIS_SERVICE, useClass: RedisService }
     */
    private async findInModuleProviders(token: string): Promise<vscode.Location | null> {
        try {
            const moduleFiles = await vscode.workspace.findFiles(
                '**/*.module.ts',
                '{**/node_modules/**,**/dist/**,**/out/**}',
                100
            );

            console.log(`Searching ${moduleFiles.length} module files for token: ${token}`);

            for (const file of moduleFiles) {
                const doc = await vscode.workspace.openTextDocument(file);
                const text = doc.getText();

                // Pattern: { provide: TOKEN, useClass: Implementation }
                const providePattern = new RegExp(
                    `\\{[^}]*provide:\\s*${this.escapeRegex(token)}[^}]*useClass:\\s*(\\w+)[^}]*\\}`,
                    'g'
                );

                const match = providePattern.exec(text);
                if (match) {
                    const implementationClass = match[1];
                    console.log(`Found provider mapping: ${token} -> ${implementationClass}`);

                    // Find the class definition in the file or workspace
                    const classLocation = await this.findClassDefinition(implementationClass);
                    if (classLocation) {
                        return classLocation;
                    }
                }
            }
        } catch (error) {
            console.error('Error searching module providers:', error);
        }

        return null;
    }

    /**
     * Find interface implementations by searching for classes that implement the interface
     */
    private async findInterfaceImplementation(interfaceName: string): Promise<vscode.Location | null> {
        try {
            // Use workspace symbols to find the interface
            const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
                'vscode.executeWorkspaceSymbolProvider',
                interfaceName
            );

            if (!symbols || symbols.length === 0) {
                return null;
            }

            // Find interface symbol
            const interfaceSymbol = symbols.find(
                s => s.kind === vscode.SymbolKind.Interface && s.name === interfaceName
            );

            if (!interfaceSymbol) {
                return null;
            }

            // Search for classes that implement this interface
            const files = await vscode.workspace.findFiles(
                '**/*.ts',
                '{**/node_modules/**,**/dist/**,**/out/**}',
                200
            );

            for (const file of files) {
                const doc = await vscode.workspace.openTextDocument(file);
                const text = doc.getText();

                // Pattern: class SomeClass implements InterfaceName
                const implementsPattern = new RegExp(
                    `class\\s+(\\w+)[^{]*implements[^{]*\\b${this.escapeRegex(interfaceName)}\\b`,
                    'g'
                );

                const match = implementsPattern.exec(text);
                if (match) {
                    const className = match[1];
                    console.log(`Found class implementing ${interfaceName}: ${className}`);

                    const classLocation = await this.findClassInDocument(doc, className);
                    if (classLocation) {
                        return classLocation;
                    }
                }
            }
        } catch (error) {
            console.error('Error finding interface implementation:', error);
        }

        return null;
    }

    /**
     * Find a class definition in the workspace
     */
    private async findClassDefinition(className: string): Promise<vscode.Location | null> {
        const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            'vscode.executeWorkspaceSymbolProvider',
            className
        );

        if (symbols && symbols.length > 0) {
            const classSymbol = symbols.find(
                s => s.kind === vscode.SymbolKind.Class && s.name === className
            );

            if (classSymbol) {
                return classSymbol.location;
            }
        }

        return null;
    }

    /**
     * Find a class in a specific document
     */
    private async findClassInDocument(
        document: vscode.TextDocument,
        className: string
    ): Promise<vscode.Location | null> {
        const text = document.getText();
        const classRegex = new RegExp(`class\\s+${this.escapeRegex(className)}\\b`, 'g');
        const match = classRegex.exec(text);

        if (match) {
            const position = document.positionAt(match.index);
            const range = new vscode.Range(position, position);
            return new vscode.Location(document.uri, range);
        }

        return null;
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
