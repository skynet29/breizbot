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
    function subscribe(portId: PortMap, mode: DeviceMode, deltaInterval?: number, ckb?: (data: {portId: number, mode: number, value: number}) => void): Promise<void>;
    function createVirtualPort(portId1: PortMap, portId2: PortMap): Promise<void>;
    function getPortInformation(portId: PortMap): Promise<PortInformation>;
    function getPortIdFromName(portName: string): number;
    function waitTestValue(portId: number, mode: number, testFn: (value: number) => boolean): Promise<void>;
    
    interface MotorInterface  {
        setPower(power: number): Promise<void>;
        resetZero(): Promise<void>;
        setSpeed(speed: number): Promise<void>;
        setSpeedForTime(speed: number, time: number, brakingStyle:BrakingStyle = BrakingStyle.BRAKE): Promise<void>;
        rotateDegrees(degrees: number, speed: number, brakingStyle = BrakingStyle.BRAKE): Promise<void>; 
        gotoAngle(angle: number, speed: number, brakingStyle = BrakingStyle.BRAKE): Promise<void>;
        waitSpeed(testFn: (speed: number) => boolean): Promise<void>;

    }

    interface DoubleMotorInterface {
        setSpeed(speed1: number, speed2: number): Promise<void>;
    }

    function Motor(portId: PortMap): MotorInterface;
    function DoubleMotor(portId1: PortMap, portId2: PortMap, name: string):Promise<DoubleMotorInterface>;

    interface LedInterface {
        setColor(color: Color): Promise<void>;
        setRGBColor(red: number, green: number, blue: number): Promise<void>;
    }

    function Led(portId: PortMap): LedInterface;

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
        RGB,
        TILT_POS
    }

    enum BrakingStyle {
        FLOAT,
        HOLD,
        BRAKE
    }
}
