# Fix E11000 Duplicate Key Error (username index)

## The Problem
MongoDB has a `username_1` index on the `users` collection that doesn't exist in our User model. When seeding, multiple documents with `username: null` violate the unique constraint.

## Solution

### Option 1: Run the Fixed Seed Script (Recommended)
The seed script now automatically drops the problematic index:

```bash
cd backend
npm run seed
```

### Option 2: Manually Fix the Index
If Option 1 doesn't work, run this MongoDB command directly:

```bash
# Connect to MongoDB (use your connection string)
mongosh "your-mongodb-connection-string"

# Drop the username index
use test  # or your database name
db.users.dropIndex("username_1")

# Exit
exit
```

### Option 3: Use the Fix Index Script
```bash
cd backend
# Make sure .env has MONGODB_URI set
npm run fix-indexes
```

## What Was Fixed
1. ✅ Seed script now drops `username_1` index before seeding
2. ✅ Added fix-indexes utility script
3. ✅ User model email field uses `sparse: true` for better index handling
4. ✅ Better error handling in all controllers

After fixing, run `npm run seed` again.


