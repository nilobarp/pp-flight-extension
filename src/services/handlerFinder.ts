import * as vscode from 'vscode';

export class HandlerFinder {
    async findHandler(handlerName: string, commandName: string): Promise<vscode.Location | null> {
        console.log(`Searching for handler: ${handlerName} for command: ${commandName}`);
        
        // Strategy 1: Use workspace symbols (TypeScript language server)
        const symbolResult = await this.findBySymbol(handlerName);
        if (symbolResult) {
            console.log(`Found handler class via symbols: ${symbolResult.uri.fsPath}`);
            return symbolResult;
        }

        // Strategy 2: Search by decorator
        console.log('Trying decorator search...');
        const decoratorResult = await this.findByDecorator(commandName);
        if (decoratorResult) {
            console.log(`Found via decorator: ${decoratorResult.uri.fsPath}`);
            return decoratorResult;
        }

        // Strategy 3: Search by file name
        console.log('Trying file name search...');
        const fileResult = await this.findByFileName(handlerName);
        if (fileResult) {
            return fileResult;
        }

        console.log('Handler not found in any search method');
        return null;
    }

    private async findBySymbol(handlerName: string): Promise<vscode.Location | null> {
        const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            'vscode.executeWorkspaceSymbolProvider',
            handlerName
        );

        console.log(`Found ${symbols?.length || 0} symbols for ${handlerName}`);
        
        if (symbols && symbols.length > 0) {
            symbols.forEach(s => console.log(`Symbol: ${s.name}, kind: ${s.kind}, location: ${s.location.uri.fsPath}`));
            
            const handlerClass = symbols.find(
                symbol => symbol.kind === vscode.SymbolKind.Class && symbol.name === handlerName
            );
            
            if (handlerClass) {
                return handlerClass.location;
            }
        }

        return null;
    }

    private async findByDecorator(commandName: string): Promise<vscode.Location | null> {
        try {
            const exclude = '{**/node_modules/**,**/dist/**,**/out/**}';
            
            const patterns = [
                '**/*handler*.ts',
                '**/*handlers*.ts',
                '**/*subscriber*.ts',
                '**/*subscribers*.ts',
                '**/commands/**/*.ts',
                '**/queries/**/*.ts',
                '**/events/**/*.ts',
                '**/cqrs/**/*.ts',
            ];

            const allFiles: vscode.Uri[] = [];
            for (const pattern of patterns) {
                const files = await vscode.workspace.findFiles(pattern, exclude, 500);
                allFiles.push(...files);
            }

            const uniqueFiles = Array.from(new Set(allFiles.map(f => f.fsPath))).map(p => vscode.Uri.file(p));
            
            console.log(`Searching ${uniqueFiles.length} files for decorator with ${commandName}`);

            for (const file of uniqueFiles) {
                try {
                    const doc = await vscode.workspace.openTextDocument(file);
                    const text = doc.getText();
                    
                    const decoratorPatterns = [
                        `@CommandHandler(${commandName})`,
                        `@QueryHandler(${commandName})`,
                        `@EventsHandler(${commandName})`,
                        `@CommandHandler( ${commandName} )`,
                        `@QueryHandler( ${commandName} )`,
                        `@EventsHandler( ${commandName} )`,
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

    private async findByFileName(handlerName: string): Promise<vscode.Location | null> {
        const handlerFile = await this.findHandlerFile(handlerName);
        if (handlerFile) {
            console.log(`Found handler file: ${handlerFile.fsPath}`);
            const doc = await vscode.workspace.openTextDocument(handlerFile);
            const location = await this.findClassInDocument(doc, handlerName);
            if (location) {
                return location;
            }
        }
        return null;
    }

    private async findHandlerFile(handlerName: string): Promise<vscode.Uri | null> {
        const fileName = handlerName
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .toLowerCase();
        
        const patterns = [
            `**/${fileName}.ts`,
            `**/${fileName}.handler.ts`,
            `**/${fileName}.subscriber.ts`,
            `**/handlers/${fileName}.ts`,
            `**/subscribers/${fileName}.ts`,
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

    private async findClassInDocument(document: vscode.TextDocument, className: string): Promise<vscode.Location | null> {
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
}
