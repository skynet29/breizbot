//@ts-check

/**
  * 
  * @param {number} val 
  * @returns {Array}
  */
function toInt16(val) {
    const buff = new Uint8Array(2)
    const view = new DataView(buff.buffer)
    view.setInt16(0, val, true)
    return Array.from(buff)
}

/**
 * 
 * @param {number} val 
 * @returns {Array}
 */
function toInt32(val) {
    const buff = new Uint8Array(4)
    const view = new DataView(buff.buffer)
    view.setInt32(0, val, true)
    return Array.from(buff)
}

function toUint32(val) {
    const buff = new Uint8Array(4)
    const view = new DataView(buff.buffer)
    view.setUint32(0, val, true)
    return Array.from(buff)
}

const debug = false

const log = function (...data) {
    if (debug) {
        console.log.apply(console, data)
    }
}

module.exports = {
    toInt16,
    toInt32,
    toUint32,
    log
}