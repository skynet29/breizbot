declare namespace AppAgc {

    declare namespace Services {

        type EventName = 'channelUpdate' | 'lightsUpdate';

        interface Interface {
            loadRom(url: string):Promise<void>;
            reset():void;
            writeIo(channel: number, data: number):void;
            on(eventName: EventName, cbk: (ev: any) => void): void;
            start():void;
            loop():void;
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
            }

        }
    
    }

    declare namespace Controls {
        declare namespace DSKY {

            interface Interface {
                process(channel: number, value: number): void;
		        processLights(value: number):void;
                tick():void;
            }
        }

        declare namespace IMU {
            interface Interface {
                update():void;
                zero():void;
                gyro_coarse_align(chan: number, val: number):void;
                gyro_fine_align(chan: number, val: number):void;
            }
        }
    }
}