import * as vscode from 'vscode';

export class StepDefinitionFinder {
    /**
     * Find the step definition for a given Gherkin step text
     * @param stepText The text of the step (e.g., "I create a package")
     * @param stepKeyword The Gherkin keyword (Given, When, Then, And, But)
     */
    async findStepDefinition(stepText: string, stepKeyword: string): Promise<vscode.Location | null> {
        console.log(`Searching for step definition: ${stepKeyword} ${stepText}`);
        
        // Always search all step types (given, when, then) since they can be used interchangeably
        const allKeywords = ['given', 'when', 'then'];
        
        // Search in step definition files
        const stepFiles = await this.findStepFiles();
        
        for (const file of stepFiles) {
            const location = await this.searchInFile(file, stepText, allKeywords);
            if (location) {
                console.log(`Found step definition in: ${location.uri.fsPath}`);
                return location;
            }
        }

        console.log('Step definition not found');
        return null;
    }

    /**
     * Find all step definition files in the workspace
     */
    private async findStepFiles(): Promise<vscode.Uri[]> {
        const patterns = [
            '**/features/**/steps/**/*.ts',
            '**/step-definitions/**/*.ts',
            '**/step_definitions/**/*.ts',
            '**/*-steps.ts',
            '**/*_steps.ts',
            '**/*.steps.ts',
        ];

        const exclude = '{**/node_modules/**,**/dist/**,**/out/**,**/*.js}';
        const allFiles: vscode.Uri[] = [];

        for (const pattern of patterns) {
            const files = await vscode.workspace.findFiles(pattern, exclude, 500);
            allFiles.push(...files);
        }

        // Remove duplicates
        const uniqueFiles = Array.from(new Set(allFiles.map(f => f.fsPath)))
            .map(p => vscode.Uri.file(p));

        console.log(`Found ${uniqueFiles.length} step definition files`);
        return uniqueFiles;
    }

    /**
     * Search for a matching step definition in a file
     */
    private async searchInFile(
        file: vscode.Uri,
        stepText: string,
        keywords: string[]
    ): Promise<vscode.Location | null> {
        try {
            const doc = await vscode.workspace.openTextDocument(file);
            const text = doc.getText();

            // Collect all potential matches with their scores
            const matches: Array<{ index: number; score: number }> = [];

            // Search for decorator patterns across all keywords
            for (const keyword of keywords) {
                // Pattern 1: @given(/pattern/) or @given(/pattern/g) or @given(/pattern/gi)
                const regexPattern = new RegExp(
                    `@${keyword}\\s*\\(\\s*/([^/]+)/[gim]*`,
                    'gi'
                );
                
                let match;
                while ((match = regexPattern.exec(text)) !== null) {
                    const pattern = match[1];
                    const matchScore = this.matchesStepPattern(stepText, pattern);
                    if (matchScore > 0) {
                        matches.push({ index: match.index, score: matchScore });
                    }
                }

                // Pattern 2: @given('string') or @given("string")
                const stringPattern = new RegExp(
                    `@${keyword}\\s*\\(\\s*(['"])([^'"]+)\\1`,
                    'gi'
                );

                while ((match = stringPattern.exec(text)) !== null) {
                    const pattern = match[2];
                    const matchScore = this.matchesStepPattern(stepText, pattern);
                    if (matchScore > 0) {
                        matches.push({ index: match.index, score: matchScore });
                    }
                }
            }

            // Return the best match (highest score)
            if (matches.length > 0) {
                matches.sort((a, b) => b.score - a.score);
                const bestMatch = matches[0];
                const position = doc.positionAt(bestMatch.index);
                console.log(`Found match with score ${bestMatch.score} at ${file.fsPath}`);
                return new vscode.Location(file, position);
            }
        } catch (error) {
            console.error(`Error searching file ${file.fsPath}:`, error);
        }

        return null;
    }

