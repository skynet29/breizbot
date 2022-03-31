declare namespace AppAgc {

    declare namespace Services {

        declare namespace IMU {
            interface Interface {
                zero():void;
                gyroCoarseAlign(chan: number, val: number):void;
                gyroFineAlign(chan: number, val: number):void;
                accelerate(delta: Array<number>):void;
                rotate(delta: Array<number>):void;
                on(event: string, cbk: (data: {imu_angle: Array<number>, error: Array<number>}) => void): void;
            }
        }

        declare namespace AGC {
            interface Interface {
                loadRom(url: string):Promise<void>;
                writeIo(channel: number, data: number, mask?: number):void;
                writeIoBit(channel: number, nbit: number, value: 0 |1): void;
                writeIoBits(channel: number, bits: object): void;
                start():void;
                run():void;
                readIo():null | {channel: number, value: number};
                peek(offset: number): number
                poke(offset: number, value: number):void;
                getChannelState(channel: number): number;
                getChannelBitState(channel: number, nbit: number): 0 | 1;
                bitMask(n: number): number;
                bit(val: number, n: number): boolean;
        
                inputsMask: {
                    LIFTOFF,
                    ISS_TURN_ON,
                    PROCEED
                };
                outputsMask: {
                    ZERO_IMU
                };
        
    
            }
        }

    
    }

    declare namespace Controls {
        declare namespace DSKY {

            interface Interface {
                process(channel: number, value: number): void;
		        processLights(value: number):void;
            }
        }

        declare namespace FDAI {
            interface Interface {
                update(imu_angle: Array<number>, error: Array<number>, omega: Array<number>): void;
            }
        }

        declare namespace SIMU {
            interface Interface {
                dynamic_simulation(Delta_Time: number): void;
                update_RCS(jetFiring: Array<number>, Delta_Time: number): void;
            }
        }

        declare namespace OUTPUT {
            interface Interface {
                update():void;
            }
        }

    }
}