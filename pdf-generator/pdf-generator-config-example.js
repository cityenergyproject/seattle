module.exports = {
  baseUrl: 'http://localhost:8000',
  outputDirectory: 'test',
  scriptLocation: 'index.js',
  s3Bucket: 'test-bucket',
  environment: 'production',
  email: {
    cc: ['cc@example.com'],
    from: 'from@example.com',
    replyTo: ['reply-to@example.com'],
    returnPath: 'return-path@example.com',
  }
};
