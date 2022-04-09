const fs = require('fs')

const insts = {
    TC: { opcode: 0, info: ['Q <- Z | Z <- k'] },
    CSS: {
        opcode: 1, qcode: 0,
        info: [
            'A <- DBAS(M[k])',
            'if M[k] >+0: Z <- Z',
            'if M[k] =+0: Z <- Z+1',
            'if M[k] <-0: Z <- Z+2',
            'if M[k] =-0: Z <- Z+3'
        ]
    },
    TCF: { opcode: 1, info: 'Z <- k' },

    DAS: { opcode: 2, qcode: 0 },
    LXCH: { opcode: 2, qcode: 1 },
    INCR: { opcode: 2, qcode: 2, info: 'M[k] <- M[k] + 1' },
    ADS: { opcode: 2, qcode: 3 },

    CA: { opcode: 3, info: 'A <- M[k]' },
    CS: { opcode: 4, info: 'A <- -M[k]' },

    INDEX: { opcode: 5, qcode: 0 },
    DXCH: { opcode: 5, qcode: 1, info: ['A <-> M[k]', 'L <-> M[k+1]'] },
    TS: { opcode: 5, qcode: 2, info: 'M[k] <- A' },
    XCH: { opcode: 5, qcode: 3, info: 'A <-> M[k]' },

    AD: { opcode: 6, info: 'A <- A + M[k]' },
    MASK: { opcode: 7 },

    READ: { opcode: 0o10, iocode: 0, info: 'A <- IO[kc]' },
    WRITE: { opcode: 0o10, iocode: 1, info: 'IO[kc] <- A' },
    RAND: { opcode: 0o10, iocode: 2, info: 'A <- A & IO[kc]' },
    WAND: { opcode: 0o10, iocode: 3, info: 'IO[kc] <- A & IO[kc]' },
    ROR: { opcode: 0o10, iocode: 4, info: 'A <- A | IO[kc]' },
    WOR: { opcode: 0o10, iocode: 5, info: 'IO[kc] <- A | IO[kc]' },
    RXOR: { opcode: 0o10, iocode: 6, info: 'A <- A ^ IO[kc]' },
    EDRUPT: { opcode: 0o10, iocode: 7, info: 'A <- A ^ IO[kc]' },

    DV: {
        opcode: 0o11, qcode: 0, info: [
            'A <- A,B / M[k]',
            'B <- A,B % M[k]'
        ]
    },
    BZF: { opcode: 0o11, info: 'if A = +/-0: Z <- k' },

    MSU: { opcode: 0o12, qcode: 0 },
    QXCH: { opcode: 0o12, qcode: 1 },
    AUG: {
        opcode: 0o12, qcode: 2, info: [
            'if M[k] >= +0: M[k] <- M[k] + 1',
            'if M[k] <= -0: M[k] <- M[k] - 1'
        ]
    },
    DIM: {
        opcode: 0o12, qcode: 3, info: [
            'if M[k] > +0: M[k] <- M[k] - 1',
            'if M[k] < -0: M[k] <- M[k] + 1'
        ]
    },

    DCA: { opcode: 0o13, info: 'A,L <- M[k, k+1]' },
    DCS: { opcode: 0o14, info: 'A,L <- -M[k, k+1]' },
    NDX: { opcode: 0o15 },

    BZMF: { opcode: 0o16, info: 'if A <= +/-0: Z <- k' },
    SU: { opcode: 0o16, qcode: 0, info: 'A <- A - M[k]' },

    MP: { opcode: 0o17, info: 'A,L <- A x M[k]' },
}

const registers = {
    0: 'A',
    1: 'L',
    2: 'Q',
    3: 'EBANK',
    4: 'FBANK',
    5: 'Z',
    6: 'BBANK',
    7: 'ZERO',
    8: 'ARUPT',
    9: 'LRUPT',
    10: 'QRUPT',
    11: 'SAMPTIME',
    13: 'ZRUPT',
    14: 'BBRUPT',
    17: 'BRUPT'
}

const alias = {
    //2: 'RETURN',
    4: 'INHINT',
    3: 'RELINT',
    0x17: 'RESUME',
}
const arg2 = process.argv[2]

if (arg2 == '-i') {
    const arg = process.argv[3]
    if (arg == undefined) {
        for (const i of Object.keys(insts).sort()) {
            console.log(i)
        }
        process.exit(0)
    }
    if (insts[arg] == undefined) {
        console.log('Unknown instruction')
        process.exit(0)
    }
    let list = insts[arg].info
    if (list == undefined) {
        console.log('No info available !')
    }
    else {
        if (typeof list == 'string') {
            list = [list]
        }
        for (const i of list) {
            console.log(i)
        }

    }
    process.exit(0)
}
else if (arg2 == '-f') {
    const fileName = process.argv[3]
    const fd = fs.openSync(fileName, 'r')
    let length = 10
    let offset = 0
    if (process.argv[4] == '-n' && process.argv[5] != undefined) {
        length = parseInt(process.argv[5])
    }
    if (process.argv[4] == '-s' && process.argv[5] != undefined) {
        offset = parseInt(process.argv[5])
    }
    console.log({ length, offset })
    const buffer = Buffer.alloc(length)
    const nbByteRead = fs.readSync(fd, buffer, 0, length, offset)
    console.log({ nbByteRead })
    const uint8buff = new Uint8Array(buffer)
    const view = new DataView(uint8buff.buffer)
    const pgm = []
    for (let i = 0; i < length; i += 2) {
        pgm.push(view.getUint16(i, false) >> 1) // drop parity bit
    }
    decode(pgm, 0o4000 + offset)

    process.exit(0)
}

const inputLine = process.argv[2]
const pgm = inputLine.split(',').map((v) => parseInt(v, 8))
console.log(pgm)
decode(pgm)

function format(a, addr) {
    let ret = ''
    if (addr != undefined) {
        ret += addr.toString(8).padStart(4, '0')
    }
    return ret + '   ' + a.toString(8).padStart(5, '0')
}


function decode(pgm, startAddr) {

    let extend = false
    for (const inst of pgm) {
        if (inst == 6) {
            extend = true
            console.log(format(inst, startAddr), 'EXTEND')
            startAddr++
            continue
        }

        if (alias[inst]) {
            console.log(format(inst, startAddr), alias[inst])
            startAddr++
            continue
        }

        const opcode = (inst >> 12) & 0b111
        const qcode = (inst >> 10) & 0b11
        const iocode = (inst >> 9) & 0b111
        let excode = opcode

        if (extend) {
            excode |= 0o10
            extend = false
        }

        //console.log({opcode, qcode, extend})
        for (const [key, data] of Object.entries(insts)) {
            if (data.qcode != undefined) {
                if (data.qcode != qcode)
                    continue
            }
            if (data.iocode != undefined) {
                if (data.iocode != iocode)
                    continue
            }

            if (excode == data.opcode) {
                let addr = inst - (opcode << 12)
                if (data.qcode != undefined) {
                    addr -= (qcode << 10)
                }
                if (data.iocode != undefined) {
                    addr -= (iocode << 9)
                }

                if (key == 'DXCH') {
                    addr--;
                }

                const reg = registers[addr]
                addr = (reg != undefined) ? reg : addr.toString(8)
                console.log(format(inst, startAddr), key.padEnd(6, ' '), addr)
            }
        }

        startAddr++;
    }
}
