import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI is not set in .env file');
      process.exit(1);
    }

    // Add connection options for better reliability
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      retryWrites: true,
      w: 'majority'
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    
    // Provide helpful error messages
    if (error.message.includes('ENOTFOUND') || error.message.includes('querySrv')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('   1. Check if your MongoDB Atlas cluster exists and is accessible');
      console.error('   2. Verify your internet connection');
      console.error('   3. Ensure your IP address is whitelisted in MongoDB Atlas');
      console.error('   4. Check if the connection string in .env is correct');
      console.error('   5. Try using a standard connection string format:');
      console.error('      mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority');
    }
    
    process.exit(1);
  }
};

export default connectDB;

