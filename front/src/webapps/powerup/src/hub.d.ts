declare namespace HUB {

    type EventName = 'disconnected' | 'attach' | 'detach' | 'batteryLevel' | 'buttonState' | 'error'

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
    function subscribe(portId: PortMap, mode: number, ckb?: (data: {portId: number, mode: number, value: number}) => void): Promise<void>;
    function createVirtualPort(portId1: PortMap, portId2: PortMap): Promise<void>;
    function getPortInformation(portId: PortMap): Promise<PortInformation>;
    function getPortIdFromName(portName: string): number;
    function waitTestValue(portId: number, mode: number, testFn: (value: number) => boolean): Promise<void>;

    declare namespace motor {
        function setPower(portId: PortMap, power: number): Promise<void>;
        function resetZero(portId: PortMap): Promise<void>;
        function setSpeed(portId: number, speed: number): Promise<void>;
        function setSpeedEx(portId: number, speed1: number, speed2: number): Promise<void>;
        function setSpeedForTime(portId: PortMap, speed: number, time: number, brakingStyle:BrakingStyle = BrakingStyle.BRAKE): Promise<void>;
        function rotateDegrees(portId: PortMap, degrees: number, speed: number, brakingStyle = BrakingStyle.BRAKE): Promise<void>; 
        function gotoAngle(portId: PortMap, angle: number, speed: number, brakingStyle = BrakingStyle.BRAKE): Promise<void>;

    }

    declare namespace led {
        function setColor(color: Color): Promise<void>;
        function setRGBColor(red: number, green: number, blue: number): Promise<void>;
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

    enum DeviceMode {
        ROTATION,
        ABSOLUTE,
        POWER,
        SPEED,
        COLOR,
        RGB
    }

    enum BrakingStyle {
        FLOAT,
        HOLD,
        BRAKE
    }
}
