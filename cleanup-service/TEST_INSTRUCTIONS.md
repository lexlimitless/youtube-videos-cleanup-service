# Testing Your YouTube Videos Cleanup Service

## Manual Test Instructions

### 1. Test the Deployed Function
```bash
# From the cleanup-service directory
SUPABASE_URL="https://ivwmbyptulpwbdpghamp.supabase.co" ./test-deployed.sh
```

### 2. Test GitHub Actions Workflow

1. **Go to your repository**: https://github.com/lexlimitless/youtube-videos-cleanup-service
2. **Click "Actions"** tab
3. **Click "Scheduled YouTube Videos Cleanup"** workflow
4. **Click "Run workflow"** → **"Run workflow"** (blue button)
5. **Wait for completion** and check the results

### 3. Check for GitHub Issues

After the workflow runs:
1. **Go to "Issues"** tab in your repository
2. **Look for new issues** created by the workflow
3. **Verify the content** matches the cleanup results

### 4. Monitor Database Logs

Check the `admin_logs` table in your Supabase database:
```sql
SELECT * FROM admin_logs 
WHERE action LIKE '%cleanup%' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Expected Results

### Successful Run:
- ✅ GitHub Actions workflow completes without errors
- ✅ New GitHub issue created with "SUCCESS" label
- ✅ Database logs show cleanup operation
- ✅ No videos deleted (if no cleanup criteria met)

### Failed Run:
- ❌ GitHub Actions workflow fails
- ✅ New GitHub issue created with "FAILURE" and "URGENT" labels
- ❌ Error details in the issue description

## Troubleshooting

### If GitHub Actions Fails:
1. **Check secrets**: Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly
2. **Check permissions**: Ensure the workflow has `issues: write` and `contents: read` permissions
3. **Check logs**: Review the GitHub Actions logs for specific error messages

### If No Issues Created:
1. **Check workflow permissions**: Ensure the workflow can create issues
2. **Check repository settings**: Verify issues are enabled for the repository
3. **Check GitHub notifications**: Ensure you're receiving notifications

### If Function Not Responding:
1. **Check Supabase dashboard**: Verify the function is deployed and active
2. **Test manually**: Use the test script to verify function health
3. **Check logs**: Review Supabase function logs for errors

## Next Steps After Testing

1. **Enable email notifications** (optional):
   - Go to GitHub Settings → Notifications
   - Enable email notifications for issues
   - Configure notification preferences

2. **Monitor scheduled runs**:
   - The workflow runs every Sunday at 3 AM UTC
   - Check the Actions tab weekly for results
   - Review any issues created for cleanup status

3. **Customize cleanup settings** (optional):
   - Edit `functions/cleanup-youtube-videos/config.json`
   - Redeploy the function if changes are made
   - Test with new settings

## Support

If you encounter issues:
1. Check the GitHub Actions logs
2. Review the `admin_logs` table in Supabase
3. Test the function manually using the test script
4. Check the documentation in the `docs/` directory 