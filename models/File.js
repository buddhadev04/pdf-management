require('dotenv').config();
const { getBucket } = require('../config/db');
const { ObjectId } = require('mongodb');
const stream = require('stream');

async function saveFile(file, category, originalName) {
  const bucket = getBucket();
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const filename = `${uniqueSuffix}-${originalName}`;
  
  const readableStream = new stream.PassThrough();
  readableStream.end(file.buffer);
  const uploadStream = bucket.openUploadStream(filename, {
    metadata: { category, originalName },
  });
  
  return new Promise((resolve, reject) => {
    readableStream.pipe(uploadStream);
    uploadStream.on('finish', () => {
      resolve({
        id: Date.now(),
        name: originalName,
        category,
        url: `${process.env.BASE_URL}/api/file/${uploadStream.id}`,
      });
    });
    uploadStream.on('error', (err) => reject(err));
  });
}

async function getFileById(fileId) {
  const bucket = getBucket();
  return bucket.openDownloadStream(new ObjectId(fileId));
}

async function getFilesByCategory(category) {
  const bucket = getBucket();
  const files = await bucket.find({ 'metadata.category': category }).toArray();
  return files.map((file, index) => ({
    id: index + 1,
    name: file.metadata.originalName,
    url: `${process.env.BASE_URL}/api/file/${file._id}`,
  }));
}

module.exports = { saveFile, getFileById, getFilesByCategory };