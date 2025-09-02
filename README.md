# CodeRabbit MCP Server

Ein Model Context Protocol (MCP) Server für die Integration von CodeRabbit Code Reviews in Claude Code.

## Features

- 🔍 **Automatische Code Reviews** - Triggere CodeRabbit Reviews direkt aus Claude Code
- 📊 **Review Status Tracking** - Überwache den Fortschritt und die Ergebnisse
- 💬 **Interaktive Klärungen** - Stelle Fragen zu Review-Findings
- 📈 **Review History** - Verfolge Review-Trends über Zeit
- ⚙️ **Konfigurierbar** - Passe Review-Settings pro Repository an
- 🔄 **Lokale Changes** - Reviewe uncommitted Changes vor dem Push

## Installation

### 1. Repository klonen und Dependencies installieren

```bash
git clone https://github.com/0ui-labs/coderabbit-mcp-integration.git
cd coderabbit-mcp-integration
npm install
npm run build
```

### 2. Umgebungsvariablen konfigurieren

Kopiere `.env.example` zu `.env` und füge deine API-Keys ein:

```bash
cp .env.example .env
```

Editiere `.env`:
```env
CODERABBIT_API_KEY=your_coderabbit_api_key_here
GITHUB_TOKEN=your_github_token_here  # Optional, für erweiterte Features
```

### 3. MCP Server in Claude Code konfigurieren

Füge folgende Konfiguration zu deiner Claude Code Settings hinzu:

```json
{
  "mcpServers": {
    "coderabbit": {
      "command": "node",
      "args": ["/pfad/zu/CodeRabbit_MCP_Server/dist/index.js"],
      "env": {
        "CODERABBIT_API_KEY": "your_api_key",
        "GITHUB_TOKEN": "your_github_token"
      }
    }
  }
}
```

Oder mit npm global installation:

```bash
npm install -g .
```

Dann in Claude Code:
```json
{
  "mcpServers": {
    "coderabbit": {
      "command": "coderabbit-mcp"
    }
  }
}
```

## Verfügbare MCP Tools

### `triggerReview`
Startet einen CodeRabbit Review.

**Parameter:**
- `repository` (string, required): Repository im Format "owner/repo"
- `prNumber` (number, optional): Pull Request Nummer
- `branch` (string, optional): Branch Name
- `scope` (string, optional): "full" | "incremental" | "files"
- `files` (string[], optional): Spezifische Dateien zum Review
- `useLocalChanges` (boolean, optional): Reviewe lokale uncommitted Changes

### `getReviewStatus`
Ruft Status und Ergebnisse eines Reviews ab.

**Parameter:**
- `reviewId` (string, optional): Spezifische Review ID
- `repository` (string, optional): Repository Name
- `prNumber` (number, optional): Pull Request Nummer

### `askCodeRabbit`
Stelle eine Frage zu einem Review.

**Parameter:**
- `reviewId` (string, required): Review ID
- `question` (string, required): Deine Frage
- `context` (string, optional): "file" | "pr" | "general"

### `configureReview`
Konfiguriere Review-Einstellungen für ein Repository.

**Parameter:**
- `repository` (string, required): Repository Name
- `settings` (object): Einstellungen
  - `autoReview` (boolean): Automatische Reviews aktivieren
  - `reviewLevel` (string): "light" | "standard" | "thorough"
  - `customRules` (string[]): Eigene Review-Regeln
  - `ignorePatterns` (string[]): Zu ignorierende Dateimuster

### `getReviewHistory`
Hole Review-Historie für ein Repository.

**Parameter:**
- `repository` (string, required): Repository Name
- `limit` (number, optional): Anzahl der Reviews (default: 10)
- `since` (string, optional): ISO Datum für Zeitfilter

## Claude Code Subagent

Der mitgelieferte `code-reviewer` Subagent wird automatisch aktiviert und:
- Triggert proaktiv Reviews nach Code-Änderungen
- Überwacht Review-Status
- Präsentiert Ergebnisse strukturiert
- Bietet interaktive Klärungen

### Aktivierung

Der Subagent wird automatisch installiert in `.claude/agents/code-reviewer.md`.

### Manuelle Nutzung

```
Use the code-reviewer agent to review my recent changes
```

## Entwicklung

### Lokaler Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### TypeScript Types

Alle Types sind in `src/types.ts` definiert.

## Troubleshooting

### "API Key nicht gefunden"
- Stelle sicher, dass `CODERABBIT_API_KEY` in `.env` gesetzt ist
- Prüfe, ob die Umgebungsvariable in der MCP Konfiguration weitergegeben wird

### "Review startet nicht"
- Verifiziere Repository-Format: "owner/repo"
- Prüfe Netzwerkverbindung zur CodeRabbit API
- Checke API-Key Berechtigungen

### "Keine lokalen Changes gefunden"
- Stelle sicher, dass du im richtigen Git-Repository bist
- Prüfe mit `git status` ob Changes vorhanden sind

## API Limitierungen

- Rate Limits: Abhängig von deinem CodeRabbit Plan
- Cache TTL: 5 Minuten default (konfigurierbar via `CACHE_TTL`)

## Lizenz

MIT

## Support

Bei Fragen oder Problemen:
- CodeRabbit Support: https://coderabbit.ai/support
- MCP Dokumentation: https://modelcontextprotocol.io/docs