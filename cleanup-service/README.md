# YouTube Videos Cleanup Service

A standalone service for cleaning up stale YouTube videos from your Supabase database. This service includes a Supabase Edge Function and GitHub Actions workflow for scheduled cleanup operations.

## Features

- **Supabase Edge Function**: Cleans up YouTube videos based on various criteria
- **Scheduled Cleanup**: GitHub Actions workflow runs every Sunday at 3 AM UTC
- **Flexible Cleanup Options**: Remove old videos, stale videos, videos from disconnected integrations, and videos from inactive users
- **Detailed Logging**: All cleanup operations are logged to the `admin_logs` table
- **Dry Run Support**: Test cleanup operations without actually deleting data

## Repository Structure

```
cleanup-service/
├── functions/
│   └── cleanup-youtube-videos/
│       ├── index.ts              # Main Edge Function
│       ├── config.json           # Function configuration
│       ├── deploy.sh             # Deployment script
│       ├── test.sh               # Test script
│       └── README.md             # Function documentation
├── .github/
│   └── workflows/
│       └── scheduled-cleanup.yml # GitHub Actions workflow
├── scripts/
│   └── scheduled-cleanup.sh      # Manual cleanup script
├── docs/
│   └── SCHEDULED_CLEANUP.md      # Detailed documentation
└── README.md                     # This file
```

## Quick Start

### 1. Setup Supabase Project

1. Create a new Supabase project or use an existing one
2. Set up the required database tables (see `docs/SCHEDULED_CLEANUP.md`)
3. Get your Supabase project URL and service role key

### 2. Deploy the Edge Function

```bash
# Navigate to the functions directory
cd functions/cleanup-youtube-videos

# Deploy the function
./deploy.sh
```

### 3. Setup GitHub Actions

1. Fork or create a new repository with this code
2. Add the following secrets to your GitHub repository:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
3. The workflow will automatically run every Sunday at 3 AM UTC

### 4. Test the Setup

```bash
# Test the function manually
./scripts/scheduled-cleanup.sh
```

## Configuration

### Edge Function Configuration

Edit `functions/cleanup-youtube-videos/config.json` to customize cleanup behavior:

```json
{
  "name": "cleanup-youtube-videos",
  "maxAgeDays": 90,
  "staleThresholdDays": 30,
  "inactiveUserDays": 60,
  "batchSize": 100,
  "dryRun": false
}
```

### GitHub Actions Configuration

The workflow runs every Sunday at 3 AM UTC. You can modify the schedule in `.github/workflows/scheduled-cleanup.yml`:

```yaml
on:
  schedule:
    - cron: '0 3 * * 0'  # Every Sunday at 3 AM UTC
```

## Cleanup Criteria

The service can clean up videos based on the following criteria:

1. **Old Videos**: Videos older than `maxAgeDays` (default: 90 days)
2. **Stale Videos**: Videos not updated in `staleThresholdDays` (default: 30 days)
3. **Disconnected Integrations**: Videos from users who have disconnected their YouTube integration
4. **Inactive Users**: Videos from users inactive for `inactiveUserDays` (default: 60 days)

The function prioritizes deleting videos that are not referenced by any links in the `links` table.

## Monitoring

- **GitHub Issues**: The workflow creates issues for successful and failed runs
- **Database Logs**: Check the `admin_logs` table for detailed operation logs
- **Email Notifications**: Configure GitHub notifications to receive email alerts

## Troubleshooting

See `docs/SCHEDULED_CLEANUP.md` for detailed troubleshooting information.

## Security

- The service uses Supabase service role key for database access
- All operations are logged for audit purposes
- Dry run mode is available for testing
- The Edge Function validates all input parameters

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. 