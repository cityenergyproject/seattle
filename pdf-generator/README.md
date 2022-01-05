# pdf-generator

This is a tool that generates PDFs of scorecards for a list of buildings.

## Running it locally

You can run pdf-generator on your local machine. From the `pdf-generator` directory run `npm install` then `node index.js` to see the documentation for the script.

Make sure you first use the `pdf-generator-config-example.js` file to make a real set of configs. This file is git-ignored and it doesn't seem to matter much what is in it for local script function.

Example usage: 
```bash
node index.js -i 'test.csv' --base-url http://localhost:8080 -y 2020 -o output
```

## Deploy

You can also run `pdf-generator` as a server. Here we document doing so with AWS.


Pre-requisites:
1. [Install the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
2. [Create an AWS profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
3. [Create an key pair](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)
4. [Use AWS SES](https://us-west-1.console.aws.amazon.com/sesv2/home?region=us-west-1#/account) to enter emails for anyone who will be receiving emails from the PDF generator. Recipients will need to validate their email with AWS before they can be used.

Once the above is complete, use CloudFormation and the configuration file (`cloudformation.json`) to create a stack. Replace AWS_PROFILE with the AWS Profile created above. Replace SSH_KEYPAIR_NAME with the name of the key pair created above (in my case, this is saved in `~/.ssh` and I did not include any path name, just the name of the `.pem` file)

```bash
aws --profile=<AWS_PROFILE> cloudformation create-stack --stack-name=seattle-energy --template-body file://cloudformation.json --region us-east-1 --parameters ParameterKey=KeyPair,ParameterValue=<SSH_KEYPAIR_NAME> --capabilities CAPABILITY_IAM
```

This will set up:

 * An EC2 instance that runs the server
 * An S3 bucket where the generated files will be persisted