    /**
     * Check if a step text matches a Cucumber expression pattern
     * Returns a score: 0 = no match, 1 = parameterized match, 2 = regex match, 3 = exact string match
     */
    private matchesStepPattern(stepText: string, pattern: string): number {
        // Remove ^ and $ anchors for comparison
        const cleanPattern = pattern.replace(/^\^/, '').replace(/\$$/, '').trim();
        const cleanStep = stepText.trim();
        
        // Remove trailing colon from pattern if present (for table/docstring steps)
        const patternNoColon = cleanPattern.replace(/:$/, '');
        const stepNoColon = cleanStep.replace(/:$/, '');
        
        // First, try exact string match (highest priority)
        if (patternNoColon.toLowerCase() === stepNoColon.toLowerCase()) {
            console.log(`Pattern '${pattern}' is an exact match for '${stepText}'`);
            return 3;
        }

        // Try to match as a regex pattern
        try {
            // Build the regex pattern
            let regexPattern = patternNoColon;
            
            // Track if pattern has parameters
            let hasParameters = false;
            
            // Handle Cucumber Expression syntax: {} placeholders
            // Match both escaped \{} and unescaped {}
            regexPattern = regexPattern
                .replace(/\\\{\\\}/g, () => { hasParameters = true; return '(.+?)'; })  // \{\}
                .replace(/\{\}/g, () => { hasParameters = true; return '(.+?)'; })      // {}
                .replace(/\\\{string\\\}/gi, () => { hasParameters = true; return '(.+?)'; })
                .replace(/\\\{int\\\}/gi, () => { hasParameters = true; return '(-?\\d+)'; })
                .replace(/\\\{float\\\}/gi, () => { hasParameters = true; return '(-?\\d+\\.?\\d*)'; })
                .replace(/\\\{word\\\}/gi, () => { hasParameters = true; return '(\\w+)'; })
                .replace(/\{string\}/gi, () => { hasParameters = true; return '(.+?)'; })
                .replace(/\{int\}/gi, () => { hasParameters = true; return '(-?\\d+)'; })
                .replace(/\{float\}/gi, () => { hasParameters = true; return '(-?\\d+\\.?\\d*)'; })
                .replace(/\{word\}/gi, () => { hasParameters = true; return '(\\w+)'; })
                .replace(/\{[^}]+\}/g, () => { hasParameters = true; return '(.+?)'; })  // Any other parameter
                .replace(/\\\{[^}]+\\\}/g, () => { hasParameters = true; return '(.+?)'; }); // Escaped parameters
            
            // Handle regex capture groups
            regexPattern = regexPattern.replace(/\(([^)]+)\)/g, (match, group) => {
                // If already a valid regex group, keep it
                if (group.includes('|') || group.startsWith('?')) {
                    hasParameters = true;
                    return match;
                }
                // Check if it's a character class or quantifier
                if (group.match(/^[.\w\s\-+*?\\]+$/)) {
                    hasParameters = true;
                    return match;
                }
                hasParameters = true;
                return match;
            });
            
            // Escape special regex characters that aren't already escaped
            // but preserve existing regex syntax
            const needsEscaping = /[.+*?^$[\]{}|\\]/;
            if (!needsEscaping.test(regexPattern)) {
                // If pattern has no regex chars, it might be a plain string - escape it
                regexPattern = regexPattern.replace(/[.+*?^$[\]{}|\\]/g, '\\$&');
            }

            // Test the pattern
            const regex = new RegExp(`^${regexPattern}$`, 'i');
            const matches = regex.test(stepNoColon);
            
            if (matches) {
                // Calculate match quality
                const score = hasParameters ? 1 : 2; // Parameterized = 1, exact regex = 2
                console.log(`Pattern '${pattern}' matches '${stepText}' with score ${score}`);
                return score;
            }
        } catch (error) {
            console.error(`Invalid regex pattern: ${pattern}`, error);
            
            // Fallback: try simple substring matching
            const patternLower = patternNoColon.toLowerCase();
            const stepLower = stepNoColon.toLowerCase();
            
            if (patternLower === stepLower ||
                stepLower.includes(patternLower) ||
                patternLower.includes(stepLower)) {
                console.log(`Pattern '${pattern}' partially matches '${stepText}' (fallback)`);
                return 1;
            }
        }

        console.log(`Pattern '${pattern}' does not match '${stepText}'`);
        return 0;
    }

    /**
     * Escape special regex characters
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Extract step text from a Gherkin line
     * Example: "  When I create a package:" -> "I create a package"
     * Handles trailing colons for steps with tables/doc strings
     */
    public static extractStepText(line: string): { keyword: string; text: string } | null {
        const match = line.match(/^\s*(Given|When|Then|And|But|\*)\s+(.+?)(:)?$/i);
        if (match) {
            // Remove trailing colon if present (for steps with tables or doc strings)
            let text = match[2].trim();
            if (text.endsWith(':')) {
                text = text.slice(0, -1).trim();
            }
            return {
                keyword: match[1],
                text: text
            };
        }
        return null;
    }
}
