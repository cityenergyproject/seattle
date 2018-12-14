# pdf-generator

This is a tool that generates PDFs of scorecards for a list of buildings.

## Running it locally

You can run pdf-generator on your local machine. From the `pdf-generator` directory run `npm install` then `node index.js` to see the documentation for the script.

## Deploy

You can also run `pdf-generator` as a server. Here we document doing so with AWS.

Create an EC2 instance running Amazon Linux.

On EC2:

 1. Install nginx:

 `sudo amazon-linux-extras install nginx1.12`

 2. Install nodejs:

 ```bash
 curl --silent --location https://rpm.nodesource.com/setup_10.x | sudo bash -
 sudo yum install -y nodejs
 ```

 3. Install dependencies for puppeteer:

 ```bash
 sudo yum install alsa-lib.x86_64
 sudo yum install atk.x86_64
 sudo yum install cups-libs.x86_64
 sudo yum install gtk3.x86_64
 sudo yum install libXcomposite.x86_64
 sudo yum install libXcursor.x86_64
 sudo yum install libXdamage.x86_64
 sudo yum install libXext.x86_64
 sudo yum install libXi.x86_64
 sudo yum install libXrandr.x86_64
 sudo yum install libXtst.x86_64
 sudo yum install libXScrnSaver.x86_64
 ```

 4. Install git:

 ```bash
 sudo yum install git
 ```

 5. Clone the repo:

 ```bash
 git clone https://github.com/cityenergyproject/seattle.git
 ```

 6. Make a symlink since we'll only be dealing with a subdirectory:

 ```bash
 ln -s seattle/pdf-generator .
 ```

 7. Install dependencies:

 ```bash
 cd pdf-generator
 npm install
 ```

 8. Copy and change config file:

 ```bash
 cp pdf-generator-config-example.js pdf-generator-config.js
 ```

 9. Create a `config.json` with the AWS credentials.

 10. Install [pm2](https://github.com/Unitech/pm2):

 ```bash
 sudo npm install pm2 -g
 ```

 and keep the server running:

 ```bash
 pm2 start server.js
 ```
