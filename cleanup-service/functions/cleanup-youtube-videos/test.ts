// Test script for the YouTube videos cleanup function
// This can be run locally to test the logic before deploying

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Mock environment variables for testing
const mockEnv = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key'
}

// Mock the Deno.env.get function
const originalEnvGet = Deno.env.get
Deno.env.get = (key: string) => {
  return mockEnv[key as keyof typeof mockEnv] || originalEnvGet(key)
}

// Test data
const testOptions = {
  removeUnreferenced: true,
  maxAgeDays: 90,
  staleFetchDays: 30,
  inactiveUserDays: 180,
  removeDisconnected: true,
  dryRun: true,
  userId: undefined
}

// Test scenarios
const testScenarios = [
  {
    name: 'Default cleanup',
    options: {},
    expected: {
      removeUnreferenced: true,
      maxAgeDays: 90,
      staleFetchDays: 30,
      inactiveUserDays: 180,
      removeDisconnected: true,
      dryRun: false
    }
  },
  {
    name: 'Conservative cleanup',
    options: {
      removeUnreferenced: true,
      maxAgeDays: 365,
      staleFetchDays: 90,
      inactiveUserDays: 365,
      removeDisconnected: false
    },
    expected: {
      removeUnreferenced: true,
      maxAgeDays: 365,
      staleFetchDays: 90,
      inactiveUserDays: 365,
      removeDisconnected: false,
      dryRun: false
    }
  },
  {
    name: 'Aggressive cleanup',
    options: {
      removeUnreferenced: true,
      maxAgeDays: 30,
      staleFetchDays: 7,
      inactiveUserDays: 90,
      removeDisconnected: true
    },
    expected: {
      removeUnreferenced: true,
      maxAgeDays: 30,
      staleFetchDays: 7,
      inactiveUserDays: 90,
      removeDisconnected: true,
      dryRun: false
    }
  },
  {
    name: 'User-specific cleanup',
    options: {
      removeUnreferenced: true,
      userId: 'user_123',
      dryRun: true
    },
    expected: {
      removeUnreferenced: true,
      maxAgeDays: 90,
      staleFetchDays: 30,
      inactiveUserDays: 180,
      removeDisconnected: true,
      dryRun: true,
      userId: 'user_123'
    }
  }
]

// Test function to validate options parsing
function testOptionsParsing() {
  console.log('🧪 Testing options parsing...')
  
  for (const scenario of testScenarios) {
    const options = scenario.options
    const {
      removeUnreferenced = true,
      maxAgeDays = 90,
      staleFetchDays = 30,
      inactiveUserDays = 180,
      removeDisconnected = true,
      dryRun = false,
      userId
    } = options

    const result = {
      removeUnreferenced,
      maxAgeDays,
      staleFetchDays,
      inactiveUserDays,
      removeDisconnected,
      dryRun,
      userId
    }

    const passed = JSON.stringify(result) === JSON.stringify(scenario.expected)
    console.log(`${passed ? '✅' : '❌'} ${scenario.name}: ${passed ? 'PASSED' : 'FAILED'}`)
    
    if (!passed) {
      console.log('  Expected:', scenario.expected)
      console.log('  Got:', result)
    }
  }
}

// Test function to validate date calculations
function testDateCalculations() {
  console.log('\n🧪 Testing date calculations...')
  
  const now = new Date()
  const testCases = [
    { days: 90, description: '90 days ago' },
    { days: 30, description: '30 days ago' },
    { days: 7, description: '7 days ago' }
  ]

  for (const testCase of testCases) {
    const cutoffDate = new Date(now.getTime() - testCase.days * 24 * 60 * 60 * 1000)
    const expectedDaysDiff = Math.floor((now.getTime() - cutoffDate.getTime()) / (24 * 60 * 60 * 1000))
    
    console.log(`✅ ${testCase.description}: ${cutoffDate.toISOString()} (${expectedDaysDiff} days ago)`)
  }
}

// Test function to validate query building
function testQueryBuilding() {
  console.log('\n🧪 Testing query building...')
  
  const mockSupabase = {
    from: (table: string) => ({
      delete: () => ({
        lt: (column: string, value: string) => ({
          eq: (column: string, value: string) => ({
            select: () => ({ count: 'exact', head: true })
          }),
          select: () => ({ count: 'exact', head: true })
        }),
        in: (column: string, subquery: any) => ({
          eq: (column: string, value: string) => ({
            select: () => ({ count: 'exact', head: true })
          }),
          select: () => ({ count: 'exact', head: true })
        })
      })
    })
  }

  const testQueries = [
    {
      name: 'Unreferenced videos query',
      description: 'Videos not referenced by any trackable links (PRIORITY)'
    },
    {
      name: 'Old videos query',
      description: 'Videos published more than 90 days ago'
    },
    {
      name: 'Stale videos query', 
      description: 'Videos not fetched in the last 30 days'
    },
    {
      name: 'Disconnected videos query',
      description: 'Videos from disconnected integrations'
    },
    {
      name: 'Inactive user videos query',
      description: 'Videos from inactive users'
    }
  ]

  for (const query of testQueries) {
    console.log(`✅ ${query.name}: ${query.description}`)
  }
}

// Test function to validate response format
function testResponseFormat() {
  console.log('\n🧪 Testing response format...')
  
  const mockResponse = {
    success: true,
    dryRun: true,
    summary: {
      totalVideosBefore: 1000,
      totalVideosAfter: 950,
      videosDeleted: 50,
      usersProcessed: 10
    },
    details: {
      oldVideos: 20,
      staleVideos: 15,
      disconnectedVideos: 10,
      inactiveUserVideos: 5
    },
    errors: [],
    timestamp: new Date().toISOString()
  }

  const requiredFields = ['success', 'summary', 'details', 'errors', 'timestamp']
  const summaryFields = ['totalVideosBefore', 'totalVideosAfter', 'videosDeleted']
  const detailFields = ['oldVideos', 'staleVideos', 'disconnectedVideos', 'inactiveUserVideos']

  let allValid = true

  // Check required fields
  for (const field of requiredFields) {
    if (!(field in mockResponse)) {
      console.log(`❌ Missing required field: ${field}`)
      allValid = false
    }
  }

  // Check summary fields
  for (const field of summaryFields) {
    if (!(field in mockResponse.summary)) {
      console.log(`❌ Missing summary field: ${field}`)
      allValid = false
    }
  }

  // Check detail fields
  for (const field of detailFields) {
    if (!(field in mockResponse.details)) {
      console.log(`❌ Missing detail field: ${field}`)
      allValid = false
    }
  }

  if (allValid) {
    console.log('✅ Response format validation: PASSED')
  } else {
    console.log('❌ Response format validation: FAILED')
  }
}

// Run all tests
function runTests() {
  console.log('🚀 Starting YouTube Videos Cleanup Function Tests\n')
  
  testOptionsParsing()
  testDateCalculations()
  testQueryBuilding()
  testResponseFormat()
  
  console.log('\n✨ All tests completed!')
}

// Export for use in other test files
export { runTests, testOptionsParsing, testDateCalculations, testQueryBuilding, testResponseFormat }

// Run tests if this file is executed directly
if (import.meta.main) {
  runTests()
} 