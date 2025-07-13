# YouTube Videos Cleanup Edge Function

This Supabase Edge Function automatically cleans up YouTube videos from the database based on various criteria to maintain optimal performance and storage efficiency.

## Features

- **Unreferenced videos cleanup**: **PRIORITY** - Remove videos not linked to any trackable links
- **Age-based cleanup**: Remove videos older than a specified number of days
- **Stale data cleanup**: Remove videos that haven't been fetched recently
- **Disconnected integrations**: Remove videos from users with disconnected YouTube integrations
- **Inactive users**: Remove videos from users who haven't been active recently
- **Dry run mode**: Test cleanup operations without actually deleting data
- **User-specific cleanup**: Clean up videos for a specific user only
- **Detailed reporting**: Comprehensive logs and statistics

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `removeUnreferenced` | boolean | true | **PRIORITY**: Remove videos not referenced by any trackable links |
| `maxAgeDays` | number | 90 | Remove videos published more than this many days ago |
| `staleFetchDays` | number | 30 | Remove videos not fetched in the last N days |
| `inactiveUserDays` | number | 180 | Remove videos from users inactive for N days |
| `removeDisconnected` | boolean | true | Remove videos from disconnected YouTube integrations |
| `dryRun` | boolean | false | Test mode - don't actually delete, just report |
| `userId` | string | undefined | Clean up videos for specific user only |

## Usage

### Manual Invocation

```bash
# Deploy the function
supabase functions deploy cleanup-youtube-videos

# Invoke with default settings
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-youtube-videos \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

# Dry run to see what would be deleted
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-youtube-videos \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Custom cleanup settings
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-youtube-videos \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "maxAgeDays": 60,
    "staleFetchDays": 15,
    "inactiveUserDays": 90,
    "removeDisconnected": true,
    "dryRun": false
  }'

# Clean up specific user
curl -X POST https://your-project.supabase.co/functions/v1/cleanup-youtube-videos \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "dryRun": true
  }'
```

### Scheduled Execution

Set up a cron job or use Supabase's scheduled functions:

```sql
-- Create a scheduled function call (example)
SELECT cron.schedule(
  'youtube-videos-cleanup',
  '0 2 * * *', -- Daily at 2 AM UTC
  'SELECT net.http_post(
    url := ''https://your-project.supabase.co/functions/v1/cleanup-youtube-videos'',
    headers := ''{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'',
    body := ''{"maxAgeDays": 90, "staleFetchDays": 30, "inactiveUserDays": 180, "removeDisconnected": true}''
  );'
);
```

## Response Format

```json
{
  "success": true,
  "dryRun": false,
  "summary": {
    "totalVideosBefore": 1250,
    "totalVideosAfter": 980,
    "videosDeleted": 270,
    "usersProcessed": 45
  },
  "details": {
    "oldVideos": 120,
    "staleVideos": 85,
    "disconnectedVideos": 45,
    "inactiveUserVideos": 20
  },
  "errors": [],
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

The function includes comprehensive error handling:

- **Database errors**: Logged and reported in the response
- **Invalid parameters**: Validated with sensible defaults
- **Permission errors**: Handled gracefully with clear error messages
- **Network timeouts**: Retry logic for external API calls

## Security Considerations

- Uses service role key for database access
- Validates all input parameters
- Implements proper CORS headers
- Logs all operations for audit trails
- Supports dry run mode for safe testing

## Monitoring

Monitor the function execution through:

1. **Supabase Dashboard**: Function logs and metrics
2. **Response data**: Detailed statistics in function response
3. **Database queries**: Monitor `youtube_videos` table size changes
4. **Error tracking**: Check for failed cleanup operations

## Best Practices

1. **Always test with dry run first** before running actual cleanup
2. **Start with conservative settings** and adjust based on your needs
3. **Monitor the impact** on your application performance
4. **Set up alerts** for failed cleanup operations
5. **Regular review** of cleanup criteria and thresholds

## Troubleshooting

### Common Issues

1. **Permission denied**: Ensure service role key has proper permissions
2. **Timeout errors**: Large datasets may require longer execution time
3. **Foreign key constraints**: Videos linked to trackable_links may not be deleted
4. **RLS policies**: Ensure service role bypasses RLS for cleanup operations

### Debug Mode

Enable detailed logging by setting the `dryRun` flag to `true` and reviewing the response details.

## Dependencies

- Supabase Edge Functions runtime
- Deno standard library
- Supabase JavaScript client 