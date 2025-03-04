/**
 * This script promotes a user to ADMIN role
 * Usage: node makeAdminDirect.js <userEmail>
 */

const mongoose = require('mongoose');
const path = require('path');

// Get email from command line argument
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Please provide a user email as an argument');
  console.error('Usage: node makeAdminDirect.js user@example.com');
  process.exit(1);
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/video-sharing-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Import the User model
    const UserSchema = new mongoose.Schema({
      email: String,
      username: String,
      password: String,
      displayName: String,
      bio: String,
      profilePicture: String,
      coverPhoto: String,
      isVerified: Boolean,
      followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      role: {
        type: String,
        enum: ['USER', 'MODERATOR', 'ADMIN'],
        default: 'USER'
      },
      createdAt: Date,
      updatedAt: Date
    });
    
    const User = mongoose.model('User', UserSchema);

    // Find the user by email
    const user = await User.findOne({ email: userEmail });
    
    if (!user) {
      console.error(`User with email ${userEmail} not found in the database`);
      process.exit(1);
    }

    console.log(`Found user: ${user.email} (${user.username}), current role: ${user.role}`);

    // Update the user role to ADMIN
    user.role = 'ADMIN';
    await user.save();

    console.log(`User has been successfully promoted to ADMIN role!`);
    
    // Verify the update
    const updatedUser = await User.findOne({ email: userEmail });
    console.log(`Verified: ${updatedUser.email} now has role: ${updatedUser.role}`);

    mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 