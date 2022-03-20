declare namespace AppAgc {

    declare namespace Services {

        type EventName = 'channelUpdate' | 'lightsUpdate';

        interface Interface {
            loadRom(url: string):Promise<void>;
            reset():void;
            writeIo(channel: number, data: number, mask?: number):void;
            on(eventName: EventName, cbk: (ev: any) => void): void;
            start():void;
            loop():void;
            readAllIo():void;
            peek(offset: number): number
            poke(offset: number, value: number):void;
            lampMask : {
                COMP_ACTY,
                UPLINK_ACTY,
                TEMP,
                KEY_REL,
                VERB_NOUN,
                OPER_ERR,
                RESTART,
                STBY
                    
            };
            statusMask: {
                PRIO_DISP,
                NO_DAP,
                VEL,
                NO_ATT,
                ALT,
                GIMBAL_LOCK,
                TRACKER,
                PROG
            };
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

    declare namespace Controls {
        declare namespace DSKY {

            interface Interface {
                process(channel: number, value: number): void;
		        processLights(value: number):void;
            }
        }

        declare namespace FDAI {
            interface Interface {
                update(imu_angle: Array<number>): void;
            }
        }

        declare namespace IMU {
            interface Interface {
                update():void;
                zero():void;
                gyro_coarse_align(chan: number, val: number):void;
                gyro_fine_align(chan: number, val: number):void;
                setSt(st:number):void;
                setMet(met:number):void;
                accelerate(delta: Array<number>):void;
                rotate(delta: Array<number>):void;
                setReactor(c: number):void;

            }
        }
    }
}