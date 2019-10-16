#!/usr/bin/env node

const AWS = require('aws-sdk');
const archiver = require('archiver');
const commander = require('commander');
const csvParse = require('csv-parse');
const csvStringify = require('csv-stringify');
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const process = require('process');
const puppeteer = require('puppeteer');
const config = require('./pdf-generator-config');

const endpoint = '#seattle';
const parameters = 'report_active=true';
const outputCSVFilename = 'scorecards.csv';
const outputZipFilename = 'scorecards-pdfs.zip';

function getBuildingUrl(buildingId, baseUrl, year) {
  return `${baseUrl}/${endpoint}/${year}?${parameters}&building=${buildingId}`;
}

async function pageToPdf(buildingId, baseUrl, outputDir, year) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  let status = 'success';

  page.on('pageerror', e => {
    console.log(`Page error for ${buildingId}: '${e}'`);
    status = 'page load error';
  });

  console.log(`Generating PDF for building ${buildingId}`);
  try {
    await page.goto(getBuildingUrl(buildingId, baseUrl, year), { waitUntil: 'networkidle0' });
    await page.pdf({
      path: path.join(outputDir, `${buildingId}.pdf`),
      preferCSSPageSize: true
    });
  } catch (e) {
    console.log(`Exception creating PDF for building ${buildingId}`);
    console.log(e);
    status = 'page load error';
  }
  await browser.close();
  return status;
}

async function openCSV(filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      csvParse(data.toString(), { columns: true }, (err, output) => {
        resolve(output);
      });
    });
  });
}

async function writeCSV(filename, records) {
  return new Promise((resolve, reject) => {
    csvStringify(records, { header: true }, (err, output) => {
      fs.writeFile(filename, output, err => {
        resolve();
      });
    });
  });
}

async function writeZip(outputDir) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, outputZipFilename);
    var output = fs.createWriteStream(outputPath);
    var archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', () => resolve(outputPath));
    archive.on('warning', err => reject(err));
    archive.on('error', err => reject(err));
    archive.pipe(output);

    archive.glob('*.pdf', { cwd: outputDir });
    archive.glob(outputCSVFilename, { cwd: outputDir });

    archive.finalize();
  });
}

async function downloadPdfs(records, batchSize, baseUrl, outputDir, year) {
  const outputRecords = [];

  let batch = 1;
  while (batch <= Math.ceil(records.length / batchSize)) {
    const batchRecords = records.slice((batch - 1) * batchSize, batch * batchSize);

    await Promise.all(batchRecords.map(async record => {
      const status = await pageToPdf(record.property_id, baseUrl, outputDir, year);
      outputRecords.push(Object.assign({}, record, {
        pdf_filename: `${record.property_id}.pdf`,
        pdf_status: status
      }));
    }));

    batch++;
  }

  return outputRecords;
}

async function uploadToS3(filename, bucket) {
  return new Promise((resolve, reject) => {
    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      params: { Bucket: bucket }
    });

    const params = {
      Key: `${moment().format('YYYYMMDDHHmmss')}-generated-pdfs.zip`,
      Body: fs.createReadStream(filename)
    };

    s3.upload(params, {}, (err, data) => {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}

async function sendEmail(email, url) {
  const body = `Your scorecard PDFs are ready: ${url}`;
  return new Promise((resolve, reject) => {
    var params = {
      Destination: {
        CcAddresses: config.email.cc,
        ToAddresses: [email]
      },
      Message: {
        Body: {
          Html: {
            Data: body
          },
          Text: {
            Data: body
          }
        },
        Subject: {
          Data: 'City Energy Project: Scorecards generated'
        }
      },
      ReplyToAddresses: config.email.replyTo,
      ReturnPath: config.email.returnPath,
      Source: config.email.from,
      Tags: [{ Name: 'project', Value: 'cityenergyproject-seattle' }]
    };

    const ses = new AWS.SES({ apiVersion: '2010-12-01' });
    ses.sendEmail(params, function(err, data) {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}

(async () => {
  commander
    .option('-i --input-csv <input-csv>', 'The CSV to read on input')
    .option('-y --year [year]', 'The year to get data for', '2017')
    .option('-b --batch-size [batch-size]', 'Batch size when downloading PDFs', 5)
    .option('-e --email [email]', 'Email address to notify on completion')
    .option('--base-url [base-url]', 'Base URL to get scorecards from', 'http://www.seattle.gov/energybenchmarkingmap')
    .option('-o --output-dir [output-dir]', 'The directory to put generated files in', '.')
    .option('--s3-bucket [s3-bucket]', 'S3 bucket to upload zip file to')
    .option('--upload-to-s3', 'Upload to S3')
    .parse(process.argv);

  if (!commander.inputCsv) {
    commander.help();
  }

  const records = await openCSV(commander.inputCsv);
  const outputRecords = await downloadPdfs(records, commander.batchSize, commander.baseUrl, commander.outputDir, commander.year);
  await writeCSV(path.join(commander.outputDir, outputCSVFilename), outputRecords);

  const zipPath = await writeZip(commander.outputDir);

  if (config.environment !== 'production') {
    AWS.config.loadFromPath('./config.json');
  }

  if (commander.uploadToS3 && config.environment === 'production' && commander.s3Bucket) {
    const s3data = await uploadToS3(zipPath, commander.s3Bucket);
    if (commander.email) {
      await sendEmail(commander.email, s3data.Location);
    }
  }
})();
