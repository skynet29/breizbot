//@ts-check


const SavePersistentAttributesResponseInterceptor = {
    async process(handlerInput) {
        //console.log('SAVE ATTRIBUTES')
        await handlerInput.attributesManager.savePersistentAttributes()
    }
}

module.exports = [
    SavePersistentAttributesResponseInterceptor
]