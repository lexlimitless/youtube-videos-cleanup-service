#!/bin/bash

# YouTube Videos Cleanup Edge Function Deployment Script
# This script deploys the cleanup function to Supabase

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it first:"
        echo "npm install -g supabase"
        exit 1
    fi
    print_success "Supabase CLI found"
}

# Check if we're in a Supabase project
check_supabase_project() {
    if [ ! -f "supabase/config.toml" ]; then
        print_error "Not in a Supabase project directory. Please run this script from your project root."
        exit 1
    fi
    print_success "Supabase project found"
}

# Deploy the function
deploy_function() {
    print_status "Deploying YouTube videos cleanup function..."
    
    # Deploy the function
    if supabase functions deploy cleanup-youtube-videos --no-verify-jwt; then
        print_success "Function deployed successfully!"
    else
        print_error "Failed to deploy function"
        exit 1
    fi
}

# Test the function
test_function() {
    print_status "Testing the deployed function..."
    
    # Get the project URL
    PROJECT_URL=$(supabase status --output json | jq -r '.api.url' 2>/dev/null || echo "")
    
    if [ -z "$PROJECT_URL" ]; then
        print_warning "Could not determine project URL. Please test manually."
        return
    fi
    
    FUNCTION_URL="${PROJECT_URL}/functions/v1/cleanup-youtube-videos"
    
    print_status "Function URL: $FUNCTION_URL"
    print_status "Testing with dry run..."
    
    # Test with dry run
    curl -X POST "$FUNCTION_URL" \
        -H "Content-Type: application/json" \
        -d '{"dryRun": true}' \
        --silent | jq '.' 2>/dev/null || {
        print_warning "Could not test function automatically. Please test manually:"
        echo "curl -X POST \"$FUNCTION_URL\" \\"
        echo "  -H \"Content-Type: application/json\" \\"
        echo "  -d '{\"dryRun\": true}'"
    }
}

# Show usage information
show_usage() {
    print_status "YouTube Videos Cleanup Function deployed!"
    echo ""
    echo "Usage examples:"
    echo ""
    echo "1. Dry run (test what would be deleted):"
    echo "   curl -X POST \"https://your-project.supabase.co/functions/v1/cleanup-youtube-videos\" \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -d '{\"dryRun\": true}'"
    echo ""
    echo "2. Default cleanup:"
    echo "   curl -X POST \"https://your-project.supabase.co/functions/v1/cleanup-youtube-videos\" \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -d '{}'"
    echo ""
    echo "3. Custom cleanup settings:"
    echo "   curl -X POST \"https://your-project.supabase.co/functions/v1/cleanup-youtube-videos\" \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -d '{"
    echo "       \"maxAgeDays\": 60,"
    echo "       \"staleFetchDays\": 15,"
    echo "       \"inactiveUserDays\": 90,"
    echo "       \"removeDisconnected\": true"
    echo "     }'"
    echo ""
    echo "4. Clean up specific user:"
    echo "   curl -X POST \"https://your-project.supabase.co/functions/v1/cleanup-youtube-videos\" \\"
    echo "     -H \"Content-Type: application/json\" \\"
    echo "     -d '{\"userId\": \"user_123\", \"dryRun\": true}'"
    echo ""
    echo "For more information, see the README.md file."
}

# Main deployment process
main() {
    echo "🚀 YouTube Videos Cleanup Edge Function Deployment"
    echo "=================================================="
    echo ""
    
    # Check prerequisites
    check_supabase_cli
    check_supabase_project
    
    # Deploy function
    deploy_function
    
    # Test function
    test_function
    
    # Show usage
    show_usage
    
    print_success "Deployment completed successfully!"
}

# Run main function
main "$@" 