#!/bin/bash
# Setup script for Git hooks in GPT-Image-1-Playground
# This script configures Git to use the custom hooks directory

echo "🔧 Setting up Git hooks for GPT-Image-1-Playground..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Check if we're in a git repository
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    echo "Please run this script from the project root"
    exit 1
fi

echo -e "${BLUE}📍 Project root: ${NC}$PROJECT_ROOT"

# Function to check if hooks are already configured
check_existing_hooks() {
    CURRENT_HOOKS_PATH=$(git config --local core.hooksPath)
    if [ -n "$CURRENT_HOOKS_PATH" ]; then
        echo -e "${YELLOW}⚠️  Git hooks are already configured to: $CURRENT_HOOKS_PATH${NC}"
        read -p "Do you want to update to use .githooks? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Setup cancelled"
            exit 0
        fi
    fi
}

# Function to backup existing hooks
backup_existing_hooks() {
    if [ -d "$PROJECT_ROOT/.git/hooks" ]; then
        # Check if there are any custom hooks (non-sample files)
        CUSTOM_HOOKS=$(find "$PROJECT_ROOT/.git/hooks" -type f ! -name "*.sample" | wc -l)
        if [ $CUSTOM_HOOKS -gt 0 ]; then
            echo -e "${YELLOW}⚠️  Found $CUSTOM_HOOKS custom hooks in .git/hooks${NC}"
            read -p "Back them up? (y/n) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                BACKUP_DIR="$PROJECT_ROOT/.git/hooks.backup.$(date +%Y%m%d_%H%M%S)"
                cp -r "$PROJECT_ROOT/.git/hooks" "$BACKUP_DIR"
                echo -e "${GREEN}✅ Backed up to: $BACKUP_DIR${NC}"
            fi
        fi
    fi
}

# Function to verify hooks
verify_hooks() {
    echo -e "\n${BLUE}🔍 Verifying hooks...${NC}"
    
    HOOKS=(
        "pre-commit"
        "post-commit"
        "pre-push"
        "post-merge"
        "commit-msg"
    )
    
    ALL_GOOD=true
    for hook in "${HOOKS[@]}"; do
        if [ -f "$PROJECT_ROOT/.githooks/$hook" ]; then
            if [ -x "$PROJECT_ROOT/.githooks/$hook" ]; then
                echo -e "  ${GREEN}✅ $hook${NC}"
            else
                echo -e "  ${YELLOW}⚠️  $hook (not executable)${NC}"
                chmod +x "$PROJECT_ROOT/.githooks/$hook"
                echo -e "     ${GREEN}Fixed!${NC}"
            fi
        else
            echo -e "  ${RED}❌ $hook (missing)${NC}"
            ALL_GOOD=false
        fi
    done
    
    if [ "$ALL_GOOD" = false ]; then
        echo -e "\n${RED}❌ Some hooks are missing${NC}"
        echo "Please ensure all hook files exist in .githooks/"
        exit 1
    fi
}

# Function to setup npm scripts
setup_npm_scripts() {
    echo -e "\n${BLUE}📦 Checking npm scripts...${NC}"
    
    if command -v node &> /dev/null; then
        # Check if setup-hooks script exists in package.json
        if ! grep -q '"setup-hooks"' "$PROJECT_ROOT/package.json"; then
            echo -e "${YELLOW}⚠️  No setup-hooks script found in package.json${NC}"
            echo "Add the following to your package.json scripts:"
            echo '  "setup-hooks": "bash .githooks/setup-hooks.sh"'
            echo '  "hooks:disable": "git config --unset core.hooksPath"'
            echo '  "hooks:skip": "SKIP_HOOKS=1"'
        else
            echo -e "${GREEN}✅ npm scripts already configured${NC}"
        fi
    fi
}

# Main setup process
echo -e "\n${BLUE}Starting setup...${NC}"

# 1. Check for existing configuration
check_existing_hooks

# 2. Backup existing hooks
backup_existing_hooks

# 3. Verify all hooks exist and are executable
verify_hooks

# 4. Configure Git to use our hooks directory
echo -e "\n${BLUE}⚙️  Configuring Git...${NC}"
git config --local core.hooksPath .githooks

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Git configured to use .githooks directory${NC}"
else
    echo -e "${RED}❌ Failed to configure Git${NC}"
    exit 1
fi

# 5. Setup npm scripts
setup_npm_scripts

# 6. Create .dev-logs directory
if [ ! -d "$PROJECT_ROOT/.dev-logs" ]; then
    mkdir -p "$PROJECT_ROOT/.dev-logs"
    echo -e "${GREEN}✅ Created .dev-logs directory${NC}"
fi

# 7. Check for Claude Code
echo -e "\n${BLUE}🤖 Checking for Claude Code...${NC}"
if command -v claude &> /dev/null; then
    echo -e "${GREEN}✅ Claude Code detected${NC}"
    echo "Your hooks will use Claude's specialized agents for enhanced checks!"
    
    # List available commands
    if [ -d "$PROJECT_ROOT/.claude/commands" ]; then
        echo -e "\n${BLUE}Available Claude commands:${NC}"
        for cmd in "$PROJECT_ROOT/.claude/commands"/*.md; do
            if [ -f "$cmd" ]; then
                basename "$cmd" .md | sed 's/^/  /'
            fi
        done
    fi
else
    echo -e "${YELLOW}⚠️  Claude Code not found${NC}"
    echo "Hooks will use basic checks. Install Claude Code for enhanced features."
fi

# 8. Show usage information
echo -e "\n${GREEN}✅ Git hooks setup complete!${NC}"
echo -e "\n${BLUE}📋 Usage:${NC}"
echo "  • Hooks will run automatically during git operations"
echo "  • To skip hooks temporarily: git commit --no-verify"
echo "  • To disable hooks: git config --unset core.hooksPath"
echo "  • To re-enable: npm run setup-hooks"
echo -e "\n${BLUE}🎣 Active hooks:${NC}"
echo "  • pre-commit: Runs quality checks before committing"
echo "  • commit-msg: Validates and enhances commit messages"
echo "  • post-commit: Logs commits and suggests actions"
echo "  • pre-push: Comprehensive checks before pushing"
echo "  • post-merge: Handles dependency updates after merges"

# 9. Test a hook
echo -e "\n${BLUE}🧪 Testing pre-commit hook...${NC}"
if [ -f "$PROJECT_ROOT/.githooks/pre-commit" ]; then
    # Create a test environment
    export GIT_DIR="$PROJECT_ROOT/.git"
    export GIT_WORK_TREE="$PROJECT_ROOT"
    
    # Run the hook in test mode (it will detect no staged files)
    "$PROJECT_ROOT/.githooks/pre-commit" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Pre-commit hook is working${NC}"
    else
        echo -e "${YELLOW}⚠️  Pre-commit hook test had warnings (this is normal with no staged files)${NC}"
    fi
fi

echo -e "\n${GREEN}🎉 Setup complete! Happy coding with automated checks!${NC}"