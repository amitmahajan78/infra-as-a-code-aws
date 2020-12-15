"use strict";
exports.__esModule = true;
var aws_sdk_1 = require("aws-sdk");
var dynamoDb = new aws_sdk_1.DynamoDB.DocumentClient();
var params = {
  TableName: process.env.DYNAMODB_TABLE,
};
module.exports.list = function (event, context, callback) {
  // fetch all todos from the database
  // For production workloads you should design your tables and indexes so that your applications can use Query instead of Scan.
  dynamoDb.scan(params, function (error, result) {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { "Content-Type": "application/json" },
        body: "Couldn't fetch the song items.",
      });
      return;
    }
    // create a response
    var response = {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result.Items),
    };
    callback(null, response);
  });
};
