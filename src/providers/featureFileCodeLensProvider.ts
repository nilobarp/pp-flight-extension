import * as vscode from 'vscode';
import { StepDefinitionFinder } from '../services/stepDefinitionFinder';

export class FeatureFileCodeLensProvider implements vscode.CodeLensProvider {
    async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
        // Only provide code lenses for .feature files
        if (!document.fileName.endsWith('.feature')) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        const text = document.getText();
        const lines = text.split('\n');
        
        // Get configured profiles
        const config = vscode.workspace.getConfiguration('flight.cucumber');
        const profiles: string[] = config.get('profiles', ['cqrs', 'api']);
        
        let featureTags: string[] = [];
        let currentTags: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Match tags (lines starting with @)
            if (trimmedLine.startsWith('@')) {
                const tags = trimmedLine.split(/\s+/).filter(t => t.startsWith('@')).map(t => t.substring(1));
                currentTags.push(...tags);
                continue;
            }
            
            // Track feature-level tags
            const featureMatch = trimmedLine.match(/^Feature:\s*(.+)/);
            if (featureMatch) {
                featureTags = [...currentTags];
                currentTags = [];
                continue;
            }
            
            // Add run buttons for Scenario lines
            const scenarioMatch = trimmedLine.match(/^Scenario:\s*(.+)/);
            if (scenarioMatch) {
                const position = new vscode.Position(i, 0);
                const range = new vscode.Range(position, position);
                
                // Determine which tags apply to this scenario
                const scenarioTags = featureTags.length > 0 ? featureTags : currentTags;
                
                // Find matching profiles for this scenario
                const matchingProfiles = profiles.filter(profile => 
                    scenarioTags.includes(profile)
                );
                
                // Create a run button for each matching profile
                for (const profile of matchingProfiles) {
                    const runCodeLens = new vscode.CodeLens(range, {
                        title: `▶ Run @${profile}`,
                        command: 'flight.runScenarioWithProfile',
                        arguments: [document, i, profile]
                    });
                    codeLenses.push(runCodeLens);
                }
                
                currentTags = [];
            }
            
            const stepInfo = StepDefinitionFinder.extractStepText(line);

            if (stepInfo) {
                const position = new vscode.Position(i, 0);
                const range = new vscode.Range(position, position);

                const codeLens = new vscode.CodeLens(range, {
                    title: `→ Go to step definition`,
                    command: 'nestjs-cqrs-navigator.goToStepDefinition',
                    arguments: []
                });

                codeLenses.push(codeLens);
            }
        }

        return codeLenses;
    }
}
