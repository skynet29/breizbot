module.exports = {
    sayAs: function(interpret, word) {
        return `<say-as interpret-as="${interpret}">${word}</say-as>`
    },
    pause: function(duration) {
        return `<break time="${duration}" />`
    },
    say: function(lang, text) {
        return `<lang xml:lang="${lang}">${text}</lang>`
    },
    english: function(text) {
        return this.say('en-US', text)
    },
    toSpeak: function(text) {
        return `<speak>${text}</speak>`
    }
}