const fs = require('fs')
const { off } = require('process')

const insts = {
    TC: { opcode: 0, info: ['Q <- Z | Z <- k'], label: 'Transfer Control' },
    CSS: {
        opcode: 1, qcode: 0,
        info: [
            'A <- DBAS(M[k])',
            'if M[k] >+0: Z <- Z',
            'if M[k] =+0: Z <- Z+1',
            'if M[k] <-0: Z <- Z+2',
            'if M[k] =-0: Z <- Z+3'
        ],
        label: 'Count, Compare and Skip'
    },
    TCF: { opcode: 1, info: 'Z <- k', label: 'Transfer Control to Fixed' },

    DAS: { opcode: 2, qcode: 0, info: 'M[k, k+] <- A,L + M[k, k+1]', label: 'Double Add to Storage' },
    LXCH: { opcode: 2, qcode: 1, label: 'Exchange L and K' },
    INCR: { opcode: 2, qcode: 2, info: 'M[k] <- M[k] + 1', label: 'Increment' },
    ADS: { opcode: 2, qcode: 3, info: ['A <- A + M[k]', 'M[k] <- A'], label: 'Add To Storage' },

    CA: { opcode: 3, info: 'A <- M[k]', label: 'Clear and Add' },
    CS: { opcode: 4, info: 'A <- -M[k]', label: 'Clear and Subtract' },

    INDEX: { opcode: 5, qcode: 0 },
    DXCH: { opcode: 5, qcode: 1, info: ['A <-> M[k]', 'L <-> M[k+1]'], label: 'Double Exchange' },
    TS: { opcode: 5, qcode: 2, info: 'M[k] <- A' },
    XCH: { opcode: 5, qcode: 3, info: 'A <-> M[k]', label: 'Exchange A and K' },

    AD: { opcode: 6, info: 'A <- A + M[k]', label: 'Add' },
    MASK: { opcode: 7, label: 'Mask A by K' },

    READ: { opcode: 0o10, iocode: 0, info: 'A <- IO[kc]', label: 'Read Channel KC' },
    WRITE: { opcode: 0o10, iocode: 1, info: 'IO[kc] <- A', label: 'Write Channel KC' },
    RAND: { opcode: 0o10, iocode: 2, info: 'A <- A & IO[kc]' },
    WAND: { opcode: 0o10, iocode: 3, info: 'IO[kc] <- A & IO[kc]', label: 'Write and Mask' },
    ROR: { opcode: 0o10, iocode: 4, info: 'A <- A | IO[kc]' },
    WOR: { opcode: 0o10, iocode: 5, info: 'IO[kc] <- A | IO[kc]', label: 'Write and Superimpose' },
    RXOR: { opcode: 0o10, iocode: 6, info: 'A <- A ^ IO[kc]' },
    EDRUPT: { opcode: 0o10, iocode: 7, info: 'For machine checkout only' },

    DV: {
        opcode: 0o11, qcode: 0, info: [
            'A <- A,B / M[k]',
            'B <- A,B % M[k]'
        ],
        label: 'Divide'
    },
    BZF: { opcode: 0o11, info: 'if A = +/-0: Z <- k', label: 'Branch Zero to Fixed' },

    MSU: { opcode: 0o12, qcode: 0, label: 'Modular Subtract' },
    QXCH: { opcode: 0o12, qcode: 1, label: 'Exchange Q and K' },
    AUG: {
        opcode: 0o12, qcode: 2, info: [
            'if M[k] >= +0: M[k] <- M[k] + 1',
            'if M[k] <= -0: M[k] <- M[k] - 1'
        ],
        label: 'Augment'
    },
    DIM: {
        opcode: 0o12, qcode: 3, info: [
            'if M[k] > +0: M[k] <- M[k] - 1',
            'if M[k] < -0: M[k] <- M[k] + 1'
        ],
        label: 'Diminish'
    },

    DCA: { opcode: 0o13, info: 'A,L <- M[k, k+1]', label: 'Double Clear and Add' },
    DCS: { opcode: 0o14, info: ['A <- -M[k]', 'L <- -M[k+1]'], label: 'Double Clear abd Subtract' },
    NDX: { opcode: 0o15 },

    BZMF: { opcode: 0o16, info: 'if A <= +/-0: Z <- k', label: 'Branch ZEro or Minus to Fixed' },
    SU: { opcode: 0o16, qcode: 0, info: 'A <- A - M[k]', label: 'Subtract' },

    MP: { opcode: 0o17, info: 'A,L <- A x M[k]', label: 'Multiply' },
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
    0o00002: { name: 'RETURN', label: 'Return from Subroutine' },
    0o50017: { name: 'RESUME', label: 'Resume Interrupted Program' },
    0o00003: { name: 'RELINT', label: 'Enable Interrupts' },
    0o00004: { name: 'INHINT', label: 'Disable Interrupts' },
    0o20001: { name: 'DDOUBL', label: 'Double Precision Double' },
    0o40001: { name: 'DCOM', label: 'Double Complement' },
    0o40000: { name: 'COM', label: 'Complement the Contents of A' },
    0o60000: { name: 'DOUBLE', label: 'Double the Contents of A' },
    0o52006: { name: 'DTCB', label: 'Double Transfer Control, Switching Both Banks' },
    0o52005: { name: 'DTCF', label: 'Double Transfer Control, Switching F Bank' },
    0o54000: { name: 'OVSK', label: 'Overflow Skip' },
    0o70000: { name: 'SQUARE', label: 'Square the Contents of A' },
    0o54005: { name: 'TCAA', label: 'Transfer Control to Address in A' },
    0o00001: { name: 'XLQ', label: 'Execute Using L and Q' }
}
const alias2 = {}
for (const [key, { name, label }] of Object.entries(alias)) {
    alias2[name] = { code: parseInt(key), label }
}

