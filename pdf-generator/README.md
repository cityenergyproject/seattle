# pdf-generator

This is a tool that generates PDFs of scorecards for a list of buildings.

## Running it locally

You can run pdf-generator on your local machine. From the `pdf-generator` directory run `npm install` then `node index.js` to see the documentation for the script.

Make sure you first use the `pdf-generator-config-example.js` file to make a real set of configs. This file is git-ignored and it doesn't seem to matter much what is in it for local script function.

## Deploy

You can also run `pdf-generator` as a server. Here we document doing so with AWS.

Use CloudFormation and the configuration file (`cloudformation.json`) to create  a stack:

```
aws --profile=<AWS_PROFILE> cloudformation create-stack --stack-name=seattle-energy --template-body file://cloudformation.json --region us-east-1 --parameters ParameterKey=KeyPair,ParameterValue=<SSH_KEYPAIR_NAME> --capabilities CAPABILITY_IAM
```

This will set up:

 * An EC2 instance that runs the server
 * An S3 bucket where the generated files will be persisted

You will need to verify an email address for sending emails in SES.
