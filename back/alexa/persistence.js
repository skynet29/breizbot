//@ts-check

const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter')
const AWS = require('aws-sdk')
const Alexa = require('ask-sdk-core')


function getLocalDynamoDBClient() {
    AWS.config.update({
        region: 'local',
        endpoint: 'http://localhost:8000',
        accessKeyId: 'fake',
        secretAccessKey: 'fake',
    })
    return new AWS.DynamoDB()
}

function getPersistenceAdapter() {
    const options = {
        tableName: 'music',
        createTable: true,
        dynamoDBClient: getLocalDynamoDBClient(),
        partitionKeyGenerator: (requestEnvelope) => {
            const userId = Alexa.getUserId(requestEnvelope)
            return userId.substr(userId.lastIndexOf(".") + 1)
        }
    }
    return new DynamoDbPersistenceAdapter(options)
}


module.exports = {
    getPersistenceAdapter
}