const arg2 = process.argv[2]

if (arg2 == '-i') {
    const arg = process.argv[3]
    showInfo(arg)

}
else if (arg2 == '-f') {
    const fileName = process.argv[3]
    let length = 10
    let offset = 0
    if (process.argv[4] == '-n' && process.argv[5] != undefined) {
        length = parseInt(process.argv[5])
    }
    if (process.argv[4] == '-s' && process.argv[5] != undefined) {
        offset = parseInt(process.argv[5])
    }

    console.log({ length, offset })
    decodeFile(fileName, offset, length)
}
else {
    const inputLine = process.argv[2]
    const pgm = inputLine.split(',').map((v) => parseInt(v, 8))
    //console.log(pgm)
    decode(pgm)    
}


function format(a, addr) {
    let ret = ''
    if (addr != undefined) {
        ret += addr.toString(8).padStart(4, '0') + '   '
    }
    return ret + a.toString(8).padStart(5, '0')
}

function showInfo(arg) {
    if (arg == undefined) {
        for (const i of Object.keys(insts).sort()) {
            console.log(i)
        }
        console.log('\nAlias:\n')
        for (const i of Object.keys(alias2).sort()) {
            console.log(i)
        }
    }
    else if (alias2[arg] != undefined) {
        const { label, code } = alias2[arg]
        console.log('Alias')
        const { addr, key } = decodeSingleInst(code, false)
        console.log(format(code), key, addr)
        console.log(label)
    }
    else if (insts[arg] == undefined) {
        console.log('Unknown instruction')
    }
    else {
        let { info: list, label, opcode } = insts[arg]
        if (label != undefined) {
            console.log(label)
        }
        console.log('extend', (opcode & 0o10) != 0)
        if (list != undefined) {
            if (typeof list == 'string') {
                list = [list]
            }
            for (const i of list) {
                console.log(i)
            }
        }
    }

}

function decodeFile(fileName, offset, length) {
    const fd = fs.openSync(fileName, 'r')
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
}

function decodeSingleInst(inst, extend) {
    const opcode = (inst >> 12) & 0b111
    const qcode = (inst >> 10) & 0b11
    const iocode = (inst >> 9) & 0b111
    let excode = opcode

    if (extend) {
        excode |= 0o10
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

            if (['DXCH', 'DCA', 'DCS'].includes(key)) {
                addr--;
            }

            const reg = registers[addr]
            addr = (reg != undefined) ? reg : addr.toString(8)
            return { key, addr }
        }
    }

}

function decode(pgm, startAddr) {

    let extend = false
    for (const inst of pgm) {
        if (inst == 6) {
            extend = true
            console.log(format(inst, startAddr), 'EXTEND')
        }
        else if (alias[inst] != undefined) {
            console.log(format(inst, startAddr), alias[inst].name)
        }
        else {
            const { key, addr } = decodeSingleInst(inst, extend)
            extend = false
            console.log(format(inst, startAddr), key.padEnd(6, ' '), addr)
        }

        if (startAddr != undefined)
            startAddr++
    }
}
