# Quick Start Guide - Fix Login Issues

## Problem: Can't login with given credentials

This usually happens because:
1. The `.env` file is missing or incomplete
2. The database hasn't been seeded with test users
3. MongoDB connection is not configured

## Solution Steps

### Step 1: Setup Environment File

Run the setup script to create the `.env` file:

```bash
cd backend
npm run setup
```

### Step 2: Configure MongoDB

Open `backend/.env` and update the `MONGODB_URI`:

**For MongoDB Atlas (Cloud):**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/student-management?retryWrites=true&w=majority
```

**For Local MongoDB:**
```
MONGODB_URI=mongodb://localhost:27017/student-management
```

### Step 3: Seed the Database

This creates the test users (admin, teacher, student):

```bash
cd backend
npm run seed
```

You should see output like:
```
✅ Connected to MongoDB
Admin created
Teachers created
Classes created
Students created

✅ Seed data created successfully!

📋 Default Login Credentials:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨‍💼 Admin:
   Email: admin@school.com
   Password: admin123
...
```

### Step 4: Start the Backend Server

```bash
cd backend
npm run dev
```

### Step 5: Start the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

### Step 6: Try Logging In

Go to http://localhost:3000 and use these credentials:

- **Admin**: `admin@school.com` / `admin123`
- **Teacher**: `john.smith@school.com` / `teacher123`
- **Student**: `alice.brown@school.com` / `student123`

## Troubleshooting

### "Invalid email or password" error
- Make sure you ran `npm run seed` successfully
- Check that MongoDB is connected (you should see "Connected to MongoDB" in the seed output)
- Verify the email and password match exactly (case-sensitive)

### "MongoDB connection failed"
- Check your `MONGODB_URI` in `.env`
- For Atlas: Make sure your IP is whitelisted
- For local: Make sure MongoDB is running (`mongod` or via service)

### "JWT_SECRET not set" warning
- The app will work with a default secret, but update it in `.env` for production
- Run `npm run setup` to regenerate the `.env` file

### Still having issues?
1. Check backend console for error messages
2. Verify `.env` file exists in the `backend` folder
3. Make sure all npm packages are installed: `npm install`
4. Check that the backend server is running on port 5000


