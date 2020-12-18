# Infrastructure as a code simplified

The purpose of this repo is to demonstrate how to automate cloud infrastructure as well as business service deployments that will be used as a foundation to run the production-grade applications. Most importantly using the programing language that you know and using building your business applications, programming languages like javascript, python etc and configuration style such as yaml.

This is not just another **Infa as a Code** demo, this e3e demo is created using [Serverless](https://www.serverless.com/) and [Pulumi](https://www.pulumi.com/docs/) which provides simplicity and natural adoption of the framework while keeping the declarative style of programming and configuration over code.

## What we will be building

Functionality: this is a simple app which will allow users to vote their favourite songs. User can view all song's votes while on the home page however they need to login for a vote the song. 

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


Deployment is divided into 3 parts, each os these part deal with different concerns, such as **backend automation** automate deploying business functions (lambda), APIs, and database, where **website automation** works on getting a website up and running on multiple availability zones. last part which is **hosting automation** responsibility is to configure services which will host the website on public domain securely and with content delivery enable across continents. following sections will deep dive in each of this deployments:

You can also see in the diagram above that we are going to use 2 separate automation frameworks, 1) **Pulumi**, and 2) **Serverless**. The reason for using 2 separate frameworks is driven by the requirements. for hosting our backend services, we wanted to use AWS managed services such as API Gateway, Lambda and DynamoDB, we don't want to spend any time configuring or managing these services, we wanted to spend more time building out business services but we also wanted to have cloud-native deployment framework that can be easily migrated to other cloud provide if needed. Therefore, we selected Serverless which provides very simple yaml based configuration that can be simply migrated to other provided. 

For hosting and website automation, we wanted to have more control during the deployment, for example, creating custom VPC, security groups, EC2 instance size etc. and Pulumi provides these capabilities while we still use programing language of our choice. 

**WARNING** :bangbang: Please understand that this deployment cost money and not every service used by this deployment will be applicable for the free tier. Although you can clean-up all of the deployment using a single command that will make sure you are not unnecessarily charged. Also, if you want, you can deploy only backend services and test from your localhost by running the website on you local system, that means you don't need to deploy a website or hosting services if you just wanted to play with the code.:bangbang:

if you are still happy then move on!

The subsequent section will deep dive into each of these deployments:

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
|listVote.js|lambda function for getting the list of songs with their current vote count.|
|addVote.js|lambda function for the record the vote for selected song|
|auth.js|validate the JQT token for protected API endpoints|

1. Create 2 file 1) public_key, 2) secrets.json - these files contain the key and secret for **auth** function to validate the jwt token. 

- public_key can be downloaded from your auth0 account by login into the account and goto Setting > Signing Keys > List of valid Keys. where you can click on the 3 dots and download "Signing Certificates", rename file to public_key and placed into *api-lambda-db* folder.
- secrets.json contain you auth0 account's audience (or identifier), for that you have to create the API, provide the identifier and the use the same in secrets.json file.
![](docs/API_Secret.png)     

2. Run `npm install` to get all nodejs dependencies.
3. As a final step, you can run following `serverless deploy`

if you see the following output that means your deployment was successful. Please note down API/Endpoint ID.

![](docs/Serverless_Backend_Deployment.png)

4. You should be able to test the following rest APIs now.

- Test Add Vote API
  - Get Auth token
