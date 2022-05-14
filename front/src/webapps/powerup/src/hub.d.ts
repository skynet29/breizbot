declare namespace HUB {

    type EventName = 'disconnected' | 'attach' | 'detach' | 'batteryLevel' | 'rotate'

    interface Range {
        min: number;
        max: Number;
    }

    interface PortModeInformation {
        name: string;
        unit: string;
        PCT: Range;
        RAW: Range;
        SI: Range;
    }

    interface PortInformation {
        modes: Array<PortModeInformation>;
        capabilities: number;
    }

    function on(eventName: EventName, cbk: (data: object) => void)
    function connect(): Promise<void>;
    function shutdown(): Promise<void>;
    function getDeviceType(portId: PortMap): string;
    function subscribe(portId: PortMap, mode: number): Promise<void>;
    function createVirtualPort(portId1: PortMap, portId2: PortMap): Promise<void>;
    function getPortInformation(portId: PortMap): Promise<PortInformation>;

    declare namespace motor {
        function setPower(portId: PortMap, power: number): Promise<void>;
        function resetZero(portId: PortMap): Promise<void>;
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

    enum ModeInformationType {
        NAME,
        RAW,
        PCT,
        SI,
        SYMBOL,
        MAPPING,
        USED_INTERNALLY,
        MOTOR_BIAS,
        CAPABILITY_BITS,
        VALUE_FORMAT
    }

    enum DeviceMode {
        ROTATION,
        ABSOLUTE
    }
}
