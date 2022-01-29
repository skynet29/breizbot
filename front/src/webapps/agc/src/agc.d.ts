declare namespace AppAgc {

    declare namespace Services {

        type EventName = 'channelUpdate' | 'lightsUpdate';

        interface Interface {
            loadRom(url: string):Promise<void>;
            reset():void;
            writeIo(channel: number, data: number):void;
            readIo(): {channel: number, value: number};
            on(eventName: EventName, cbk: (ev: any) => void): void;
            start():void;
            loop():void;
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
                NOT_ATT,
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
    }
}