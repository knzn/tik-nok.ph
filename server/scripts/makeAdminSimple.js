const mongoose = require('mongoose');

// User model schema (simplified version of your actual model)
const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  displayName: String,
  role: {
    type: String,
    enum: ['USER', 'MODERATOR', 'ADMIN'],
    default: 'USER'
  }
});

const User = mongoose.model('User', userSchema);

// Get email from command line argument
const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('Please provide an email address as argument');
  console.error('Usage: node makeAdminSimple.js user@example.com');
  process.exit(1);
}

async function main() {
  try {
    // Connect to your MongoDB database
    await mongoose.connect('mongodb://localhost:27017/video-sharing-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Find the user by email
    const user = await User.findOne({ email: targetEmail });
    
    if (!user) {
      console.error(`User with email ${targetEmail} not found`);
      process.exit(1);
    }
    
    // Update the user's role to ADMIN
    user.role = 'ADMIN';
    await user.save();
    
    console.log(`Success! User ${user.email} (${user.username}) has been promoted to ADMIN role.`);
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 