const mongoose = require('mongoose');
const readline = require('readline');

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

// Create interface for reading user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function main() {
  try {
    // Connect to your MongoDB database
    await mongoose.connect('mongodb://localhost:27017/video-sharing-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // List all users for selection
    const users = await User.find({}).select('email username role displayName').lean();
    
    if (users.length === 0) {
      console.log('No users found in the database.');
      process.exit(0);
    }
    
    console.log('\nAvailable users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.username}) - Current role: ${user.role}`);
    });
    
    // Prompt user to select which user to promote
    rl.question('\nEnter the number of the user you want to make an admin: ', async (answer) => {
      const index = parseInt(answer) - 1;
      
      if (isNaN(index) || index < 0 || index >= users.length) {
        console.log('Invalid selection');
        rl.close();
        return;
      }
      
      const selectedUser = users[index];
      
      // Update the user's role to ADMIN
      await User.updateOne(
        { _id: selectedUser._id },
        { $set: { role: 'ADMIN' } }
      );
      
      console.log(`\nSuccess! User ${selectedUser.email} (${selectedUser.username}) has been promoted to ADMIN role.`);
      
      // Verify the update
      const updatedUser = await User.findById(selectedUser._id).select('email username role');
      console.log(`\nUpdated user details: ${updatedUser.email} (${updatedUser.username}) - Role: ${updatedUser.role}`);
      
      rl.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  }
}

main(); 