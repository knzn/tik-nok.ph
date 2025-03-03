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
        { id: user._id, email: user.email },
        config.jwtSecret,
        { expiresIn: '24h' }
      )

      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username
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
        { id: user._id, email: user.email },
        config.jwtSecret,
        { expiresIn: '24h' }
      )

      return {
        token,
        user: {
          id: user._id,
          email: user.email,
          username: user.username
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
        username: user.username
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
} 