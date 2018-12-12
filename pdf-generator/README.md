# pdf-generator

This is a tool that generates PDFs of scorecards for a list of buildings.

## Deploy

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
