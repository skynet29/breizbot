


//GET ALL VALUES FROM TABLE


const params = {

    TableName: 'music',
    Select: 'ALL_ATTRIBUTES',
    ConsistentRead: false,
    ReturnConsumedCapacity: 'NONE'

}



AWS.config.update({

    region: "local",
    endpoint: "http://localhost:8000",
    accessKeyId: "fake",
    secretAccessKey: "fake"
})


const dynamodb = new AWS.DynamoDB()



dynamodb.scan(params, function (err, data) {

    if (err) ppJson(err)

    else ppJson(data)

})