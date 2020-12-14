"use strict";

import { SpotDatafeedSubscription } from "@pulumi/aws/ec2";

const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");


const stackConfig = new pulumi.Config("static-website");
const config = {
    auth0Domain: stackConfig.require("auth0Domain"),
    auth0clientId: stackConfig.require("auth0clientId"),
    auth0audience: stackConfig.get("auth0audience"),
};


// Allocate a new VPC with a smaller CIDR range:
const vpc = new awsx.ec2.Vpc("custom", {
    cidrBlock: "10.0.0.0/24",
    numberOfAvailabilityZones: 2,
    subnets: [{ type: "public" }]
});

exports.vpcId = vpc.id;
exports.vpcPublicSubnetIds = vpc.publicSubnetIds;

// Allocate a security group and then a series of rules:
const sg = new awsx.ec2.SecurityGroup("web-access-sg", { vpc });

sg.createIngressRule("https-access", {
    location: new awsx.ec2.AnyIPv4Location(),
    ports: new awsx.ec2.TcpPorts(80),
    description: "allow HTTP access from anywhere",
});

sg.createIngressRule("ssh-access", {
    location: new awsx.ec2.AnyIPv4Location(),
    ports: new awsx.ec2.TcpPorts(22),
    description: "allow SSH access from anywhere",
});

sg.createEgressRule("outbound-access", {
    location: new awsx.ec2.AnyIPv4Location(),
    ports: new awsx.ec2.AllTcpPorts(),
    description: "allow outbound access to anywhere",
});

exports.securityGroup = sg.id;

// Create EC2 instance
const size = "t2.micro";     // t2.micro is available in the AWS free tier
const ami = "ami-08b993f76f42c3e2f"

/* pulumi.output(aws.getAmi({
    filters: [{
        name: "name",
        values: ["amzn-ami-hvm-*"],
    }],
    owners: ["137112412989"], // This owner ID is Amazon
    mostRecent: true,
}));
 */
let appStartupData = // <-- ADD THIS DEFINITION
    `#!/bin/bash
    cd /home/ec2-user
    sudo su
    yum install git -y
    git clone https://github.com/amitmahajan78/votethesong-app.git
    cd votethesong-app
    sed -i 's/REPLACE_DOMAIN/`+ config.auth0Domain + `/g' auth_config.json
    sed -i 's/REPLACE_CLIENT_ID/`+ config.auth0clientId + `/g' auth_config.json
    sed -i 's/REPLACE_AUDIENCE/`+ config.auth0audience + `/g' auth_config.json
    nohup python -m SimpleHTTPServer 80 &`;

exports.appStartupData = appStartupData;

const ec2_1 = new aws.ec2.Instance("webserver-www-1", {
    instanceType: size,
    vpcSecurityGroupIds: [pulumi.output(sg.id)], // reference the security group resource above
    ami: ami,
    subnetId: pulumi.output(vpc.publicSubnetIds)[0],
    userData: appStartupData,
});

const ec2_2 = new aws.ec2.Instance("webserver-www-2", {
    instanceType: size,
    vpcSecurityGroupIds: [pulumi.output(sg.id)], // reference the security group resource above
    ami: ami,
    subnetId: pulumi.output(vpc.publicSubnetIds)[1],
    userData: appStartupData,
});


//Load balancer setup

// Create a security group to open ingress to our load balancer on port 80, and egress out of the VPC.
const sgLB = new awsx.ec2.SecurityGroup("web-lb-sg", {
    vpc,
    // 1) Open ingress traffic to your load balancer. Explicitly needed for NLB, but not ALB:
    // ingress: [{ protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: [ "0.0.0.0/0" ] }],
    // 2) Open egress traffic from your EC2 instance to your load balancer (for health checks).
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
});


// Creates an ALB associated with the default VPC for this region and listen on port 80.
// 3) Be sure to pass in our explicit SecurityGroup created above so that traffic may flow.
const alb = new awsx.lb.ApplicationLoadBalancer("web-traffic", { vpc: vpc, securityGroups: [sgLB] });
const listener = alb.createListener("web-listener", { port: 80 });

alb.attachTarget("target-1", ec2_1);
alb.attachTarget("target-2", ec2_2);


exports.associatePublicIpAddress = ec2_1.associatePublicIpAddress;
exports.associatePublicIpAddress = ec2_2.associatePublicIpAddress;
exports.endpoint = listener.endpoint.hostname;
exports.arn = listener.arn;