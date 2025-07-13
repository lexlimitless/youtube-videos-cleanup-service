#!/bin/bash

# YouTube Videos Cleanup - Scheduled Script
# This script is designed to be run by external cron services (like GitHub Actions, Vercel Cron, etc.)
# Run every Sunday at 3 AM UTC

# Configuration
SUPABASE_URL="https://ivwmbyptulpwbdpghamp.supabase.co"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/cleanup-youtube-videos"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"  # Set this as environment variable

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

# Check if service role key is set
if [ -z "$SERVICE_ROLE_KEY" ]; then
    print_error "SUPABASE_SERVICE_ROLE_KEY environment variable is not set"
    exit 1
fi

# Log start
print_status "Starting scheduled YouTube videos cleanup at $(date)"

# Call the Edge Function
print_status "Calling cleanup function..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -d '{
        "removeUnreferenced": true,
        "maxAgeDays": 90,
        "staleFetchDays": 30,
        "inactiveUserDays": 180,
        "removeDisconnected": true,
        "dryRun": false
    }')

# Extract HTTP status code (last line)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n1)
# Extract response body (all lines except last)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

# Check if the request was successful
if [ "$HTTP_STATUS" -eq 200 ]; then
    print_success "Cleanup function called successfully"
    
    # Parse and display results
    VIDEOS_DELETED=$(echo "$RESPONSE_BODY" | jq -r '.summary.videosDeleted // 0')
    TOTAL_BEFORE=$(echo "$RESPONSE_BODY" | jq -r '.summary.totalVideosBefore // 0')
    TOTAL_AFTER=$(echo "$RESPONSE_BODY" | jq -r '.summary.totalVideosAfter // 0')
    
    print_success "Cleanup completed:"
    echo "  - Videos before: $TOTAL_BEFORE"
    echo "  - Videos after: $TOTAL_AFTER"
    echo "  - Videos deleted: $VIDEOS_DELETED"
    
    # Check for errors
    ERRORS=$(echo "$RESPONSE_BODY" | jq -r '.errors // [] | length')
    if [ "$ERRORS" -gt 0 ]; then
        print_warning "Cleanup completed with $ERRORS errors"
        echo "$RESPONSE_BODY" | jq -r '.errors[]' | while read -r error; do
            echo "  - $error"
        done
    fi
    
else
    print_error "Cleanup function failed with HTTP status: $HTTP_STATUS"
    print_error "Response: $RESPONSE_BODY"
    exit 1
fi

print_success "Scheduled cleanup completed at $(date)" 