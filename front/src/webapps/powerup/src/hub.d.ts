declare namespace HUB {

    type EventName = 'disconnected' | 'attach' | 'detach'

    function on(eventName: EventName, cbk: (data: object) => void)
    function connect(): Promise<void>;
    function shutdown(): Promise<void>;
    function getDeviceType(portId: PortMap): string;
    function subscribe(portId: PortMap, mode: number): Promise<void>;

    declare namespace motor {
        function setPower(portId: PortMap, power: number): Promise<void>;
    }

    declare namespace led {
        function setColor(color: Color): Promise<void>;
    }

    enum Color {
        BLACK,
        PINK,
        PURPLE,
        BLUE,
        LIGHT_BLUE,
        CYAN,
        GREEN,
        YELLOW,
        ORANGE,
        RED,
        WHITE,
        NONE
    };

    enum PortMap {
        A,
        B,
        C,
        D,
        HUB_LED,
        CURRENT_SENSOR,
        VOLTAGE_SENSOR,
        ACCELEROMETER,
        GYRO_SENSOR,
        TILT_SENSOR
    }
}
