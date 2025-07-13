# Email Notifications Setup

The YouTube Videos Cleanup system provides comprehensive notifications through GitHub's built-in notification system. Here's how to set up email notifications:

## How Notifications Work

The cleanup system creates GitHub issues for each run:
- **Success**: Creates an issue with detailed results when cleanup completes successfully
- **Failure**: Creates an issue with error details when cleanup fails

## Setting Up Email Notifications

### Option 1: GitHub Email Notifications (Recommended)

1. **Go to GitHub Settings**:
   - Click your profile picture → Settings
   - Or go to: https://github.com/settings

2. **Navigate to Notifications**:
   - Click "Notifications" in the left sidebar
   - Or go to: https://github.com/settings/notifications

3. **Configure Email Notifications**:
   - Under "Email notifications", choose your preferred frequency:
     - **Immediate**: Get emails for all notifications
     - **Daily**: Get a daily digest
     - **Weekly**: Get a weekly digest
   - Make sure your email address is verified

4. **Repository-Specific Settings**:
   - Go to your repository: https://github.com/lexlimitless/QR-Generator-Sales-Tracker
   - Click "Settings" → "Notifications"
   - Enable "Issues" notifications
   - Choose your preferred notification method

### Option 2: Advanced Email Setup (Optional)

If you want more control over email notifications, you can set up custom email credentials:

1. **Add Email Secrets to GitHub**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add these secrets:
     - `EMAIL_USERNAME`: Your Gmail address
     - `EMAIL_PASSWORD`: Your Gmail app password (not regular password)
     - `NOTIFICATION_EMAIL`: Email address to receive notifications

2. **Generate Gmail App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "GitHub Actions"

3. **Update the Workflow**:
   - Uncomment the email steps in `.github/workflows/scheduled-cleanup.yml`
   - The workflow will then send emails directly

## Notification Content

### Success Notifications Include:
- Run timestamp
- Videos before and after cleanup
- Number of videos deleted
- Detailed breakdown of what was deleted
- Any errors encountered

### Failure Notifications Include:
- Run timestamp
- Error details
- Action items to resolve the issue
- Links to relevant logs

## Testing Notifications

To test the notification system:

1. **Manual Trigger**:
   - Go to your repository → Actions
   - Click "Scheduled YouTube Videos Cleanup"
   - Click "Run workflow" → "Run workflow"

2. **Check Results**:
   - After the workflow completes, check the Actions tab for logs
   - Look for new issues created in your repository
   - Verify you received email notifications (if configured)

## Troubleshooting

### No Email Notifications:
1. Check GitHub notification settings
2. Verify your email address is confirmed
3. Check spam/junk folders
4. Ensure repository notifications are enabled

### Missing GitHub Issues:
1. Check the Actions tab for workflow failures
2. Verify the `SUPABASE_SERVICE_ROLE_KEY` secret is set
3. Check the workflow logs for errors

### Custom Email Not Working:
1. Verify Gmail app password is correct
2. Check that all email secrets are set
3. Ensure 2FA is enabled on your Google account

## Notification Schedule

The cleanup runs automatically every Sunday at 3 AM UTC, and you'll receive notifications for each run.

## Labels Used

The system uses these GitHub issue labels:
- `cleanup`: All cleanup-related issues
- `success`: Successful cleanup runs
- `failure`: Failed cleanup runs
- `automated`: Issues created by automation
- `urgent`: Failed runs requiring attention 