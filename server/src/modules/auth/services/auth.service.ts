import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto' // Node.js built-in crypto module as fallback
import { UserModel } from '../../user/models/user.model'
import { config } from '../../../config/environment'
import type { LoginInput } from '@video-app/shared/types/auth.types'

// Define the input type outside the class
interface RegisterServiceInput {
  email: string;
  username: string;
  password: string;
}

// Fallback function to hash password with crypto
function hashPasswordWithCrypto(password: string): string {
  // Generate a salt
  const salt = crypto.randomBytes(16).toString('hex');
  
  // Hash the password using the salt
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');
  
  // Format: algorithm:iterations:salt:hash
  return `pbkdf2:10000:${salt}:${hash}`;
}

// Fallback function to verify password with crypto
function verifyPasswordWithCrypto(password: string, storedHash: string): boolean {
  const [algorithm, iterations, salt, hash] = storedHash.split(':');
  
  if (algorithm !== 'pbkdf2') {
    return false;
  }
  
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, parseInt(iterations), 64, 'sha512')
    .toString('hex');
  
  return hash === verifyHash;
}

export class AuthService {
  async register(data: RegisterServiceInput) {
    try {
      const existingEmail = await UserModel.findOne({ email: data.email })
      if (existingEmail) {
        throw new Error('Email already registered')
      }

      const existingUsername = await UserModel.findOne({ username: data.username })
      if (existingUsername) {
        throw new Error('Username already taken')
      }

      // More robust password validation
      if (!data.password) {
        throw new Error('Password is required')
      }
      
      if (typeof data.password !== 'string') {
        throw new Error('Password must be a string')
      }
      
      if (data.password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }

      // Hash the password - try multiple approaches
      let hashedPassword: string;
      
      try {
        console.log('Attempting to hash with bcrypt...');
        
        // Try explicit salt generation first (approach 1)
        try {
          const salt = bcrypt.genSaltSync(10);
          hashedPassword = bcrypt.hashSync(String(data.password), salt);
          console.log('Successfully hashed with bcrypt using explicit salt');
        } catch (saltError: unknown) {
          console.log('Explicit salt generation failed, trying direct hashing...');
          
          // Try direct hashing (approach 2)
          hashedPassword = bcrypt.hashSync(String(data.password), 10);
          console.log('Successfully hashed with bcrypt directly');
        }
      } catch (bcryptError: unknown) {
        console.error('All bcrypt approaches failed, using crypto fallback');
        
        // Use Node.js built-in crypto as fallback (approach 3)
        hashedPassword = hashPasswordWithCrypto(data.password);
        console.log('Successfully hashed with crypto fallback');
      }
      
      console.log('Final hashed password type:', typeof hashedPassword);
      console.log('Final hashed password length:', hashedPassword.length);
      
      // Create user with only the necessary fields
      const user = await UserModel.create({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        displayName: data.username
      })

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: '24h' }
      )

      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role
        }
      }
    } catch (error: unknown) {
      console.error('Auth service error:', error);
      
      if (error instanceof Error) {
        // Check for MongoDB duplicate key error
        const mongoError = error as any; // Type assertion for MongoDB-specific properties
        if (mongoError.code === 11000) {
          if (mongoError.keyPattern?.email) {
            throw new Error('Email already registered');
          }
          if (mongoError.keyPattern?.username) {
            throw new Error('Username already taken');
          }
          if (mongoError.keyPattern?.displayName) {
            throw new Error('Display name already taken');
          }
        }
        // Re-throw the original error
        throw error;
      }
      
      // For unknown error types
      throw new Error('Registration failed');
    }
  }

  async login(data: LoginInput) {
    try {
      const { email, password } = data
      const user = await UserModel.findOne({ email })
      if (!user) {
        throw new Error('User not found')
      }

      // Ensure password is a string
      const passwordString = String(password);
      
      // Determine what type of hash we're dealing with
      let isValid = false;
      
      if (user.password.startsWith('pbkdf2:')) {
        // This is a crypto hash
        isValid = verifyPasswordWithCrypto(passwordString, user.password);
      } else {
        // Try bcrypt verification
        try {
          isValid = bcrypt.compareSync(passwordString, user.password);
        } catch (compareError: unknown) {
          console.error('Password comparison failed:', compareError);
          throw new Error('Authentication failed');
        }
      }
      
      if (!isValid) {
        throw new Error('Invalid password')
      }

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: '24h' }
      )

      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role
        }
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Login failed');
      }
    }
  }

  async getUserById(id: string) {
    try {
      const user = await UserModel.findById(id)
      if (!user) {
        throw new Error('User not found')
      }

      return {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role
      }
    } catch (error: unknown) {
      console.error('Error getting user by ID:', error);
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to get user information');
      }
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Determine what type of hash we're dealing with
      let isValid = false;
      
      if (user.password.startsWith('pbkdf2:')) {
        // This is a crypto hash
        isValid = verifyPasswordWithCrypto(currentPassword, user.password);
      } else {
        // Try bcrypt verification
        try {
          isValid = bcrypt.compareSync(currentPassword, user.password);
        } catch (compareError: unknown) {
          console.error('Password comparison failed:', compareError);
          throw new Error('Authentication failed');
        }
      }
      
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash the new password using the same methods as in register
      let hashedPassword: string;
      
      try {
        console.log('Attempting to hash new password with bcrypt...');
        
        // Try explicit salt generation first (approach 1)
        try {
          const salt = bcrypt.genSaltSync(10);
          hashedPassword = bcrypt.hashSync(String(newPassword), salt);
          console.log('Successfully hashed with bcrypt using explicit salt');
        } catch (saltError: unknown) {
          console.log('Explicit salt generation failed, trying direct hashing...');
          
          // Try direct hashing (approach 2)
          hashedPassword = bcrypt.hashSync(String(newPassword), 10);
          console.log('Successfully hashed with bcrypt directly');
        }
      } catch (bcryptError: unknown) {
        console.error('All bcrypt approaches failed, using crypto fallback');
        
        // Use Node.js built-in crypto as fallback (approach 3)
        hashedPassword = hashPasswordWithCrypto(newPassword);
        console.log('Successfully hashed with crypto fallback');
      }

      // Update the user's password
      user.password = hashedPassword;
      await user.save();

      return { 
        success: true, 
        message: 'Password updated successfully' 
      };
    } catch (error: unknown) {
      console.error('Password change error:', error);
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to change password');
      }
    }
  }

  async changeEmail(userId: string, currentPassword: string, newEmail: string) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      let isValid = false;
      
      if (user.password.startsWith('pbkdf2:')) {
        // This is a crypto hash
        isValid = verifyPasswordWithCrypto(currentPassword, user.password);
      } else {
        // Try bcrypt verification
        try {
          isValid = bcrypt.compareSync(currentPassword, user.password);
        } catch (compareError: unknown) {
          console.error('Password comparison failed:', compareError);
          throw new Error('Authentication failed');
        }
      }
      
      if (!isValid) {
        throw new Error('Current password is incorrect');
      }

      // Check if email already exists
      const existingEmail = await UserModel.findOne({ email: newEmail });
      if (existingEmail && existingEmail._id.toString() !== userId) {
        throw new Error('Email already in use by another account');
      }

      // Update the user's email
      user.email = newEmail;
      await user.save();

      return { 
        success: true, 
        message: 'Email updated successfully',
        email: newEmail
      };
    } catch (error: unknown) {
      console.error('Email change error:', error);
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to change email');
      }
    }
  }

  async changeUsername(userId: string, newUsername: string) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if username already exists
      const existingUsername = await UserModel.findOne({ username: newUsername });
      if (existingUsername && existingUsername._id.toString() !== userId) {
        throw new Error('Username already taken');
      }

      // Check username format
      const usernameRegex = /^[a-zA-Z0-9_ ]+$/;
      if (!usernameRegex.test(newUsername)) {
        throw new Error('Username can only contain letters, numbers, underscores, and spaces');
      }

      if (newUsername.length < 3 || newUsername.length > 30) {
        throw new Error('Username must be between 3 and 30 characters');
      }

      // Update the user's username
      user.username = newUsername;
      await user.save();

      return { 
        success: true, 
        message: 'Username updated successfully',
        username: newUsername,
        displayName: user.displayName // Include the displayName in the response
      };
    } catch (error: unknown) {
      console.error('Username change error:', error);
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Failed to change username');
      }
    }
  }
} 