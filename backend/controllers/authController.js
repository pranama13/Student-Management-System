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

    const normalizedEmail = email.toLowerCase().trim();

    const bootstrapEnabled = process.env.BOOTSTRAP_ADMIN_ENABLED === 'true';
    const bootstrapEmail =
      (process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@school.com').toLowerCase().trim();
    const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'admin123';
    const isBootstrapAttempt =
      bootstrapEnabled &&
      normalizedEmail === bootstrapEmail &&
      password === bootstrapPassword;

    // Find user
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // If DB was reset and bootstrap is enabled, auto-create the admin on first login attempt.
      if (isBootstrapAttempt) {
        console.warn(
          '⚠️  BOOTSTRAP admin login used. Disable BOOTSTRAP_ADMIN_ENABLED after restoring admin access.'
        );
        user = await User.create({
          name: 'Super Admin',
          email: bootstrapEmail,
          password: bootstrapPassword,
          role: 'admin',
          approvalStatus: 'approved',
          approvedAt: new Date()
        });
      } else {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    }

    // Bootstrap recovery: allow login with the bootstrap password even if the stored password differs.
    // This is intentional for "DB reset / locked out" recovery. Disable BOOTSTRAP_ADMIN_ENABLED after use.
    if (isBootstrapAttempt) {
      user.role = 'admin';
      user.approvalStatus = 'approved';
      user.approvedAt = new Date();
      user.password = bootstrapPassword; // will be hashed by pre-save hook
      await user.save();
    } else {
      // Normal login: check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    }

    // Only after password verification: enforce approval checks for normal users
    if (user.approvalStatus && user.approvalStatus !== 'approved') {
      return res.status(403).json({
        message:
          user.approvalStatus === 'pending'
            ? 'Your account is pending admin approval.'
            : 'Your account has been rejected. Please contact the administrator.'
      });
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