```js
curl --request POST \
  --url https://thesaastech.eu.auth0.com/oauth/token \
  --header 'content-type: application/json' \
  --data '{"client_id":"REPLACE_WITH_CLIENT_ID","client_secret":"REPLACE_WITH_CLIENT_SECRET","audience":"REPLACE_WITH_AUDIENCE","grant_type":"client_credentials"}'
```
Output:
```js
{"access_token":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjJpS2FOUmNvRHpOcnBnZzhuS1F2RSJ9.eyJpc3MiOiJodHRwczovL3RoZXNhYXN0ZWNoLmV1LmF1dGgwLmNvbS8iLCJzdWIiOiJEeTVZZkZzSnJJdTFyalRZbWhSNlozT2tYVXRBd0x6bkBjbGllbnRzIiwiYXVkIjoiYXNuZGtzYWhkODJ5aGRqa3NjIiwiaWF0IjoxNjA4MTM3MzQ0LCJleHAiOjE2MDgyMjM3NDQsImF6cCI6IkR5NVlmRnNKckl1MXJqVFltaFI2WjNPa1hVdEF3THpuIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.CCkRFpNiFWUQNcdaBfinSLGRRgyZU--nId8bvtODnxqjtLMCqHZeJ8wIxH62CDVaecPJ0hPgyuw_tLBmTjm-bceUnZ41LACt9CFCtEwVkM-sc08Nn9KVqOsdAk-xn8cfSpIipzP1hT6v3snrEFln3fvUYl0sUbRAgwDk6obriOMyJpY5q3QL4NhFm3A-lUDBMKYpIiGToau3m1S6hZJTHdC0YrEQeUn3k0v0F1Djg54dBcuvOZPbXSRg4-tjaDsHC7zV6j6aOIdHKY5vPBc4el6vZxvhTfrbr22ZoCR0sGsrgyL5ZIiCowvDhOWrHltZVbYcPhxbgiQg-JiUXpdzSw","expires_in":86400,"token_type":"Bearer"}
```
  - Call add vote api by using the JWT token.

```js
curl --request POST \
  --url https://3pphn2qtm6.execute-api.eu-west-2.amazonaws.com/dev/song/vote \
  --header 'content-type: application/json' \
  --header 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjJpS2FOUmNvRHpOcnBnZzhuS1F2RSJ9.eyJpc3MiOiJodHRwczovL3RoZXNhYXN0ZWNoLmV1LmF1dGgwLmNvbS8iLCJzdWIiOiJEeTVZZkZzSnJJdTFyalRZbWhSNlozT2tYVXRBd0x6bkBjbGllbnRzIiwiYXVkIjoiYXNuZGtzYWhkODJ5aGRqa3NjIiwiaWF0IjoxNjA4MTM3MzQ0LCJleHAiOjE2MDgyMjM3NDQsImF6cCI6IkR5NVlmRnNKckl1MXJqVFltaFI2WjNPa1hVdEF3THpuIiwiZ3R5IjoiY2xpZW50LWNyZWRlbnRpYWxzIn0.CCkRFpNiFWUQNcdaBfinSLGRRgyZU--nId8bvtODnxqjtLMCqHZeJ8wIxH62CDVaecPJ0hPgyuw_tLBmTjm-bceUnZ41LACt9CFCtEwVkM-sc08Nn9KVqOsdAk-xn8cfSpIipzP1hT6v3snrEFln3fvUYl0sUbRAgwDk6obriOMyJpY5q3QL4NhFm3A-lUDBMKYpIiGToau3m1S6hZJTHdC0YrEQeUn3k0v0F1Djg54dBcuvOZPbXSRg4-tjaDsHC7zV6j6aOIdHKY5vPBc4el6vZxvhTfrbr22ZoCR0sGsrgyL5ZIiCowvDhOWrHltZVbYcPhxbgiQg-JiUXpdzSw' \
  --data '{"songName":"Some Song Name"}'

```
Output:
```js
{"votes":{"N":"1"}}
```
if you submit the same request again and again, vote count will increase. but if you use invalid token then you should see authorization error:

```js
{"message":"Unauthorized"}
``` 
- We can also test list song endpoint, however that does not need authorization token as this is set-up as a public endpoint. 

```js
curl --request POST \
 --url https://3pphn2qtm6.execute-api.eu-west-2.amazonaws.com/dev/votes \
--header 'content-type: application/json'
```
Output:
```json
[{"songName":"humdard","votes":17},{"songName":"iktara","votes":25},{"songName":"kaipoche","votes":16},{"songName":"kabirsingh","votes":21},{"songName":"Some Song Name","votes":1}]
```

