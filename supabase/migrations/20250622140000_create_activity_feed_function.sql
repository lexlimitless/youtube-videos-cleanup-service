CREATE OR REPLACE FUNCTION get_activity_feed(
    p_user_id TEXT,
    p_filter TEXT,
    p_page INT,
    p_page_size INT
)
RETURNS TABLE (
    event_type TEXT,
    link_title TEXT,
    destination_url TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ
) AS $$
DECLARE
    offset_val INT;
BEGIN
    offset_val := (p_page - 1) * p_page_size;

    RETURN QUERY
    WITH all_events AS (
        -- Clicks
        SELECT
            'Click' AS event_type,
            l.title AS link_title,
            l.original_url AS destination_url,
            'Clicked' AS details,
            c.created_at AS timestamp
        FROM clicks c
        JOIN links l ON c.short_code = l.short_code
        WHERE l.user_id = p_user_id AND (p_filter = 'all' OR p_filter = 'clicks')

        UNION ALL

        -- Calls
        SELECT
            'Call' AS event_type,
            l.title AS link_title,
            l.original_url AS destination_url,
            'Booked by ' || ca.calendly_email || ' for event ' || ca.event_name AS details,
            ca.timestamp AS timestamp
        FROM calls ca
        JOIN links l ON ca.short_code = l.short_code
        WHERE l.user_id = p_user_id AND (p_filter = 'all' OR p_filter = 'calls')

        UNION ALL

        -- Sales
        SELECT
            'Sale' AS event_type,
            l.title AS link_title,
            l.original_url AS destination_url,
            '$' || s.amount::TEXT || ' ' || s.currency || ' sale' AS details,
            s.created_at AS timestamp
        FROM sales s
        JOIN links l ON s.short_code = l.short_code
        WHERE l.user_id = p_user_id AND (p_filter = 'all' OR p_filter = 'sales')
    )
    SELECT *
    FROM all_events
    ORDER BY timestamp DESC
    LIMIT p_page_size
    OFFSET offset_val;
END;
$$ LANGUAGE plpgsql; 