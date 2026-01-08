# Student Management System

A full-stack MERN (MongoDB, Express.js, React, Node.js) application for managing students, teachers, classes, and attendance with AI chatbot integration and cloud file upload capabilities.

## 🚀 Features

### Core Features
- **CRUD Operations**: Complete Create, Read, Update, Delete functionality for:
  - Students
  - Teachers
  - Classes
  - Attendance

- **Authentication & Authorization**:
  - JWT-based authentication
  - Role-based access control (Admin, Teacher, Student)
  - Secure password hashing with bcrypt

- **AI Chatbot**:
  - OpenAI GPT integration
  - In-app floating chatbot
  - Chat history per user
  - Context-aware responses

- **Cloud File Upload**:
  - AWS S3 integration for file storage
  - Support for multiple file types
  - File preview and download
  - Category-based organization

### UI/UX Features
- Responsive dashboard layout
- Dark/Light mode toggle
- Professional ShadCN-style design
- Search and pagination
- Real-time statistics and charts

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16 or higher)
- MongoDB Atlas account (or local MongoDB)
- OpenAI API key
- AWS account (optional, for S3 file uploads)

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd student-management
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-secret-key

# Dialogflow (recommended for chatbot)
# 1) Create a Dialogflow ES agent in Google Cloud
# 2) Create a service account JSON key
# 3) Paste the entire JSON content as a single line here
DIALOGFLOW_PROJECT_ID=your-gcp-project-id
DIALOGFLOW_LANGUAGE_CODE=en-US
DIALOGFLOW_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"..."}

# Optional: OpenAI (if you still use it elsewhere)
OPENAI_API_KEY=your-openai-api-key

# Optional: AWS S3 uploads
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
```

Tip: this repo also includes `backend/env.example` you can copy into your local `backend/.env`.

### Admin recovery (if MongoDB data is reset)
If your database is empty and you can’t login, you can temporarily enable a **bootstrap admin** via environment variables (disable it again after you recover access):
- `BOOTSTRAP_ADMIN_ENABLED=true`
- `BOOTSTRAP_ADMIN_EMAIL=admin@school.com`
- `BOOTSTRAP_ADMIN_PASSWORD=admin123`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Seed Database (Optional)

To populate the database with sample data:

```bash
cd backend
npm run seed
```

This will create:
- Admin user: `admin@school.com` / `admin123`
- Teacher: `john.smith@school.com` / `teacher123`
- Student: `alice.brown@school.com` / `student123`

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🐳 Docker (Frontend + Backend)

This repo includes separate Dockerfiles for each service:
- `backend/Dockerfile`
- `frontend/Dockerfile`

And a root `docker-compose.yml` to run both together.

### Run with Docker Compose

1. Ensure you have `backend/.env` configured (MongoDB URI, JWT secret, etc.)
2. From the project root:

```bash
docker compose up --build
```

Then open:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## 🤖 Dialogflow Chatbot Setup (replaces the built-in hardcoded responses)

This project can use **Google Dialogflow ES** for chatbot responses when there is no good Knowledge Base match.

### 1) Create the agent
- In Google Cloud Console, enable **Dialogflow API**
- Create a **Dialogflow ES agent** (language should match `DIALOGFLOW_LANGUAGE_CODE`, default `en-US`)

### 2) Create a service account key
- Google Cloud Console → **IAM & Admin → Service Accounts**
- Create a service account (give it permissions to use Dialogflow, e.g. “Dialogflow API Client” or a suitable role)
- Create a **JSON key** and download it

### 3) Configure backend environment variables
In `backend/.env` (or AWS environment variables), set:
- `DIALOGFLOW_PROJECT_ID`
- `DIALOGFLOW_LANGUAGE_CODE` (optional)
- `DIALOGFLOW_SERVICE_ACCOUNT_JSON` (paste the JSON key contents as a single line)

If Dialogflow is not configured, the backend falls back to the existing default replies.


### Production Mode

**Build Frontend:**
```bash
cd frontend
npm run build
```

**Start Backend:**
```bash
cd backend
npm start
```

## 📁 Project Structure

```
student-management/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/             # Route controllers
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── teacherController.js
│   │   ├── classController.js
│   │   ├── attendanceController.js
│   │   ├── chatController.js
│   │   └── uploadController.js
│   ├── middleware/
│   │   └── auth.js              # Authentication middleware
│   ├── models/                  # Mongoose models
│   │   ├── User.js
│   │   ├── Student.js
│   │   ├── Teacher.js
│   │   ├── Class.js
│   │   ├── Attendance.js
│   │   ├── File.js
│   │   └── Chat.js
│   ├── routes/                  # API routes
│   │   ├── authRoutes.js
│   │   ├── studentRoutes.js
│   │   ├── teacherRoutes.js
│   │   ├── classRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── chatRoutes.js
│   │   └── uploadRoutes.js
│   ├── utils/
│   │   ├── seed.js              # Database seeding
│   │   └── s3Upload.js          # AWS S3 utilities
│   ├── uploads/                 # Local file storage (fallback)
│   ├── server.js                # Express server
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   │   ├── Button.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Chatbot.jsx
│   │   │   └── PrivateRoute.jsx
│   │   ├── context/             # React Context
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── layouts/             # Layout components
│   │   │   └── Layout.jsx
│   │   ├── pages/               # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Students.jsx
│   │   │   ├── Teachers.jsx
│   │   │   ├── Attendance.jsx
│   │   │   ├── Upload.jsx
│   │   │   └── Chat.jsx
│   │   ├── services/
│   │   │   └── api.js           # Axios configuration
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── .env.example
└── README.md
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Students
- `GET /api/students` - Get all students (with pagination & search)
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student (Admin/Teacher)
- `PUT /api/students/:id` - Update student (Admin/Teacher)
- `DELETE /api/students/:id` - Delete student (Admin only)