***that complete our backend service deployment. after this step, you should have 1 dynamodb table "songs", 3 lambda functions "addVote, listVotes and auth" and 2 Rest APIs "GET /votes and POST /song/vote" in your AWS account***


## <a name="website">Deploying Website</a>

In this deployment, we will do the following task:

1. Create the custom VPC
2. That will host 2 public subnets
3. Internet gateway
4. Security groups for HTTP and SSH connections
5. 2 EC2 instances
6. Installing website and running http server 
7. Application load balancer

Let's get started.

- goto **network-app-lb** folder 
- run the following commands to create environment properties.

Set AWS region
```js
pulumi config set aws:region REPLACE_WITH_YOUR_REGION
```
Set Auth0 domain
```js
pulumi config set static-website:auth0Domain REPLACE_WITH_YOUR_Auth0_DOMAIN
```
Set Auth0 client id
```js
pulumi config set static-website:auth0clientId REPLACE_WITH_YOUR_Auth0_CLIENT_ID
```
Set Auth0 audience 
```js
pulumi config set static-website:auth0audience REPLACE_WITH_YOUR_Auth0_AUDIENCE 
```
Set Gateway/Endpoint_ID which was generated by **api-lambda-db** deployment
```js
pulumi config set static-website:auth0audience REPLACE_WITH_YOUR_Auth0_AUDIENCE 
```
All of the Auth0 properties can be obtained from Auth0 account

- run the pulumi deployment
  
```js
pulumi up
```
it will show you the summary of objects, please make sure you see smiler output before continuing with the deployment:

![](docs/Pulumi_network_app_lb.png)

If you are happy with the list of objects showing in the output then select YES. It will take a few minutes as it is going to create new networking resources, EC2 instances and application load-balancer.

Output:

![](docs/Pulumi_network_app_ln_output.png)

Note down the application load balancer alb_id and arn, that will be used in our final deployment.

At this point you can use ALB endpoint value and access via a browser, you should be able to see the website but without login button enable. this is because Auth0 expects to have https origin and alb is currently running on http. Also, we have not configured origin and callback urls in our Auth0 configuration, that we will do in the final step where we will configure the live domain with ssl certificates.

## <a name="hosting">Hosting App</a>

For the final deployment step, goto **dns-ssl-cdn** folder, and run following commands to configure some properties for route53 and cdn service.

**Pre-requisite for this deployment **- You have to have a domain that either registered via AWS or if outside AWS then it should be configured with AWS name server addresses.   


Set AWS region
```js
pulumi config set aws:region REPLACE_WITH_YOUR_REGION
```
Set domain name property:
```js
pulumi config set website-hosting:targetDomain REPLACE_WITH_YOUR_DOMAIN
```
Set application load balancer arn property:
```js
pulumi config set website-hosting:websiteArn REPLACE_WITH_LOADBALANCER_ARN
```
Set application load balancer endpoint property:
```js
pulumi config set website-hosting:websiteEndpoint REPLACE_WITH_LOADBALANCER_ENDPOINT
```

All of these properties will be configured in ***Pulumi-dev.yaml***.

We are ready to run our final deployment script.

```js
pulumi up
```
Review the output and if all loos fine then select **YES**

![](docs/Route53_review.png)

You should have the ssl certificates created, route53 dns records add and cdn distribution configured. 

![](docs/Route53_completed.png)

This is the end of this deployment but before you access your website, you have to do one last thing. 

Add your domain in Auth0 application, if you are testing your app locally then i would also add localhost:<app port> in Auth0. 

![](docs/Auth0-URL.png)

Now you should be able to access your website and login, add a vote to the song and see the vote count updated.

## :bangbang:**Clean up**:bangbang:

for clean up your deployment:

- goto dns-ssl-cds folder and run `pulumi destroy`
- goto network-aap-lb folder and run `pulumi destroy`
- goto api-lambda-db folder and run `serverless remove`


Thank You:grey_exclamation:
Enjoy