# CodeRabbit MCP Server

A Model Context Protocol (MCP) server for integrating CodeRabbit code reviews into Claude Code.

## 🎯 What is this?

This MCP server enables Claude Code to interact with CodeRabbit - an AI-powered code review tool for GitHub. The server uses the CodeRabbit GitHub App for automatic reviews and the official API for reports.

## ✨ Features

- 📊 **Developer Activity Reports** - Generate detailed activity reports via the CodeRabbit API
- 🔄 **GitHub PR Integration** - Create pull requests and trigger automatic CodeRabbit reviews
- 💬 **Fetch Review Comments** - Get CodeRabbit's feedback directly in Claude Code
- 🗣️ **Chat with CodeRabbit** - Ask questions about reviews directly in PRs via GitHub comments

## 📋 Prerequisites

1. **CodeRabbit GitHub App** must be installed in your repositories
   - Installation: https://github.com/apps/coderabbitai
   
2. **GitHub Personal Access Token** (Recommended: Fine-grained PAT)
   
   **Option A: Fine-grained Personal Access Token (Recommended)**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Select the repositories you want to access
   - Grant these permissions:
     - **Repository permissions:**
       - Pull requests: Read & Write
       - Issues: Read & Write  
       - Contents: Read
       - Metadata: Read
     - **Account permissions:**
       - Organization permissions: Read (if working with org repos)
   
   **Option B: Classic Personal Access Token**
   - Scopes needed:
     - `repo` (Full control of private repositories)
     - `read:org` (Read org and team membership)
   
3. **CodeRabbit API Key**
   - Available in your CodeRabbit dashboard

## 🚀 Installation

### Step 1: Clone Repository and Setup

```bash
# Clone repository
git clone https://github.com/0ui-labs/coderabbit-mcp-integration.git
cd CodeRabbit_MCP_Server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

### Step 2: Configure Environment Variables

Edit the `.env` file and add your keys:

```env
# CodeRabbit API Configuration
CODERABBIT_API_KEY=your_coderabbit_api_key_here
CODERABBIT_API_URL=https://api.coderabbit.ai/api

# GitHub Configuration
GITHUB_TOKEN=your_github_personal_access_token

# Optional: Server Configuration
LOG_LEVEL=info
CACHE_TTL=300
```

### Step 3: Build the Server

```bash
npm run build
```

### Step 4: Configure in Claude Code

Add the server to your Claude Code MCP configuration:

**macOS/Linux:** `~/.config/claude/mcp_settings.json`
**Windows:** `%APPDATA%\claude\mcp_settings.json`

```json
{
  "mcpServers": {
    "coderabbit": {
      "command": "node",
      "args": [
        "/path/to/CodeRabbit_MCP_Server/dist/cli.js"
      ],
      "env": {
        "CODERABBIT_API_KEY": "your_key",
        "GITHUB_TOKEN": "your_token"
      }
    }
  }
}
```

**Platform-specific paths:**
- **macOS/Linux:** `/path/to/CodeRabbit_MCP_Server/dist/cli.js`
- **Windows:** `C:\Users\username\CodeRabbit_MCP_Server\dist\cli.js`

**Note:** You can set environment variables either in the `.env` file OR directly in the MCP configuration.

## 📚 Available Tools

### 1. `generateReport`
Generates detailed developer activity reports via the official CodeRabbit API.

**Usage in Claude Code:**
```
"Generate a CodeRabbit activity report for the last week"
"Show me developer activity from 2024-01-01 to 2024-01-31"
```

**Parameters:**
- `from` (required): Start date in ISO format
- `to` (required): End date in ISO format
- `prompt` (optional): Custom prompt for the report
- `groupBy` (optional): Data grouping option
- `orgId` (optional): Organization ID

### 2. `createPRForReview`
Creates a GitHub pull request and automatically triggers a CodeRabbit review.

**Usage in Claude Code:**
```
"Create a PR from feature-branch to main in owner/repo"
"Make a pull request for my changes with title 'Add new feature'"
```

**Parameters:**
- `owner` (required): GitHub username or organization
- `repo` (required): Repository name
- `title` (required): PR title
- `head` (required): Source branch
- `base` (optional): Target branch (default: main)
- `body` (optional): PR description

### 3. `getCodeRabbitComments`
Fetches all CodeRabbit review comments from a GitHub pull request.

**Usage in Claude Code:**
```
"Get CodeRabbit comments from PR #42 in owner/repo"
"Show me the review feedback for pull request 123"
```

**Parameters:**
- `owner` (required): GitHub username or organization
- `repo` (required): Repository name
- `prNumber` (required): Pull request number

### 4. `askCodeRabbitInPR`
Ask CodeRabbit a question directly in a GitHub pull request.

**Usage in Claude Code:**
```
"Ask CodeRabbit in PR #42: How can I improve the performance?"
"Question for CodeRabbit in PR 123: Are there any security issues?"
```

**Parameters:**
- `owner` (required): GitHub username or organization
- `repo` (required): Repository name
- `prNumber` (required): Pull request number
- `question` (required): Your question for CodeRabbit

## 🔄 Typical Workflow

1. **Change code and commit**
   ```bash
   git add .
   git commit -m "Add new feature"
   git push origin feature-branch
   ```

2. **Create PR via Claude Code**
   ```
   "Create a PR from feature-branch to main in myorg/myrepo with title 'Add awesome feature'"
   ```

3. **Wait for CodeRabbit review** (usually 1-2 minutes)

4. **Fetch review comments**
   ```
   "Get CodeRabbit comments from PR #123 in myorg/myrepo"
   ```

5. **Discuss with CodeRabbit**
   ```
   "Ask CodeRabbit in PR #123: Can you suggest a better approach for error handling?"
   ```

## ⚙️ Development

```bash
# Development server with hot reload
npm run dev

