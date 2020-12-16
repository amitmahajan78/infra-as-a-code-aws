# Infrastructure as a code simplified

The purpose of this repo is to demonstrate how to automate cloud infrastructure as well as business service deployments that will be used as a foundation to run the production-grade applications. Most importantly using the programing language that you know and using building your business applications, programming languages like javascript, python etc and configuration style such as yaml.

This is not just another **Infa as a Code** demo, this e3e demo is created using [Serverless](https://www.serverless.com/) and [Pulumi](https://www.pulumi.com/docs/) which provides simplicity and natural adoption of the framework while keeping the declarative style of programming and configuration over code.

## What we will be building

Functionality: this is simple app which will allow users to vote their favorite songs. User can view all song's votes while on the home page however they need to login for vote the song. 

App idea is inspired by following [repository](https://github.com/fernando-mc/serverless-learn-serverlessjams)

Vote the Song App:

![App](https://media.giphy.com/media/FGV6smYaVyQg3o2vUF/giphy.gif)

## Component Integration Architecture

AWS cloud is used for deploying all of the application components that includes:

- API Gateway (exposing rest apis)
- Lambda (business functions)
- DynamoDB (persistance)
- Rout53 (DNS)
- Certificate manager (SSL/HTTPS)
- CloudFront (CDN)
- Custom VPC
- Public Subnets
- EC2 (Running webserver)
- Internet Gateway (access to the webserver)
- ALB (load balancer for webserver)

[Auth0](https://auth0.com/) is used for authentication and authorization, where separate [git repo](https://github.com/amitmahajan78/votethesong-app) is used for hosting static website contents. 

**Following diagram show deployment architecture with different components and their integrations.** 


![](./docs/Deployment-Diagram.jpg)


Deployment is divided into 3 parts, each os these part deal with different concerns, such as, **backend automation** automate deploying business functions (lambda), APIs, and database, where **website automation** works on getting website up and running on multiple availability zones. last part which is **hosting automation** responsibility is to configure services which will host the website on public domain securely and with content delivery enable across continents. following sections will deep dive in each of this deployments:

You can also see in the diagram above that we are going to use 2 separate automation frameworks, 1) **Pulumi**, and 2) **Serverless**. The reason for using 2 separate frameworks is driven by the requirements. for hosting our backend services, we wanted to use AWS managed services such as API Gateway, Lambda and DynamoDB, we don't want to spend anytime configuring or managing these services, we wanted to spend more time building out business services but we also wanted to have cloud-native deployment framework that can be easily migrated to other cloud provide if needed. Therefor, we selected Serverless which provides very simple yaml based configuration that can be simply migrated to other provided. 

For hosting and website automation, we wanted to have more control during the deployment, for example creating custom VPC, security groups, EC2 instance size etc. and Pulumi provides these capabilities while we an still use programing language of our choice. 

:bangbang: Please understand that this deployment cost money and not every service used by this deployment will be applicable for free tier. Although you can clean-up all of the deployment using single command that will make sure you are not unnecessarily charged. Also, you can test backend services from you localhost that mean you don't need to deploy website or hosting services.

if you still happy then move on!

Subsequent section will deep dive into each of these deployments:

1. Deploying backend services - [api](#backend)
2. Deploying website - [app](#website)
3. Deploying hosting services - [hosting](#hosting)

## Prerequisites 

- Clone following [repository](https://github.com/amitmahajan78/infra-as-a-code-aws) and checkout **v0.1** branch. 
- Follow [Serverless - Installation](https://www.serverless.com/framework/docs/providers/aws/guide/installation/) to setup the tool.
- Follow [Pulumi - AWS Setup](https://www.pulumi.com/docs/get-started/aws/begin/) for setting-up pulumi cli. 

this is it! we can now start deploying our infrastructure. 

## <a name="backend">Deploying Backend</a>

For start deploying backend service, goto to the *api-lambda-db* folder:

folder contents:

|Files and Folders| Description|
|:-|:-|
|serverless.yml| serverless configuration file which provides steps to deploy services.|
|package.json|nodejs libraries deployment file|
|listVote.js|lambda function for getting list of songs with their current vote count.|
|addVote.js|lambda function for record the vote for selected song|
|auth.js|validate the JQT token for protected API endpoints|





## <a name="website">Deploying Website</a>



## <a name="hosting">Hosting App</a>