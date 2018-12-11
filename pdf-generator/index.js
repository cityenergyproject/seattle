#!/usr/bin/env node

const archiver = require('archiver');
const commander = require('commander');
const csvParse = require('csv-parse');
const csvStringify = require('csv-stringify');
const fs = require('fs');
const path = require('path');
const process = require('process');
const puppeteer = require('puppeteer');

const endpoint = '#seattle';
const parameters = 'report_active=true';

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
  await page.goto(getBuildingUrl(buildingId, baseUrl, year), { waitUntil: 'networkidle0' });
  await page.pdf({
    path: path.join(outputDir, `${buildingId}.pdf`),
    preferCSSPageSize: true
  });
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
    var output = fs.createWriteStream(path.join(outputDir, 'example.zip'));
    var archive = archiver('zip', {
      zlib: { level: 9 }
    });

    output.on('close', resolve);
    archive.on('warning', err => reject(err));
    archive.on('error', err => reject(err));
    archive.pipe(output);

    archive.glob(path.join(outputDir, '*.pdf'));
    archive.glob(path.join(outputDir, 'output.csv'));

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

(async () => {
  commander
    .option('-i --input-csv <input-csv>', 'The CSV to read on input')
    .option('-y --year [year]', 'The year to get data for', '2017')
    .option('-b --batch-size [batch-size]', 'Batch size when downloading PDFs', 5)
    .option('--base-url [base-url]', 'Base URL to get scorecards from', 'http://www.seattle.gov/energybenchmarkingmap')
    .option('-o --output-dir [output-dir]', 'The directory to put generated files in', '.')
    .parse(process.argv);

  if (!commander.inputCsv) {
    commander.help();
  }

  const records = await openCSV(commander.inputCsv);
  const outputRecords = await downloadPdfs(records, commander.batchSize, commander.baseUrl, commander.outputDir, commander.year);
  await writeCSV(path.join(commander.outputDir, 'output.csv'), outputRecords);
  await writeZip(commander.outputDir);
})();
