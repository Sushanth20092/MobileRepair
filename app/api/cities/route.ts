import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/api'

// In-memory cache for cities
let citiesCache: any[] | null = null
let cacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    if (citiesCache && Date.now() - cacheTime < CACHE_DURATION) {
      return NextResponse.json({ 
        data: citiesCache, 
        cached: true 
      })
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('cities')
      .select('id, name') // Only fetch necessary fields
      .order('name') // Add ordering for better UX

    if (error) {
      console.error('Error fetching cities:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cities' },
        { status: 500 }
      )
    }

    // Update cache
    citiesCache = data || []
    cacheTime = Date.now()

    return NextResponse.json({ 
      data: citiesCache, 
      cached: false 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 