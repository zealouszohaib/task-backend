const multer = require('multer');
const path = require('path');
const { processImageWithGroq } = require('../helper/processImageWithGroq');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'upload/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});



const uploadFile = async (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const filePath = path.join(__dirname, '..', req.file.path);


      let processedData;
      // if (req.file.mimetype === 'application/pdf') {
      //   // Convert PDF to images
      //   const imagePaths = await convertPdfToImage(filePath); // Now correctly returns array
      //   // Process each image
      //   processedData = [];
      //   for (const imgPath of imagePaths) {
      //     const data = await processImageWithGroq(imgPath);
      //     processedData.push(data);
      //   }
      // } else {
        // Process as image
        processedData = await processImageWithGroq(filePath);
      // }
     

      res.json({
        message: 'File uploaded and processed successfully',
        file: {
          originalname: req.file.originalname,
          filename: req.file.filename,
          size: req.file.size,
          path: req.file.path
        },
        processedData: processedData,
      });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Error processing image with Groq or invalid Image' });
    }
  });
};

exports.uploadFile = uploadFile;
