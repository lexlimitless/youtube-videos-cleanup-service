-- Check QR codes with their click counts
SELECT 
    name,
    original_url,
    click_count,
    last_clicked,
    created_at
FROM qr_codes
ORDER BY created_at DESC
LIMIT 5;

-- Check recent clicks with details
SELECT 
    qc.clicked_at,
    qc.ip_address,
    qc.user_agent,
    q.name as qr_code_name
FROM qr_code_clicks qc
JOIN qr_codes q ON q.id = qc.qr_code_id
ORDER BY qc.clicked_at DESC
LIMIT 5; 