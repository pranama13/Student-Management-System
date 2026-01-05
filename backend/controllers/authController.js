import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Teacher from '../models/Teacher.js';

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'default-secret-key-change-in-production';
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  WARNING: JWT_SECRET not set, using default. Set JWT_SECRET in .env for production!');
  }
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, profile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const resolvedRole = role || 'student';

    // Self-registration should be approved by admin (at least for students)
    const approvalStatus =
      resolvedRole === 'student' || resolvedRole === 'teacher' ? 'pending' : 'approved';

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: resolvedRole,
      profile,
      approvalStatus
    });

    // If pending, do not auto-login. Admin must approve.
    if (user.approvalStatus === 'pending') {
      return res.status(201).json({
        message: 'Registration submitted. Please wait for admin approval before logging in.',
        approvalStatus: user.approvalStatus
      });
    }

    // Approved roles can be logged in immediately (rare for self-register, but keep safe)
    const token = generateToken(user._id);
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === 'email') {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
    }
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.approvalStatus && user.approvalStatus !== 'approved') {
      return res.status(403).json({
        message:
          user.approvalStatus === 'pending'
            ? 'Your account is pending admin approval.'
            : 'Your account has been rejected. Please contact the administrator.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Server error during login' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
