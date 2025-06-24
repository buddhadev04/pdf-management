require('dotenv').config();
const { MongoClient, GridFSBucket } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb+srv://admin2000:admin123@loginapi.glf63.mongodb.net/fileStorage?retryWrites=true&w=majority&appName=LoginAPI';
const client = new MongoClient(uri);
let db, bucket;

async function connectToMongoDB() {
  try {
    await client.connect();
    db = client.db('fileStorage');
    bucket = new GridFSBucket(db, { bucketName: 'uploads' });
    console.log('Connected to MongoDB Atlas');
    return { db, bucket };
  } catch (err) {
    console.error('MongoDB connection error:', err);
    throw err;
  }
}

module.exports = { connectToMongoDB, getDb: () => db, getBucket: () => bucket };