# TypeScript type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

## 🏗️ Project Structure

```
CodeRabbit_MCP_Server/
├── src/
│   ├── index.ts              # MCP server main file
│   ├── coderabbit-client.ts  # CodeRabbit API client
│   ├── github-integration.ts # GitHub API integration
│   ├── types.ts              # TypeScript types & schemas
│   └── cache.ts              # Cache implementation
├── dist/                     # Compiled JavaScript files
├── .env                      # Environment variables (don't commit!)
├── .env.example              # Example environment variables
└── package.json              # NPM dependencies
```

## 🔍 Debugging

Set `LOG_LEVEL=debug` in your `.env` file for detailed logs:

```env
LOG_LEVEL=debug
```

Logs are written to stderr and can be viewed in Claude Code's MCP logs.

## ⚠️ Limitations

- **CodeRabbit API**: Only the `/v1/report.generate` endpoint is publicly available
- **Reviews**: Work only through the GitHub App, not directly via API
- **Local Reviews**: Not possible without a GitHub pull request
- **Review History**: No public API endpoint available

## 🔒 Security

- **Never** commit API keys or tokens in code
- Always use environment variables or secure secret management
- Rotate your tokens regularly
- Limit GitHub token scopes to the minimum required

## 🐛 Troubleshooting

### "CodeRabbit app not installed"
→ Install the CodeRabbit GitHub App: https://github.com/apps/coderabbitai

### "Bad credentials" 
→ Check your GitHub token and ensure it has the correct scopes

### "API key invalid"
→ Verify your CodeRabbit API key in the dashboard

### Server won't start
→ Ensure all dependencies are installed: `npm install`
→ Verify the build was successful: `npm run build`

## 📄 License

MIT - See [LICENSE](LICENSE) file

## 🤝 Contributing

Contributions are welcome! Please create a pull request with your changes.

## 🆘 Support

- **CodeRabbit Support**: https://coderabbit.ai/support
- **GitHub Issues**: [Repository Issues](https://github.com/0ui-labs/coderabbit-mcp-integration/issues)
- **MCP Documentation**: https://modelcontextprotocol.io/docs

## 🏷️ Version

Version: 2.0.0 - Real features only, no mock implementations!