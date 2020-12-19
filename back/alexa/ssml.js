//@ts-check

const xmlescape = require('xml-escape')

function sayAs(interpret, word) {
    return `<say-as interpret-as="${interpret}">${word}</say-as>`
}

function pause(duration) {
    return `<break time="${duration}" />`
}

function lang(langName, text) {
    return `<lang xml:lang="${langName}">${text}</lang>`
}

function say(voice, langName, text) {
    return voice(voice, lang(langName, text))
}

function voice(voiceName, text) {
    return `<voice name="${voiceName}">${text}</voice>`
}

function english(text) {
    return say('Joanna', 'en-US', text)
}

function toSpeak(text) {
    return `<speak>${text}</speak>`
}

function sentence(text) {
    return `<s>${text}</s>`
}

function emphasis(text) {
    return `<emphasis level="strong">${text}</emphasis> `        
}

function whispered(text) {
    return `<amazon:effect name="whispered">${text}</amazon:effect>`
}

class SsmlBuilder {
    constructor() {
        this.elements = []
    }

    NetOS() {
        this.say('Net')
        this.sayAs('characters', 'OS')
    }

    sayAs(interpret, word) {
        this.elements.push(sayAs(interpret, word))
    }
    pause(duration) {
        this.elements.push(pause(duration))
    }
    voice(voiceName, text) {
        this.elements.push(voice(voiceName, xmlescape(text)))
    }
    say(text) {
        this.elements.push(xmlescape(text))
    }
    english(text) {
        this.elements.push(english(xmlescape(text)))
    }
    build() {
        return toSpeak(this.elements.join(' '))
    }
    sentence(text) {
        this.elements.push(sentence(xmlescape(text)))
    }
    emphasis(text) {
        this.elements.push(emphasis(xmlescape(text)))
    }
    whispered(text) {
        this.elements.push(whispered(xmlescape(text)))
    }

}

module.exports = {
    create: function() {
        return new SsmlBuilder()
    }
}