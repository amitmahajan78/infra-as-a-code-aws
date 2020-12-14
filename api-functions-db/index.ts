import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { join } from 'path';
import { readFileSync } from 'fs';

// config values
const stackConfig = new pulumi.Config("authorizer");
const config = {
    auth0clientId: stackConfig.require("auth0clientId"),
    auth0publicKey: stackConfig.get("auth0publicKey"),
};


const namePrefix = `${pulumi.getStack()}-${pulumi.getProject()}`
function preName(name?: string) {
    return name ? `${namePrefix}-${name}` : namePrefix
}

function relativeRootPath(path: string) {
    return join(process.cwd(), '..', path)
}

/**
 * Globals
 */
const account = pulumi.output(aws.getCallerIdentity({ async: true })).accountId
const executionRoleName = preName('executionRole')
const songsDynamoDbTableName = "songs"
const listVoteFunctionName = preName('Songs-listVotes')
const addVoteFunctionName = preName('Songs-addVote')
const authorizationFunctionName = preName('Auth-function')


const dynamoDbTable = new aws.dynamodb.Table(songsDynamoDbTableName, {
    name: songsDynamoDbTableName,
    attributes: [{
        name: "songName",
        type: "S",
    }],
    hashKey: "songName",
    readCapacity: 1,
    writeCapacity: 1,
});

/**
 * IAM Role
 */
const executionRole = new aws.iam.Role(executionRoleName, {
    name: executionRoleName,
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: 'lambda.amazonaws.com' }),
    tags: {
        Environment: pulumi.getStack()
    }
})
const executionRolePolicyName = `${executionRoleName}-policy`
const rolePolicy = new aws.iam.RolePolicy(executionRolePolicyName, {
    name: executionRolePolicyName,
    role: executionRole,
    policy: {
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                Resource: account.apply(
                    (accountId) =>
                        `arn:aws:logs:${aws.config.region}:${accountId}:log-group:/aws/lambda/${namePrefix}*`
                )
            },
            {
                Effect: 'Allow',
                Action: [
                    'dynamodb:Query',
                    'dynamodb:Scan',
                    'dynamodb:GetItem',
                    'dynamodb:PutItem',
                    'dynamodb:UpdateItem',
                    'dynamodb:DeleteItem'
                ],
                Resource: account.apply(
                    (accountId) => `arn:aws:dynamodb:${aws.config.region}:${accountId}:table/${songsDynamoDbTableName}`
                )
            }
        ]
    }
})

/**
 * Code Archive & Lambda layer
 */
const code = new pulumi.asset.AssetArchive({
    '.': new pulumi.asset.FileArchive(relativeRootPath('api-functions-db/archive.zip'))
})

const publicKey = readFileSync('./functions/public_key', 'utf-8');


const zipFile = relativeRootPath('api-functions-db/layers/archive.zip')
const nodeModuleLambdaLayerName = preName('lambda-layer-nodemodules')
const nodeModuleLambdaLayer = new aws.lambda.LayerVersion(nodeModuleLambdaLayerName, {
    compatibleRuntimes: [aws.lambda.NodeJS12dXRuntime],
    code: new pulumi.asset.FileArchive(zipFile),
    layerName: nodeModuleLambdaLayerName
})

/**
 * Lambda Function - List Votes
 */
const listVotesFunction = new aws.lambda.Function(listVoteFunctionName, {
    name: listVoteFunctionName,
    runtime: aws.lambda.NodeJS12dXRuntime,
    handler: 'functions/listVotes.list',
    role: executionRole.arn,
    code,
    layers: [nodeModuleLambdaLayer.arn],
    memorySize: 128,
    environment: {
        variables: {
            DYNAMODB_TABLE: songsDynamoDbTableName
        }
    },
    tags: {
        Environment: pulumi.getStack()
    },
}, { dependsOn: [nodeModuleLambdaLayer, rolePolicy] })


/**
 * Lambda Function - Record Votes
 */
const recordVotesFunction = new aws.lambda.Function(addVoteFunctionName, {
    name: addVoteFunctionName,
    runtime: aws.lambda.NodeJS12dXRuntime,
    handler: 'functions/addVote.update',
    role: executionRole.arn,
    code,
    layers: [nodeModuleLambdaLayer.arn],
    memorySize: 128,
    environment: {
        variables: {
            DYNAMODB_TABLE: songsDynamoDbTableName
        }
    },
    tags: {
        Environment: pulumi.getStack()
    },
}, { dependsOn: [nodeModuleLambdaLayer, rolePolicy] })


