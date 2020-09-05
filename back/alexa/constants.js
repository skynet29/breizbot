const ssml = require('./ssml.js')

const NETOS = 'Net' + ssml.sayAs('characters', 'OS')

module.exports = {
    USER_NOT_REGISTERED: 'User not registered',
    SKILL_NOT_LINKED: 'Skill not linked',
    NETOS
}