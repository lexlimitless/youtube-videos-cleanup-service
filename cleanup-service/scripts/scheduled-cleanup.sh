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
    ERRORS=$(echo "$RESPONSE_BODY" | jq -r '.errors // [] | length')
    
    # Extract detailed breakdown for GitHub Actions
    UNREFERENCED_DELETED=$(echo "$RESPONSE_BODY" | jq -r '.summary.unreferencedDeleted // 0')
    OLD_VIDEOS_DELETED=$(echo "$RESPONSE_BODY" | jq -r '.summary.oldVideosDeleted // 0')
    STALE_FETCH_DELETED=$(echo "$RESPONSE_BODY" | jq -r '.summary.staleFetchDeleted // 0')
    INACTIVE_USER_DELETED=$(echo "$RESPONSE_BODY" | jq -r '.summary.inactiveUserDeleted // 0')
    DISCONNECTED_DELETED=$(echo "$RESPONSE_BODY" | jq -r '.summary.disconnectedDeleted // 0')
    
    # Create detailed report
    DETAILS=""
    if [ "$UNREFERENCED_DELETED" -gt 0 ]; then
        DETAILS="${DETAILS}- Unreferenced videos deleted: $UNREFERENCED_DELETED\n"
    fi
    if [ "$OLD_VIDEOS_DELETED" -gt 0 ]; then
        DETAILS="${DETAILS}- Old videos (>90 days) deleted: $OLD_VIDEOS_DELETED\n"
    fi
    if [ "$STALE_FETCH_DELETED" -gt 0 ]; then
        DETAILS="${DETAILS}- Stale fetch videos deleted: $STALE_FETCH_DELETED\n"
    fi
    if [ "$INACTIVE_USER_DELETED" -gt 0 ]; then
        DETAILS="${DETAILS}- Inactive user videos deleted: $INACTIVE_USER_DELETED\n"
    fi
    if [ "$DISCONNECTED_DELETED" -gt 0 ]; then
        DETAILS="${DETAILS}- Disconnected user videos deleted: $DISCONNECTED_DELETED\n"
    fi
    
    if [ -z "$DETAILS" ]; then
        DETAILS="No videos were deleted during this cleanup run."
    fi
    
    print_success "Cleanup completed:"
    echo "  - Videos before: $TOTAL_BEFORE"
    echo "  - Videos after: $TOTAL_AFTER"
    echo "  - Videos deleted: $VIDEOS_DELETED"
    
    # Check for errors
    if [ "$ERRORS" -gt 0 ]; then
        print_warning "Cleanup completed with $ERRORS errors"
        echo "$RESPONSE_BODY" | jq -r '.errors[]' | while read -r error; do
            echo "  - $error"
        done
    fi
    
    # Output results for GitHub Actions (if running in GitHub Actions)
    if [ -n "$GITHUB_OUTPUT" ]; then
        echo "results={\"totalBefore\":\"$TOTAL_BEFORE\",\"totalAfter\":\"$TOTAL_AFTER\",\"videosDeleted\":\"$VIDEOS_DELETED\",\"errors\":\"$ERRORS\",\"details\":\"$DETAILS\"}" >> $GITHUB_OUTPUT
    fi
    
else
    print_error "Cleanup function failed with HTTP status: $HTTP_STATUS"
    print_error "Response: $RESPONSE_BODY"
    
    # Output error for GitHub Actions (if running in GitHub Actions)
    if [ -n "$GITHUB_OUTPUT" ]; then
        echo "results={\"error\":\"HTTP $HTTP_STATUS\",\"details\":\"$RESPONSE_BODY\"}" >> $GITHUB_OUTPUT
    fi
    
    exit 1
fi

print_success "Scheduled cleanup completed at $(date)" 