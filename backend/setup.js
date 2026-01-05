import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('🔧 Setting up backend environment...\n');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  process.exit(0);
}

// Read .env.example if it exists
let envContent = '';
if (fs.existsSync(envExamplePath)) {
  envContent = fs.readFileSync(envExamplePath, 'utf8');
} else {
  // Create default .env content
  envContent = `# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
# Replace with your MongoDB Atlas connection string
MONGODB_URI=mongodb://localhost:27017/student-management

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-${Date.now()}

# AWS S3 Configuration (Optional - for cloud file uploads)
# Leave empty to use local file storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=
`;
}

// Write .env file
fs.writeFileSync(envPath, envContent);
console.log('✅ Created .env file');
console.log('\n📝 Next steps:');
console.log('1. Open backend/.env and update the following:');
console.log('   - MONGODB_URI: Add your MongoDB connection string');
console.log('   - JWT_SECRET: Change to a secure random string');
console.log('   - AWS credentials: Add if you want cloud file uploads (optional)');
console.log('\n2. Run "npm run seed" to populate the database with test data');
console.log('3. Run "npm run dev" to start the server\n');
