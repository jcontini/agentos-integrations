#!/bin/bash
#
# Setup script for agentos-plugins development
# Run this after cloning the repo
#

set -e

echo "🔧 Setting up agentos-plugins..."

# Configure git to use our hooks
git config core.hooksPath .githooks
echo "✓ Git hooks configured"

# Verify hook is executable
if [ ! -x .githooks/pre-commit ]; then
    chmod +x .githooks/pre-commit
    echo "✓ Made pre-commit hook executable"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Security hooks will now block commits containing:"
echo "  • \$AUTH_TOKEN exposure"
echo "  • curl/wget usage (use rest: or http: blocks instead)"
echo "  • Bearer token interpolation"
echo ""
