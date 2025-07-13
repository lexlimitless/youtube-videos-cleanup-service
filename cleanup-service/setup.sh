#!/bin/bash

# YouTube Videos Cleanup Service Setup Script
# This script helps set up the cleanup service in a new repository

set -e

echo "🚀 Setting up YouTube Videos Cleanup Service..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "📁 Initializing git repository..."
    git init
fi

# Make scripts executable
echo "🔧 Making scripts executable..."
chmod +x scripts/scheduled-cleanup.sh
chmod +x functions/cleanup-youtube-videos/deploy.sh
# Note: test.ts is a TypeScript file, not a shell script

# Create initial commit
echo "📝 Creating initial commit..."
git add .
git commit -m "Initial commit: YouTube Videos Cleanup Service"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Add the remote origin: git remote add origin <your-repo-url>"
echo "3. Push to GitHub: git push -u origin main"
echo "4. Add GitHub secrets:"
echo "   - SUPABASE_URL: Your Supabase project URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key"
echo "5. Deploy the Edge Function: npm run deploy"
echo "6. Test the setup: npm run test-function"
echo ""
echo "📚 See README.md for detailed instructions" 