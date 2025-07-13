import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupOptions {
  removeUnreferenced?: boolean;
  maxAgeDays?: number;
  staleFetchDays?: number;
  inactiveUserDays?: number;
  removeDisconnected?: boolean;
  dryRun?: boolean;
  userId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting YouTube videos cleanup function')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse options with defaults
    let options: CleanupOptions = {}
    try {
      options = await req.json()
    } catch (e) {
      console.log('Failed to parse JSON, using defaults')
      options = {}
    }
    
    const {
      removeUnreferenced = true,
      maxAgeDays = 90,
      staleFetchDays = 30,
      inactiveUserDays = 180,
      removeDisconnected = true,
      dryRun = false,
      userId
    } = options

    console.log('Cleanup options:', {
      removeUnreferenced,
      maxAgeDays,
      staleFetchDays,
      inactiveUserDays,
      removeDisconnected,
      dryRun,
      userId: userId || 'all users'
    })

    const results = {
      totalVideosBefore: 0,
      videosDeleted: 0,
      errors: [] as string[],
      details: {
        unreferencedVideos: 0,
        oldVideos: 0,
        staleVideos: 0,
        disconnectedVideos: 0,
        inactiveUserVideos: 0
      }
    }

    // Get total videos count before cleanup
    const { count: totalBefore } = await supabase
      .from('youtube_videos')
      .select('*', { count: 'exact', head: true })

    results.totalVideosBefore = totalBefore || 0
    console.log('Total videos before cleanup:', results.totalVideosBefore)

    // 1. PRIORITY: Remove unreferenced videos
    if (removeUnreferenced) {
      try {
        console.log('Checking for unreferenced videos...')
        
        // Get all videos
        const { data: allVideos } = await supabase
          .from('youtube_videos')
          .select('youtube_video_id, user_id')
        
        // Get all referenced video IDs
        const { data: referencedVideos } = await supabase
          .from('links')
          .select('youtube_video_id')
          .not('youtube_video_id', 'is', null)
        
        const referencedVideoIds = new Set(referencedVideos?.map(v => v.youtube_video_id) || [])
        const unreferencedVideos = allVideos?.filter(v => !referencedVideoIds.has(v.youtube_video_id)) || []
        
        // Filter by user if specified
        const filteredUnreferenced = userId 
          ? unreferencedVideos.filter(v => v.user_id === userId)
          : unreferencedVideos
        
        if (filteredUnreferenced.length > 0) {
          const unreferencedIds = filteredUnreferenced.map(v => v.youtube_video_id)
          
          if (dryRun) {
            results.details.unreferencedVideos = unreferencedIds.length
            console.log(`[DRY RUN] Would delete ${unreferencedIds.length} unreferenced videos`)
          } else {
            const { error } = await supabase
              .from('youtube_videos')
              .delete()
              .in('youtube_video_id', unreferencedIds)
            
            if (error) {
              results.errors.push(`Error deleting unreferenced videos: ${error.message}`)
            } else {
              results.details.unreferencedVideos = unreferencedIds.length
              results.videosDeleted += unreferencedIds.length
              console.log(`Deleted ${unreferencedIds.length} unreferenced videos`)
            }
          }
        } else {
          console.log('No unreferenced videos found')
        }
      } catch (error) {
        results.errors.push(`Error in unreferenced cleanup: ${error.message}`)
        console.error('Error in unreferenced cleanup:', error)
      }
    }

    // 2. Remove old videos
    if (maxAgeDays > 0) {
      try {
        console.log(`Checking for videos older than ${maxAgeDays} days...`)
        const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString()
        
        let query = supabase
          .from('youtube_videos')
          .select('*', { count: 'exact' })
          .lt('published_at', cutoffDate)
        
        if (userId) {
          query = query.eq('user_id', userId)
        }
        
        const { count: oldVideosCount } = await query
        
        if (oldVideosCount && oldVideosCount > 0) {
          if (dryRun) {
            results.details.oldVideos = oldVideosCount
            console.log(`[DRY RUN] Would delete ${oldVideosCount} old videos`)
          } else {
            let deleteQuery = supabase
              .from('youtube_videos')
              .delete()
              .lt('published_at', cutoffDate)
            
            if (userId) {
              deleteQuery = deleteQuery.eq('user_id', userId)
            }
            
            const { error } = await deleteQuery
            
            if (error) {
              results.errors.push(`Error deleting old videos: ${error.message}`)
            } else {
              results.details.oldVideos = oldVideosCount
              results.videosDeleted += oldVideosCount
              console.log(`Deleted ${oldVideosCount} old videos`)
            }
          }
        } else {
          console.log('No old videos found')
        }
      } catch (error) {
        results.errors.push(`Error in old videos cleanup: ${error.message}`)
        console.error('Error in old videos cleanup:', error)
      }
    }

    // 3. Remove stale videos
    if (staleFetchDays > 0) {
      try {
        console.log(`Checking for videos not fetched in ${staleFetchDays} days...`)
        const cutoffDate = new Date(Date.now() - staleFetchDays * 24 * 60 * 60 * 1000).toISOString()
        
        let query = supabase
          .from('youtube_videos')
          .select('*', { count: 'exact' })
          .lt('fetched_at', cutoffDate)
        
        if (userId) {
          query = query.eq('user_id', userId)
        }
        
        const { count: staleVideosCount } = await query
        
        if (staleVideosCount && staleVideosCount > 0) {
          if (dryRun) {
            results.details.staleVideos = staleVideosCount
            console.log(`[DRY RUN] Would delete ${staleVideosCount} stale videos`)
          } else {
            let deleteQuery = supabase
              .from('youtube_videos')
              .delete()
              .lt('fetched_at', cutoffDate)
            
            if (userId) {
              deleteQuery = deleteQuery.eq('user_id', userId)
            }
            
            const { error } = await deleteQuery
            
            if (error) {
              results.errors.push(`Error deleting stale videos: ${error.message}`)
            } else {
              results.details.staleVideos = staleVideosCount
              results.videosDeleted += staleVideosCount
              console.log(`Deleted ${staleVideosCount} stale videos`)
            }
          }
        } else {
          console.log('No stale videos found')
        }
      } catch (error) {
        results.errors.push(`Error in stale videos cleanup: ${error.message}`)
        console.error('Error in stale videos cleanup:', error)
      }
    }

    // Get final count
    const { count: totalAfter } = await supabase
      .from('youtube_videos')
      .select('*', { count: 'exact', head: true })

    const response = {
      success: true,
      dryRun,
      summary: {
        totalVideosBefore: results.totalVideosBefore,
        totalVideosAfter: totalAfter || 0,
        videosDeleted: results.videosDeleted
      },
      details: results.details,
      errors: results.errors,
      timestamp: new Date().toISOString()
    }

    console.log('Cleanup completed:', response)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Cleanup function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}) 