let authClientId: pulumi.Input<string> = stackConfig.get("auth0clientId")!;
let authPublicKey: pulumi.Input<string> = stackConfig.get("auth0publicKey")!;
/**
 * Lambda Function - Authorization - Auth0
 */
const authFunction = new aws.lambda.Function(authorizationFunctionName, {
    name: authorizationFunctionName,
    runtime: aws.lambda.NodeJS12dXRuntime,
    handler: 'functions/auth.auth',
    role: executionRole.arn,
    code,
    layers: [nodeModuleLambdaLayer.arn],
    memorySize: 128,
    environment: {
        variables: {
            AUTH0_CLIENT_ID: authClientId,
            AUTH0_CLIENT_PUBLIC_KEY: publicKey,
        }
    },
    tags: {
        Environment: pulumi.getStack()
    },
}, { dependsOn: [nodeModuleLambdaLayer, rolePolicy] })

/**
 * API Gateway
 */
const songsApiRest = new aws.apigateway.RestApi(preName('rest'), {
    name: preName('rest')
})



// list vote api
const songsListApiResource = new aws.apigateway.Resource(preName('listresource'), {
    restApi: songsApiRest.id,
    parentId: songsApiRest.rootResourceId,
    pathPart: 'song'
})
const songsListApiMethod = new aws.apigateway.Method(preName('listmethod'), {
    restApi: songsApiRest.id,
    resourceId: songsListApiResource.id,
    authorization: 'NONE',
    httpMethod: 'GET'
})
const songsListApiIntegration = new aws.apigateway.Integration(preName('listintegration-get'), {
    restApi: songsApiRest.id,
    resourceId: songsListApiResource.id,
    httpMethod: songsListApiMethod.httpMethod,
    integrationHttpMethod: 'POST',
    type: 'AWS_PROXY',
    uri: listVotesFunction.invokeArn
})

// add vote api
const songsAddApiResource = new aws.apigateway.Resource(preName('voteresource'), {
    restApi: songsApiRest.id,
    parentId: songsApiRest.rootResourceId,
    pathPart: 'vote'
})

const authApi = new aws.apigateway.Authorizer(preName('authorizer'), {
    restApi: songsApiRest.id,
    authorizerUri: authFunction.invokeArn
})

const songsAddApiMethod = new aws.apigateway.Method(preName('votemethod'), {
    restApi: songsApiRest.id,
    resourceId: songsAddApiResource.id,
    authorization: 'CUSTOM',
    authorizerId: authApi.id,
    httpMethod: 'POST'
})
const songsAddApiIntegration = new aws.apigateway.Integration(preName('voteintegration-post'), {
    restApi: songsApiRest.id,
    resourceId: songsAddApiResource.id,
    httpMethod: songsAddApiMethod.httpMethod,
    integrationHttpMethod: 'POST',
    type: 'AWS_PROXY',
    uri: recordVotesFunction.invokeArn
})



// common api deployment
const songsApiDeployment = new aws.apigateway.Deployment(
    preName('deployment'),
    {
        stageName: pulumi.getStack(),
        restApi: songsApiRest.id
    },
    {
        dependsOn: [songsListApiIntegration, songsAddApiIntegration]
    }
)


// permission for api gateway to invoke lambda function listVotesFunction
const listVoteApiLambdaPermission = new aws.lambda.Permission(`${listVoteFunctionName}-permission`, {
    statementId: 'AllowAPIGatewayInvoke',
    principal: 'apigateway.amazonaws.com',
    action: 'lambda:InvokeFunction',
    function: listVotesFunction,
    sourceArn: pulumi.output(songsApiRest.executionArn).apply((executionArn) => `${executionArn}/*/*`)
})

// permission for api gateway to invoke lambda function recordVotesFunction
const recordVoteApiLambdaPermission = new aws.lambda.Permission(`${addVoteFunctionName}-permission`, {
    statementId: 'AllowAPIGatewayInvoke',
    principal: 'apigateway.amazonaws.com',
    action: 'lambda:InvokeFunction',
    function: recordVotesFunction,
    sourceArn: pulumi.output(songsApiRest.executionArn).apply((executionArn) => `${executionArn}/*/*`)
})

// permission for api gateway to invoke lambda function auth 
const authApiLambdaPermission = new aws.lambda.Permission(`${authorizationFunctionName}-permission`, {
    statementId: 'AllowAPIGatewayInvoke',
    principal: 'apigateway.amazonaws.com',
    action: 'lambda:InvokeFunction',
    function: authFunction,
    sourceArn: pulumi.output(songsApiRest.executionArn).apply((executionArn) => `${executionArn}/*/*`)
})

export const listVotesApiUrl = songsApiDeployment.invokeUrl