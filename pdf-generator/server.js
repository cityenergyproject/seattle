const express = require('express');
const app = express();
const port = 3020;
const spawn = require('child_process').spawn;
const moment = require('moment');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');

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
  const outputPath = path.join(config.outputDirectory, req.file.filename.split('-')[0]);
  fs.mkdirSync(outputPath);

  const pdfProcess = spawn('node', [
    config.scriptLocation,
    '--input-csv', req.file.path,
    '--output-dir', outputPath,
    '--base-url', config.baseUrl,
    '--email', req.body.email,
    '--s3-bucket', config.s3Bucket,
    '--region', config.region,
    '--year', req.body.year,
    '--upload-to-s3'
  ]);

  pdfProcess.stderr.on('data', data => console.warn(data.toString()));
  pdfProcess.stdout.on('data', data => console.log(data.toString()));
  pdfProcess.on('close', () => console.log('pdfProcess closed'));

  return new Promise((resolve, reject) => {
    fs.readFile(path.join('static', 'requestProcessing.html'), (err, data) => {
      resolve(res.send(Mustache.render(data.toString(), { email: req.body.email })));
    });
  });

  return res.send(`We are generating the PDFs for the buildings you requested. When they are ready ${req.body.email} will receive an email.`);
});

app.listen(port, () => console.log(`pdf-generator server listening on port ${port}!`));
