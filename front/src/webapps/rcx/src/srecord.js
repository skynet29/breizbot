$$.service.registerService('app.srecord', {
    
    init: function(config) {

        function getAddrLen(type) {
            switch (type) {
                case 0:
                case 1:
                case 9:
                case 5:
                  return 2
                case 2:
                case 6:
                case 8:
                  return 3
                  break;
                case 3:
                case 7:
                  return 4
                default:
                  throw 'Bad type'
              }            
        }

        function parse(data) {
            const srecs = data.split('\n')
            console.log('nb srecs', srecs.length)
            const ret = {mem: {}}
            srecs.forEach((s) => {
                if (s[0] != 'S') {
                    throw 'Bad header'
                }
                const type = parseInt(s[1])
                //console.log('type', type)

                const alen = getAddrLen(type)
                const addr = parseInt(s.substr(4, alen * 2), 16)
                const len = parseInt(s.substr(2, 2), 16)
                const dataLen = len - 1 - alen
                const b = []
                for(let i = 0, k = 4 + alen * 2; i < dataLen; i++, k+= 2) {
                    b.push(parseInt(s.substr(k, 2), 16))
                }
                if (type == 1) {
                    ret.mem[addr] = b
                }
                else if (type == 9) {
                    ret.boot = addr
                }
                else if (type == 0) {
                    let info = ''
                    b.forEach((val) => {
                      info += String.fromCharCode(val)  
                    })
                    ret.info = info
                }

            })

            return ret


        }

        return {
            parse
        }

    }
})