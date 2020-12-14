"use strict";
exports.__esModule = true;
var AWS = require("aws-sdk"); // eslint-disable-line import/no-extraneous-dependencies
var dynamoDb = new AWS.DynamoDB();
module.exports.update = function (event, context, callback) {
  var data = JSON.parse(event.body);

  // validation
  if (typeof data.songName !== "string") {
    console.error("Validation Failed");
    callback(null, {
      statusCode: 400,
      headers: { "Content-Type": "text/plain" },
      body: "Couldn't update the song vote.",
    });
    return;
  }
  var params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      songName: { S: data.songName },
    },
    UpdateExpression: "ADD votes :inc",
    ExpressionAttributeValues: {
      ":inc": { N: "1" },
    },
    ReturnValues: "UPDATED_NEW",
  };
  // update the song vote in the database
  dynamoDb.updateItem(params, function (error, result) {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { "Content-Type": "application/json" },
        body: "Couldn't fetch the song item.",
      });
      return;
    }
    // create a response
    var response = {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(result.Attributes),
    };
    callback(null, response);
  });
};
