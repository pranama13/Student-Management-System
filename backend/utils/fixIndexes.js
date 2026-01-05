import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixIndexes = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Fix users collection indexes
    try {
      const usersCollection = db.collection('users');
      
      // List all indexes
      const indexes = await usersCollection.indexes();
      console.log('Current indexes on users collection:', indexes.map(idx => idx.name));
      
      // Drop username index if it exists
      try {
        await usersCollection.dropIndex('username_1');
        console.log('✅ Dropped username_1 index');
      } catch (e) {
        if (e.code === 27) {
          console.log('ℹ️  username_1 index does not exist');
        } else {
          console.log('⚠️  Error dropping username_1:', e.message);
        }
      }

      // Ensure email index exists and is correct
      try {
        await usersCollection.createIndex({ email: 1 }, { unique: true, sparse: true });
        console.log('✅ Created/verified email index');
      } catch (e) {
        console.log('⚠️  Email index already exists or error:', e.message);
      }

      // Rebuild indexes
      await usersCollection.reIndex();
      console.log('✅ Rebuilt indexes');
      
    } catch (error) {
      console.error('Error fixing indexes:', error);
    }

    await mongoose.connection.close();
    console.log('✅ Index fix completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixIndexes();


