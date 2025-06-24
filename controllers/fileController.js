const { saveFile, getFileById, getFilesByCategory } = require('../models/File');

exports.uploadFile = async (req, res) => {
  console.log('Received upload request:', { category: req.body.category, file: req.file ? req.file.originalname : 'No file' });
  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const category = (req.body.category || 'Others').replace(/[^a-zA-Z0-9\s\-]/g, '');

  try {
    const fileData = await saveFile(req.file, category, req.file.originalname);
    console.log(`File saved successfully: ${fileData.name}`);
    res.json(fileData);
  } catch (err) {
    console.error('Upload error:', err.message, err.stack);
    res.status(500).json({ error: `Failed to save file: ${err.message}` });
  }
};

exports.getFile = async (req, res) => {
  try {
    const downloadStream = await getFileById(req.params.id);
    downloadStream.on('data', (chunk) => res.write(chunk));
    downloadStream.on('end', () => res.end());
    downloadStream.on('error', (err) => {
      console.error('Error retrieving file:', err);
      res.status(404).json({ error: 'File not found' });
    });
  } catch (err) {
    console.error('Error serving file:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getCategories = (req, res) => {
  console.log('Fetching categories');
  const categories = [
    'Schematics', 'BoardViews', 'SPI Bios', 'T2 Bios', 'Usb -C Bios', 
    'Impedance DV / G.R Value', 'Case Study', 'Digital Oscilloscope', 
    'Images', 'Videos'
  ];
  res.json(categories);
};

exports.getFilesByCategory = async (req, res) => {
  const category = req.params.category;
  console.log(`Fetching files for category: ${category}`);
  try {
    const fileList = await getFilesByCategory(category);
    console.log(`Found ${fileList.length} files in category: ${category}`);
    res.json(fileList);
  } catch (err) {
    console.error('Error fetching files:', err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
};