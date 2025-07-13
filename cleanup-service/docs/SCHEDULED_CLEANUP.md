# Scheduled YouTube Videos Cleanup

This document explains how the scheduled cleanup system works and how to set it up.

## Overview

The YouTube videos cleanup is scheduled to run automatically every **Sunday at 3 AM UTC** to remove:
- Unreferenced videos (not linked to any trackable links)
- Old videos (published more than 90 days ago)
- Stale videos (not fetched in the last 30 days)
- Videos from disconnected integrations
- Videos from inactive users

## Setup Options

### Option 1: GitHub Actions (Recommended)

1. **Set up GitHub Secrets**:
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add a new secret: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Your Supabase service role key

2. **Enable the workflow**:
   - The workflow file `.github/workflows/scheduled-cleanup.yml` is already configured
   - It will automatically run every Sunday at 3 AM UTC
   - You can also trigger it manually from the Actions tab

3. **Monitor results**:
   - Check the Actions tab in GitHub for run history
   - Failed runs will create GitHub issues automatically

### Option 2: External Cron Service

1. **Use the script**:
   ```bash
   # Set environment variable
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   
   # Run the cleanup
   ./scripts/scheduled-cleanup.sh
   ```

2. **Set up cron job**:
   ```bash
   # Add to crontab (run every Sunday at 3 AM UTC)
   0 3 * * 0 /path/to/your/project/scripts/scheduled-cleanup.sh
   ```

### Option 3: Vercel Cron Jobs

If you're using Vercel, you can add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/scheduled-cleanup",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

## Configuration

The cleanup uses these default settings:
- **Remove unreferenced videos**: `true` (PRIORITY)
- **Max age days**: `90` (remove videos older than 90 days)
- **Stale fetch days**: `30` (remove videos not fetched in 30 days)
- **Inactive user days**: `180` (remove videos from users inactive for 180 days)
- **Remove disconnected**: `true` (remove from disconnected integrations)

## Monitoring

### Check Cleanup Logs

Query the `admin_logs` table to see cleanup history:

```sql
SELECT 
  action,
  details,
  created_at
FROM admin_logs 
WHERE action LIKE '%cleanup%'
ORDER BY created_at DESC;
```

### Manual Testing

You can test the cleanup manually:

```bash
# Dry run (test without deleting)
curl -X POST "https://ivwmbyptulpwbdpghamp.supabase.co/functions/v1/cleanup-youtube-videos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"dryRun": true}'

# Actual cleanup
curl -X POST "https://ivwmbyptulpwbdpghamp.supabase.co/functions/v1/cleanup-youtube-videos" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"removeUnreferenced": true, "maxAgeDays": 90}'
```

## Troubleshooting

### Common Issues

1. **Service Role Key Missing**:
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in your environment
   - Check that the key has the necessary permissions

2. **Function Not Found**:
   - Verify the Edge Function is deployed: `supabase functions deploy cleanup-youtube-videos`

3. **Database Connection Issues**:
   - Check that your Supabase project is active
   - Verify the project URL is correct

### Logs and Debugging

- **GitHub Actions**: Check the Actions tab for detailed logs
- **Supabase**: Check the Edge Functions logs in the Supabase dashboard
- **Database**: Query the `admin_logs` table for cleanup history

## Security

- The cleanup function uses the service role key for database access
- All cleanup operations are logged in the `admin_logs` table
- The function includes error handling and validation
- Dry run mode is available for safe testing

## Customization

You can customize the cleanup settings by modifying:
- The GitHub Actions workflow file
- The shell script parameters
- The Edge Function default values

For example, to change the schedule to run daily at 2 AM:
- GitHub Actions: Change `cron: '0 3 * * 0'` to `cron: '0 2 * * *'`
- Shell script: Update the cron job to `0 2 * * *` 