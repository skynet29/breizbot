declare namespace AppAgc {

    declare namespace Services {
        interface Interface {
            initWasm(): void;
            loadRom(url: string):Promise<void>;
            reset():void;
        }
    
    }
}