const express = require('express');
const app = express();
const port = 3000;
const spawn = require('child_process').spawn;
const moment = require('moment');
const multer = require('multer');

const config = require('./pdf-generator-config');

// multer takes care of uploading the CSV to the uploads folder
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
      return cb(null, `${moment().format('YYYYMMDDHHmmss')}-${file.originalname}`);
    }
  })
});

// Serve the landing page
app.use(express.static('static'));

// Accept a POST request, spawn off a process to generate the PDFs
app.post('/accept-csv', upload.single('csv'), (req, res) => {
  const pdfProcess = spawn('node', [
    config.scriptLocation,
    '--input-csv', req.file.path,
    '--output-dir', config.outputDirectory,
    '--base-url', config.baseUrl,
    '--email', req.body.email,
    '--upload-to-s3'
  ]);

  pdfProcess.stderr.on('data', data => console.warn(data.toString()));
  pdfProcess.stdout.on('data', data => console.log(data.toString()));
  pdfProcess.on('close', () => console.log('pdfProcess closed'));

  return res.send(`We are generating the PDFs for the buildings you requested. When they are ready ${req.body.email} will receive an email.`);
});

app.listen(port, () => console.log(`pdf-generator server listening on port ${port}!`));
