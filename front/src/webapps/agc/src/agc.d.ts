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