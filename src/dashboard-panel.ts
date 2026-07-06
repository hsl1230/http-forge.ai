import * as vscode from 'vscode';

const MARKETPLACE_URL = 'https://marketplace.visualstudio.com/items?itemName=henry-huang.http-forge';
const GITHUB_URL = 'https://github.com/hsl1230/http-forge';
const MCP_DOCS_URL = 'https://github.com/hsl1230/http-forge/blob/main/docs/user-guide/mcp-server.md';

export class DashboardPanel {
    private static currentPanel: DashboardPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
        this.panel = panel;
        this.panel.webview.html = getHtml();
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage((msg) => {
            switch (msg.command) {
                case 'openMarketplace':
                    vscode.env.openExternal(vscode.Uri.parse(MARKETPLACE_URL));
                    break;
                case 'openDocs':
                    vscode.env.openExternal(vscode.Uri.parse(MCP_DOCS_URL));
                    break;
                case 'openGitHub':
                    vscode.env.openExternal(vscode.Uri.parse(GITHUB_URL));
                    break;
                case 'generateMcpConfig':
                    vscode.commands.executeCommand('httpForgeAI.generateMcpConfig');
                    break;
                case 'startMcpServer':
                    vscode.commands.executeCommand('httpForge.mcpStartServer');
                    break;
            }
        }, null, this.disposables);
    }

    static show(context: vscode.ExtensionContext): void {
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel.panel.reveal();
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            'httpForgeAIDashboard',
            'HTTP Forge AI',
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );
        DashboardPanel.currentPanel = new DashboardPanel(panel, context);
    }

    private dispose(): void {
        DashboardPanel.currentPanel = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}

function getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HTTP Forge AI</title>
<style>
  :root {
    --bg: var(--vscode-editor-background);
    --fg: var(--vscode-editor-foreground);
    --accent: #7c5cbf;
    --accent2: #4a90d9;
    --card-bg: var(--vscode-sideBar-background, #1e1e2e);
    --border: var(--vscode-panel-border, #333);
    --btn-bg: var(--accent);
    --btn-fg: #fff;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--vscode-font-family); background: var(--bg); color: var(--fg); padding: 32px; max-width: 860px; margin: 0 auto; }
  h1 { font-size: 2rem; font-weight: 700; margin-bottom: 6px; }
  h1 span { color: var(--accent); }
  .subtitle { color: var(--vscode-descriptionForeground); font-size: 1rem; margin-bottom: 28px; }
  .status-ok { background: #1a3a1a; border: 1px solid #2d6a2d; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; color: #6fcf6f; font-size: 0.9rem; }
  .status-warn { background: #3a2a0a; border: 1px solid #8a5a00; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; color: #f0c060; font-size: 0.9rem; display: flex; align-items: center; gap: 16px; }
  .status-warn button { background: #c87900; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 0.85rem; white-space: nowrap; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
  .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; }
  .card h3 { font-size: 1rem; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .card p, .card li { font-size: 0.85rem; color: var(--vscode-descriptionForeground); line-height: 1.6; }
  .card ul { padding-left: 18px; }
  .tools-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .tag { background: rgba(124,92,191,0.15); color: var(--accent); border: 1px solid rgba(124,92,191,0.3); border-radius: 20px; padding: 3px 10px; font-size: 0.75rem; font-family: monospace; }
  .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
  button.primary { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-size: 0.9rem; font-weight: 600; }
  button.secondary { background: transparent; color: var(--fg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 20px; cursor: pointer; font-size: 0.9rem; }
  button:hover { opacity: 0.85; }
  .steps { counter-reset: step; }
  .step { display: flex; gap: 12px; margin-bottom: 14px; align-items: flex-start; }
  .step-num { background: var(--accent); color: #fff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; margin-top: 2px; }
  .step-text { font-size: 0.85rem; color: var(--vscode-descriptionForeground); line-height: 1.5; }
  code { font-family: var(--vscode-editor-font-family, monospace); background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; }
  .footer { border-top: 1px solid var(--border); padding-top: 20px; margin-top: 8px; display: flex; gap: 16px; align-items: center; }
  .footer a, .footer button.link { background: none; border: none; color: var(--accent2); cursor: pointer; font-size: 0.85rem; text-decoration: underline; padding: 0; }
  .quick-actions { display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; }
  .action-card { display: flex; align-items: center; gap: 16px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; cursor: pointer; text-align: left; width: 100%; transition: border-color 0.15s; }
  .action-card:hover { border-color: var(--accent); }
  .action-icon { font-size: 1.6rem; flex-shrink: 0; }
  .action-body { flex: 1; }
  .action-body strong { display: block; font-size: 0.95rem; color: var(--fg); margin-bottom: 3px; }
  .action-body span { font-size: 0.82rem; color: var(--vscode-descriptionForeground); }
  .action-arrow { font-size: 1.2rem; color: var(--accent); flex-shrink: 0; }
</style>
</head>
<body>
<h1>🔨 HTTP Forge <span>AI</span></h1>
<p class="subtitle">Connect AI agents to your API collections via MCP — no cloud accounts, no API keys, runs entirely in VS Code.</p>

<div class="status-ok">✅ HTTP Forge is installed — MCP server auto-starts on VS Code launch</div>

<div class="quick-actions">
  <button class="action-card" onclick="post('generateMcpConfig')">
    <div class="action-icon">⚙️</div>
    <div class="action-body">
      <strong>Generate MCP Config</strong>
      <span>Create the config file for GitHub Copilot, Claude Desktop, or Cursor</span>
    </div>
    <div class="action-arrow">→</div>
  </button>
  <button class="action-card" onclick="post('startMcpServer')">
    <div class="action-icon">📡</div>
    <div class="action-body">
      <strong>Start MCP Server</strong>
      <span>Start the HTTP Forge MCP server now (auto-start is already enabled)</span>
    </div>
    <div class="action-arrow">→</div>
  </button>
</div>

<div class="grid">
  <div class="card">
    <h3>🤖 What this does</h3>
    <ul>
      <li>Exposes your HTTP Forge collections as MCP tools</li>
      <li>GitHub Copilot, Claude &amp; Cursor can run requests, debug failures, and fix assertions</li>
      <li>60+ MCP tools for the full API testing lifecycle</li>
      <li>Everything runs locally — data never leaves your machine</li>
    </ul>
  </div>
  <div class="card">
    <h3>⚡ Quick setup</h3>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div class="step-text">Install <strong>HTTP Forge</strong> (main extension)</div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text">Click <code>⊙ MCP ○</code> in the status bar to start the MCP server</div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text">Open GitHub Copilot Chat → Agent mode → ask it to run your collection</div></div>
    </div>
  </div>
  <div class="card">
    <h3>🛠️ AI-native MCP tools</h3>
    <div class="tools-list">
      <span class="tag">run_request</span>
      <span class="tag">run_collection</span>
      <span class="tag">run_folder</span>
      <span class="tag">run_suite</span>
      <span class="tag">ai_enhance_collection</span>
      <span class="tag">analyze_coverage</span>
      <span class="tag">validate_against_spec</span>
      <span class="tag">generate_scenarios</span>
      <span class="tag">heal_assertions</span>
      <span class="tag">ai_suggest_env_vars</span>
      <span class="tag">scaffold_collection_from_openapi</span>
      <span class="tag">generate_iteration_data</span>
      <span class="tag">+50 more</span>
    </div>
  </div>
  <div class="card">
    <h3>🔗 Works with</h3>
    <ul>
      <li>✅ GitHub Copilot (Agent mode)</li>
      <li>✅ Claude Desktop &amp; Claude Code</li>
      <li>✅ Cursor</li>
      <li>✅ Continue.dev</li>
      <li>✅ Any MCP-compatible AI client</li>
    </ul>
  </div>
</div>

<div class="actions">
  <button class="primary" onclick="post('openDocs')">📖 MCP Server Guide</button>
  <button class="secondary" onclick="post('openGitHub')">⭐ Star on GitHub</button>
  <button class="secondary" onclick="post('openMarketplace')">🏪 Marketplace</button>
</div>

<div class="footer">
  <button class="link" onclick="post('openGitHub')">GitHub</button>
  <span style="color:var(--vscode-descriptionForeground)">|</span>
  <span style="font-size:0.8rem;color:var(--vscode-descriptionForeground)">Part of the HTTP Forge ecosystem</span>
</div>

<script>
  const vscode = acquireVsCodeApi();
  function post(command) { vscode.postMessage({ command }); }
</script>
</body>
</html>`;
}
