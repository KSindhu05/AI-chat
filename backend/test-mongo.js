const mongoose = require('mongoose');
require('dotenv').config();

console.log("Testing Connection to URI:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
}).then(() => {
  console.log("SUCCESS! Connected to MongoDB.");
  process.exit(0);
}).catch(err => {
  console.error("ERROR:");
  console.error(err.message);
  process.exit(1);
});
