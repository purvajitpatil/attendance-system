require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const seedTeacher = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qr_attendance';

  const teacherEmail = process.env.SEED_TEACHER_EMAIL || 'teacher@university.edu';
  const teacherPassword = process.env.SEED_TEACHER_PASSWORD || 'TeacherPass123!';
  const teacherName = process.env.SEED_TEACHER_NAME || 'Dr. Alan Turing';

  console.log(`Connecting to MongoDB at: ${uri}`);

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connection established.');

    const existingTeacher = await User.findOne({ email: teacherEmail.toLowerCase().trim() });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(teacherPassword, salt);

    if (existingTeacher) {
      console.log(`Teacher account (${teacherEmail}) already exists. Updating password & role...`);
      existingTeacher.name = teacherName;
      existingTeacher.passwordHash = passwordHash;
      existingTeacher.role = 'teacher';
      await existingTeacher.save();
      console.log('Teacher account successfully updated.');
    } else {
      console.log(`Creating initial teacher account: ${teacherEmail}...`);
      await User.create({
        name: teacherName,
        email: teacherEmail.toLowerCase().trim(),
        passwordHash,
        role: 'teacher',
      });
      console.log('Teacher account successfully created.');
    }

    console.log('--------------------------------------------------');
    console.log('Teacher Credentials for Login:');
    console.log(`Email:    ${teacherEmail}`);
    console.log(`Password: ${teacherPassword}`);
    console.log(`Role:     teacher`);
    console.log('--------------------------------------------------');

    await mongoose.disconnect();
    console.log('Database disconnected. Seeding completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during teacher seeding:', error.message);
    process.exit(1);
  }
};

seedTeacher();
