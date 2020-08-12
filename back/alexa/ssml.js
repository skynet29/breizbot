module.exports = {
    sayAs: function(interpret, word) {
        return `<say-as interpret-as="${interpret}">${word}</say-as>`
    },
    pause: function(duration) {
        return `<break time="${duration}" />`
    },
    say: function(voice, lang, text) {
        return `<voice name="${voice}"><lang xml:lang="${lang}">${text}</lang></voice>`
    },
    english: function(text) {
        return this.say('Joanna', 'en-US', text)
    },
    toSpeak: function(text) {
        return `<speak>${text}</speak>`
    },
    sentence: function(text) {
        return `<s>${text}</s>`
    },
    emphasis: function(text) {
        return `<emphasis level="strong">${text}</emphasis> `        
    },
    // emotion(text, name, intensity = 'medium') {
    //     return ` <amazon:emotion name="${name}" intensity="${intensity}">${text}</amazon:emotion>`
    // },
    whispered: function(text) {
        return `<amazon:effect name="whispered">${text}</amazon:effect>`
    }
    
   
    
}