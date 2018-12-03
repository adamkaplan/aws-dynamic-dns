'use strict';

//const util = require('util');
const AWS = require('aws-sdk');
const route53 = new AWS.Route53({apiVersion: '2013-04-01'});

const ROUTE53_HOSTED_ZONE_NAME = process.env.ROUTE53_HOSTED_ZONE_NAME;
const ROUTE53_HOSTED_ZONE_ID = process.env.ROUTE53_HOSTED_ZONE_ID;
const ROUTE53_TTL = process.env.ROUTE53_TTL;

exports.handler = async (event) => {
  const zoneName = event.pathParameters.location;
  const srcIp = event.requestContext.identity.sourceIp;
  const zone = `${zoneName}${ROUTE53_HOSTED_ZONE_NAME}`;
  console.log(`Will set '${zone}' to ${srcIp}`);

  const record = await findCurrentRecordValue(zone);
  if (record.ResourceRecords[0].Value == srcIp) {
    console.log("No change required.");
    return { statusCode: 200 };
  }

  await updateRecord(zone, srcIp);
  console.log("Record updated.");
  return { statusCode: 200 };
};

async function findCurrentRecordValue(zone) {
  const params = {
    HostedZoneId: ROUTE53_HOSTED_ZONE_ID,
    MaxItems: '10',
    StartRecordName: zone,
    StartRecordType: "A"
  };

  const records = await route53.listResourceRecordSets(params).promise();
  const zoneInfo = records.ResourceRecordSets[0];
  if (zoneInfo.Name == zone) {
    return zoneInfo;
  }
}

async function updateRecord(zone, srcIp) {
  const params = {
    ChangeBatch: {
      Changes: [{
        Action: "UPSERT",
        ResourceRecordSet: {
          Name: zone,
          ResourceRecords: [{
            Value: srcIp
          }],
          TTL: ROUTE53_TTL,
          Type: "A"
        }
      }],
      Comment: `Dyanmic host record for ${zone}`
    },
    HostedZoneId: ROUTE53_HOSTED_ZONE_ID
  };

  return route53.changeResourceRecordSets(params).promise();
}

