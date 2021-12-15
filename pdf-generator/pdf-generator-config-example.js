module.exports = {
  baseUrl: 'http://0.0.0.0:8080',
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