### Teachers
- `GET /api/teachers` - Get all teachers
- `GET /api/teachers/:id` - Get teacher by ID
- `POST /api/teachers` - Create teacher (Admin only)
- `PUT /api/teachers/:id` - Update teacher (Admin only)
- `DELETE /api/teachers/:id` - Delete teacher (Admin only)

### Classes
- `GET /api/classes` - Get all classes
- `GET /api/classes/:id` - Get class by ID
- `POST /api/classes` - Create class (Admin only)
- `PUT /api/classes/:id` - Update class (Admin only)
- `DELETE /api/classes/:id` - Delete class (Admin only)

### Attendance
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/stats` - Get attendance statistics
- `POST /api/attendance` - Mark attendance (Admin/Teacher)
- `POST /api/attendance/bulk` - Bulk mark attendance (Admin/Teacher)

### Chat
- `POST /api/chat/message` - Send message to AI
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/history` - Clear chat history

### File Upload
- `POST /api/upload` - Upload file
- `GET /api/upload` - Get uploaded files
- `DELETE /api/upload/:id` - Delete file

## 👥 User Roles

### Admin
- Full access to all features
- Can manage students, teachers, and classes
- Can mark attendance
- Can upload and delete files

### Teacher
- Can view and manage students
- Can mark attendance
- Can upload files
- Cannot manage teachers

### Student
- Can view own information
- Can view attendance
- Can upload files
- Limited access to other features

## 🧪 Testing

Test credentials (after seeding):
- **Admin**: admin@school.com / admin123
- **Teacher**: john.smith@school.com / teacher123
- **Student**: alice.brown@school.com / student123

## 🔧 Configuration

### MongoDB Setup
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env`

### OpenAI Setup
1. Sign up at https://platform.openai.com
2. Create an API key
3. Update `OPENAI_API_KEY` in `.env`

### AWS S3 Setup (Optional)
1. Create an AWS account
2. Create an S3 bucket
3. Create IAM user with S3 permissions
4. Update AWS credentials in `.env`

**Note**: If AWS S3 is not configured, files will be stored locally in the `backend/uploads` directory.

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Verify your MongoDB connection string
   - Check network connectivity
   - Ensure IP is whitelisted in MongoDB Atlas

2. **JWT Token Errors**
   - Verify `JWT_SECRET` is set in `.env`
   - Clear localStorage and login again

3. **File Upload Fails**
   - Check AWS credentials if using S3
   - Verify `uploads` directory exists in backend
   - Check file size limits (10MB default)

4. **OpenAI API Errors**
   - Verify API key is correct
   - Check API quota/billing
   - Ensure API key has proper permissions

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📧 Support

For support, please open an issue in the repository or contact the development team.

---

**Built with ❤️ using MERN Stack**


