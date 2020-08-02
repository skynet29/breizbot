const dynamodbLocal = require("dynamodb-localhost")

dynamodbLocal.install(() => {
    console.log('install finished !!!')
})