# Development Workflow Guide

This guide explains the automated development workflow for GPT-Image-1-Playground using Git hooks and Claude Code agents.

## 🚀 Quick Start

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd gpt-image-1-playground

# Install dependencies
npm install

# Setup Git hooks
npm run setup-hooks
```

## 🎣 Git Hooks Overview

The project uses custom Git hooks to automate quality checks and maintain code standards. All hooks are stored in `.githooks/` and integrate with Claude Code agents when available.

### Pre-commit Hook
Runs before each commit to ensure code quality:
- **With Claude Code**: Runs security, Danish localization, and memory leak checks
- **Without Claude Code**: Runs TypeScript and lint checks
- Checks for console.log statements
- Scans for exposed API keys
- Validates file sizes
- Prompts for TODO comments

### Commit-msg Hook
Validates and enhances commit messages:
- Enforces minimum message length (10 characters)
- Suggests conventional commit format
- Warns about generic messages
- Adds branch references when appropriate
- Detects security-related commits

### Post-commit Hook
Logs commits and suggests follow-up actions:
- Creates development logs in `.dev-logs/`
- Analyzes changed files
- Suggests running tests for TypeScript changes
- Reminds about npm install for package.json changes
- Tracks significant commits (>5 files)

### Pre-push Hook
Comprehensive checks before pushing to remote:
- Verifies no uncommitted changes
- Runs full build check
- Extra security checks for master/main branches
- Scans for sensitive files
- Validates commit messages
- Checks push size

### Post-merge Hook
Handles post-merge maintenance:
- Auto-runs npm install if package.json changed
- Checks TypeScript definitions
- Alerts about environment variable changes
- Cleans up merge artifacts
- Suggests next steps

## 🤖 Claude Code Integration

When Claude Code is installed, hooks automatically use specialized agents for enhanced checks:

### Available Commands
- `/check-security` - Security vulnerability scanning
- `/check-danish` - Danish localization validation
- `/check-memory` - Memory leak detection
- `/test-image-flow` - Image processing tests
- `/debug-konverter` - Konverter tools debugging
- `/optimize-performance` - Performance analysis
- `/qcheck` - Quick comprehensive check
- `/qtest` - Quick test runner
- `/qdeploy` - Quick deployment check

### VS Code Integration
Use the Command Palette (`Cmd+Shift+P`) and run "Tasks: Run Task" to access:
- Quick Check (All) - Default test task
- Run Security Check
- Run Danish Localization Check
- Debug Konverter Tools
- Deploy Check
- And more...

## 📋 Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
npm run dev

# Run quick check
claude /qcheck

# Commit changes (hooks run automatically)
git add .
git commit -m "feat: add new feature"
```

### 2. Before Pushing
The pre-push hook will:
- Run build verification
- Check for security issues
- Validate all commits
- Ensure no sensitive data

### 3. Handling Merges
After merging branches:
- Dependencies auto-update if needed
- TypeScript checks run automatically
- Environment changes are highlighted

## 🛠️ Hook Management

### Temporarily Skip Hooks
```bash
# Skip pre-commit/pre-push checks
git commit --no-verify
git push --no-verify

# Skip all hooks for current session
export SKIP_HOOKS=1
```

### Disable/Re-enable Hooks
```bash
# Disable hooks
npm run hooks:disable

# Re-enable hooks
npm run setup-hooks
```

## 📊 Development Logs

Hooks create logs in `.dev-logs/` directory:
- `commits.log` - All commit history
- `pushes.log` - Push history
- `merges.log` - Merge events
- `daily-YYYY-MM-DD.log` - Daily activity
- `significant-commits.log` - Large changes
- `good-commit-messages.log` - Example messages

## 🔧 Troubleshooting

### Hook Not Running
```bash
# Verify hooks are configured
git config --get core.hooksPath

# Should output: .githooks
# If not, run:
npm run setup-hooks
```

### Permission Errors
```bash
# Make all hooks executable
chmod +x .githooks/*
```

### Claude Commands Not Found
- Ensure Claude Code is installed
- Check PATH includes claude binary
- Run `which claude` to verify

## 📝 Best Practices

1. **Commit Messages**
   - Use conventional format: `type(scope): description`
   - Types: feat, fix, docs, style, refactor, test, chore
   - Keep first line under 72 characters

2. **Before Pushing**
   - Run `npm run build` to verify build
   - Check `npm run lint` passes
   - Review changed files

3. **Working with Hooks**
   - Don't bypass hooks unless necessary
   - Fix issues hooks identify
   - Keep hooks fast (<30 seconds)

4. **Claude Integration**
   - Use `/qcheck` before committing large changes
   - Run specialized checks for specific features
   - Trust agent recommendations

## 🚀 Deployment Workflow

### Pre-deployment Checklist
1. All tests passing
2. Build successful
3. No security warnings
4. Environment variables documented

### Deploy Commands
```bash
# Run deployment check
claude /qdeploy

# Deploy to Fly.io
fly deploy

# Monitor deployment
fly logs
```

## 📚 Additional Resources

- [Git Hooks Documentation](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Claude Code Documentation](https://claude.ai/docs)
- [Project README](./README.md)

---

Remember: The hooks are here to help maintain code quality and catch issues early. Embrace them as part of your development workflow!