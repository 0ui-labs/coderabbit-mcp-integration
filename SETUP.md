# CodeRabbit GitHub Integration Setup

## 🔧 Vollständige Einrichtungsanleitung

### Schritt 1: CodeRabbit GitHub App installieren

1. Gehe zu: https://github.com/apps/coderabbitai
2. Klicke auf "Install"
3. Wähle deine Organisation oder persönlichen Account
4. Wähle die Repositories aus, die CodeRabbit reviewen soll
5. Bestätige die Installation

### Schritt 2: GitHub Personal Access Token erstellen

1. Gehe zu GitHub Settings → Developer settings → Personal access tokens
2. Klicke auf "Generate new token (classic)"
3. Gib dem Token einen Namen (z.B. "CodeRabbit MCP")
4. Wähle folgende Scopes:
   - `repo` (Full control of private repositories)
   - `read:org` (Read org and team membership)
5. Klicke auf "Generate token"
6. **WICHTIG**: Kopiere den Token sofort (wird nur einmal angezeigt!)

### Schritt 3: MCP Server konfigurieren

1. Öffne die `.env` Datei:
```bash
nano .env
```

2. Setze deine Tokens:
```env
# CodeRabbit API Configuration
CODERABBIT_API_KEY=yocr-xxxxxxxxxxxxx  # Von CodeRabbit Dashboard
CODERABBIT_API_URL=https://api.coderabbit.ai/api

# GitHub Configuration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx  # Dein Personal Access Token
```

### Schritt 4: Server testen

```bash
# Build und starte den Server
npm run build
npm run dev
```

## 📱 Verfügbare Tools

### Mit GitHub Integration (wenn GITHUB_TOKEN gesetzt ist)

#### `createPRForReview`
Erstellt einen Pull Request und triggert automatisch CodeRabbit Review.

```javascript
{
  owner: "dein-username",
  repo: "dein-repo",
  title: "Feature: Neue Funktion",
  head: "feature-branch",
  base: "main",  // optional, default: main
  body: "Beschreibung der Änderungen"
}
```

#### `getCodeRabbitComments`
Holt alle CodeRabbit Kommentare aus einem PR.

```javascript
{
  owner: "dein-username",
  repo: "dein-repo",
  prNumber: 123
}
```

#### `askCodeRabbitInPR`
Stellt CodeRabbit eine Frage direkt im PR.

```javascript
{
  owner: "dein-username",
  repo: "dein-repo",
  prNumber: 123,
  question: "Kannst du die Performance-Optimierungen genauer erklären?"
}
```

### API Tools (immer verfügbar)

#### `generateReport`
Generiert Developer Activity Reports.

```javascript
{
  from: "2025-01-01",
  to: "2025-01-31",
  prompt: "Fokus auf Code-Qualität",  // optional
  groupBy: "author",  // optional
  orgId: "org-123"  // optional
}
```

## 🔄 Workflow Beispiel

### 1. Lokale Änderungen reviewen lassen

```bash
# In deinem Projekt
git add .
git commit -m "feat: Neues Feature implementiert"
git push origin feature-branch
```

In Claude Code:
```
Use createPRForReview to create a PR for my feature-branch
```

### 2. Review-Status prüfen

```
Use getCodeRabbitComments to check the review for PR #123
```

### 3. Mit CodeRabbit interagieren

```
Use askCodeRabbitInPR to ask about the security implications in PR #123
```

## 🚨 Wichtige Hinweise

### GitHub App vs API

- **GitHub App** (kostenlos für Open Source):
  - Automatische Reviews bei PRs
  - Inline-Kommentare
  - Interaktive Diskussionen
  
- **API** (kostenpflichtig):
  - Nur Report-Generierung verfügbar
  - Keine Code-Review-Endpunkte

### Mock-Implementierungen

Die Tools `triggerReview`, `getReviewStatus`, `askCodeRabbit`, `configureReview` und `getReviewHistory` verwenden Mock-Daten für Entwicklungszwecke, da diese API-Endpunkte nicht öffentlich verfügbar sind.

### Rate Limits

- GitHub API: 5000 Requests/Stunde (mit Token)
- CodeRabbit Reports: Abhängig vom Plan

## 🐛 Troubleshooting

### "401 Unauthorized" bei GitHub

- Token ist abgelaufen oder ungültig
- Fehlende Scopes (repo, read:org)

### "CodeRabbit reagiert nicht im PR"

- Prüfe ob die GitHub App installiert ist
- Repository muss in der App-Konfiguration aktiviert sein
- Warte 1-2 Minuten nach PR-Erstellung

### "404 Not Found" bei API Calls

- Die meisten CodeRabbit API-Endpunkte sind nicht öffentlich
- Nutze die GitHub Integration stattdessen

## 📚 Weitere Ressourcen

- [CodeRabbit Dokumentation](https://docs.coderabbit.ai)
- [GitHub Apps Dokumentation](https://docs.github.com/en/apps)
- [MCP Spezifikation](https://modelcontextprotocol.io)