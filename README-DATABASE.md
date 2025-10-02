# Database Setup Guide

This guide explains how to set up and use the Supabase database for the Walking Fitness App.

## Quick Setup

### 1. Run Database Setup Script

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `scripts/setup-database.sql`
4. Run the script to create all tables, indexes, and RLS policies

### 2. Add Sample Data (Optional)

For development and testing:

1. In the SQL Editor, copy and paste the contents of `scripts/seed-database.sql`
2. Run the script to populate tables with sample data

### 3. Environment Variables

Ensure your `.env` file contains:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

### Tables Overview

1. **profiles** - User profile information and preferences
2. **walking_sessions** - Individual walking session records
3. **motivation_journal** - Daily mood and motivation tracking
4. **user_goals** - User-defined fitness goals

### Key Features

- **Row Level Security (RLS)** - Users can only access their own data
- **Automatic timestamps** - `created_at` and `updated_at` fields
- **Data validation** - Check constraints for ratings and enums
- **Performance indexes** - Optimized queries for common operations

## Using the Database Service

The `DatabaseService` class in `lib/database.ts` provides type-safe methods for all database operations:

```typescript
import { DatabaseService } from '../lib/database';

// Get user profile
const profile = await DatabaseService.getProfile(userId);

// Create walking session
const sessionId = await DatabaseService.createWalkingSession({
  user_id: userId,
  start_time: new Date().toISOString(),
  steps: 0,
  distance: 0,
  status: 'active'
});

// Get daily statistics
const stats = await DatabaseService.getDailyStats(userId, '2024-01-15');
```

## Common Operations

### Creating a New Walking Session

```typescript
const sessionId = await DatabaseService.createWalkingSession({
  user_id: user.id,
  start_time: new Date().toISOString(),
  steps: 0,
  distance: 0,
  status: 'active',
  pre_walk_mood: 3,
  motivation_level: 4
});
```

### Updating Session Progress

```typescript
await DatabaseService.updateWalkingSession(sessionId, {
  steps: currentSteps,
  distance: currentDistance,
  route_coordinates: routePoints
});
```

### Completing a Session

```typescript
await DatabaseService.updateWalkingSession(sessionId, {
  end_time: new Date().toISOString(),
  duration: totalSeconds,
  status: 'completed',
  post_walk_mood: 4,
  calories_burned: estimatedCalories
});
```

### Adding Journal Entry

```typescript
await DatabaseService.createJournalEntry({
  user_id: user.id,
  date: new Date().toISOString().split('T')[0],
  mood_rating: 4,
  energy_level: 3,
  motivation_level: 4,
  weather_rating: 5,
  sleep_quality: 4,
  stress_level: 2,
  walked_today: true,
  met_step_goal: true,
  notes: "Great walk in the park today!"
});
```

## Data Types

All database types are defined in `lib/database.ts`:

- `Profile` - User profile data
- `WalkingSession` - Walking session records
- `MotivationJournal` - Daily journal entries
- `UserGoal` - Fitness goals

## Security

- All tables use Row Level Security (RLS)
- Users can only access their own data
- Authentication is handled through Supabase Auth
- API keys should be kept secure and not committed to version control

## Performance

- Indexes are created for common query patterns
- Use the provided `DatabaseService` methods for optimized queries
- Consider pagination for large datasets using the `limit` parameters

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**: Ensure user is authenticated before database operations
2. **Missing Tables**: Run the setup script in Supabase SQL Editor
3. **Type Errors**: Check that data matches the defined TypeScript interfaces

### Debugging

Enable detailed error logging by checking the console output from `DatabaseService` methods. All errors are logged with context information.

## Migration Notes

When updating the database schema:

1. Create migration scripts in the `scripts/` directory
2. Test migrations on a development database first
3. Update TypeScript interfaces in `lib/database.ts`
4. Update this documentation

## Support

For database-related issues:

1. Check Supabase project logs
2. Verify RLS policies are correctly applied
3. Ensure environment variables are set correctly
4. Review the Supabase documentation for advanced features