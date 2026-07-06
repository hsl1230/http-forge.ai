import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { DashboardPanel } from './dashboard-panel';

const MCP_DOCS_URL =
    'https://github.com/hsl1230/http-forge/blob/main/docs/user-guide/mcp-server.md';

export function activate(context: vscode.ExtensionContext): void {
    // Auto-start MCP server on activation
    autoStartMcpServer();

    // Show the dashboard on first install
    const isFirstActivation = !context.globalState.get<boolean>('httpForgeAI.activated');
    if (isFirstActivation) {
        context.globalState.update('httpForgeAI.activated', true);
        DashboardPanel.show(context);
    }

    context.subscriptions.push(
        vscode.commands.registerCommand('httpForgeAI.openDashboard', () => {
            DashboardPanel.show(context);
        }),

        vscode.commands.registerCommand('httpForgeAI.openMcpDocs', () => {
            vscode.env.openExternal(vscode.Uri.parse(MCP_DOCS_URL));
        }),

        vscode.commands.registerCommand('httpForgeAI.generateMcpConfig', async () => {
            await generateMcpConfig();
        }),

        vscode.commands.registerCommand('httpForgeAI.startMcpServer', async () => {
            await vscode.commands.executeCommand('httpForge.mcpStartServer');
        })
    );
}

export function deactivate(): void {}

async function autoStartMcpServer(): Promise<void> {
    try {
        // Enable HTTP Forge's built-in autoStart setting so it persists
        const cfg = vscode.workspace.getConfiguration('httpForge');
        if (!cfg.get<boolean>('mcpServer.autoStart')) {
            await cfg.update('mcpServer.autoStart', true, vscode.ConfigurationTarget.Global);
        }
        // Also start it now in case HTTP Forge is already running
        await vscode.commands.executeCommand('httpForge.mcpStartServer');
    } catch {
        // HTTP Forge may not be ready yet — autoStart setting will handle next launch
    }
}

type McpTarget = 'copilot' | 'claude' | 'cursor';

async function generateMcpConfig(): Promise<void> {
    const port = vscode.workspace.getConfiguration('httpForge').get<number>('mcpServer.port', 3100);

    const target = await vscode.window.showQuickPick(
        [
            { label: '$(copilot) GitHub Copilot', description: '.vscode/mcp.json in workspace', id: 'copilot' as McpTarget },
            { label: '$(terminal) Claude Desktop', description: '~/Library/Application Support/Claude/claude_desktop_config.json', id: 'claude' as McpTarget },
            { label: '$(tools) Cursor', description: '.cursor/mcp.json in workspace', id: 'cursor' as McpTarget },
        ],
        { placeHolder: 'Generate MCP config for which AI client?' }
    );

    if (!target) { return; }

    const serverConfig = {
        "http-forge": {
            url: `http://localhost:${port}`
        }
    };

    switch (target.id) {
        case 'copilot':
            await writeWorkspaceConfig('.vscode/mcp.json', { servers: serverConfig });
            vscode.window.showInformationMessage('✅ Created .vscode/mcp.json — GitHub Copilot will now use HTTP Forge as an MCP server.');
            break;

        case 'cursor':
            await writeWorkspaceConfig('.cursor/mcp.json', { mcpServers: serverConfig });
            vscode.window.showInformationMessage('✅ Created .cursor/mcp.json — Cursor will now use HTTP Forge as an MCP server.');
            break;

        case 'claude': {
            const claudeConfigPath = getClaudeConfigPath();
            if (!claudeConfigPath) {
                vscode.window.showErrorMessage('Claude Desktop config path not found for this OS.');
                return;
            }
            await writeClaudeConfig(claudeConfigPath, serverConfig);
            vscode.window.showInformationMessage(`✅ Updated Claude Desktop config at ${claudeConfigPath}`);
            break;
        }
    }
}

async function writeWorkspaceConfig(relPath: string, content: object): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
        vscode.window.showErrorMessage('Open a workspace folder first.');
        return;
    }
    const filePath = path.join(folders[0].uri.fsPath, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Merge if file already exists
    let existing: any = {};
    if (fs.existsSync(filePath)) {
        try { existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
    }
    const merged = deepMerge(existing, content);
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf-8');

    const doc = await vscode.workspace.openTextDocument(filePath);
    vscode.window.showTextDocument(doc);
}

async function writeClaudeConfig(configPath: string, serverConfig: object): Promise<void> {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    let existing: any = {};
    if (fs.existsSync(configPath)) {
        try { existing = JSON.parse(fs.readFileSync(configPath, 'utf-8')); } catch {}
    }
    existing.mcpServers = { ...(existing.mcpServers ?? {}), ...serverConfig };
    fs.writeFileSync(configPath, JSON.stringify(existing, null, 2), 'utf-8');
}

function getClaudeConfigPath(): string | null {
    const home = os.homedir();
    switch (process.platform) {
        case 'darwin':
            return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
        case 'win32':
            return path.join(process.env.APPDATA ?? home, 'Claude', 'claude_desktop_config.json');
        case 'linux':
            return path.join(home, '.config', 'claude', 'claude_desktop_config.json');
        default:
            return null;
    }
}

function deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] ?? {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}


