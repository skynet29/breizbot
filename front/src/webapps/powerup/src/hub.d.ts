
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

    interface DeviceInfo {
        portName: string;
        type: string;
        portId: number;
        deviceTypeName: string;
    }

    interface HubDevice extends EventEmitter2 {
        name: string;

        sendMsg(msgType: number, ...data):Promise<void>;

        getHubDevices(): Device[];
        init(device: BluetoothDevice): Promise<void>;
        shutdown(): Promise<void>;
        getDevice(portId: PortMap): Device;
        createVirtualPort(portId1: PortMap, portId2: PortMap): Promise<void>;
        getPortInformation(portId: PortMap): Promise<PortInformation>;

        getMotor(portId: number): Promise<Motor>;
        getTachoMotor(portId: number): Promise<TachoMotor>;
        getDblMotor(portId1: number, portId2: number): Promise<DoubleMotor>;
        getRgbLed(portId: number):Promise<RgbLed>;
        getTiltSensor(portId: number):Promise<TiltSensor>; 
        getLed(portId: number):Promise<Led>;



        getPortIdFromName(name: string): number;
        startNotification(): Promise<void>;
        
    }

    interface Device {
        name: string;
        type: string;
        portId: number;

        getValue(mode: DeviceMode):Promise<number>;
        waitTestValue(mode: DeviceMode, testFn: (value: number) => boolean):Promise<void>;
        setMode(mode: DeviceMode, notificationEnabled: boolean, deltaInterval?: number):Promise<void>;
        subscribe(mode: DeviceMode, cbk: (value) => void, deltaInterval?: number):Promise<void>;
        readInfo():Promise<PortInformation>;
    }

    interface TiltSensor extends Device {

    }
     
    interface Motor extends Device {
        setPower(power: number): Promise<void>;
    }

    interface TachoMotor extends Motor {
        setPower(power: number): Promise<void>;
        resetZero(): Promise<void>;
        setSpeed(speed: number): Promise<void>;
        setSpeedForTime(speed: number, time: number, waitFeedback: boolean = false, brakingStyle:BrakingStyle = BrakingStyle.BRAKE): Promise<void>;
        rotateDegrees(degrees: number, speed: number, waitFeedback: boolean, brakingStyle = BrakingStyle.BRAKE): Promise<void>; 
        gotoAngle(angle: number, speed: number, waitFeedback: boolean, brakingStyle = BrakingStyle.BRAKE): Promise<void>;
        calibrate():Promise<void>;

        getAbsolutePosition(): Promise<number>;
        getPosition(): Promise<number>;
        getSpeed(): Promise<number>;

    }

    interface DoubleMotor extends Motor {
        setSpeed(speed1: number, speed2: number): Promise<void>;
        setSpeedForTime(speed1: number, speed2: number, time: number, waitFeedback: boolean = false, brakingStyle:BrakingStyle = BrakingStyle.BRAKE): Promise<void>;
        rotateDegrees(degrees: number, speed1: number, speed2: number, waitFeedback: boolean, brakingStyle = BrakingStyle.BRAKE): Promise<void>; 
        gotoAngle(angle1: number, angle2: number, speed: number, waitFeedback: boolean, brakingStyle = BrakingStyle.BRAKE): Promise<void>;

    }

    interface Led extends Device {
        setBrightness(brightness: number): Promise<void>;
    }

    interface RgbLed extends Device {
        setColor(color: Color): Promise<void>;
        setRGBColor(red: number, green: number, blue: number): Promise<void>;
    }

    function connect(): Promise<HubDevice>
    function isMotor(device: Device):boolean;
    function isLed(device: Device):boolean;
    function isTachoMotor(device: Device):boolean;
    function isDoubleMotor(device: Device):boolean;
    function getDeviceInfo(type: number):PortInformation;

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

    enum DeviceTypeNames {

    }
}


declare namespace ActionSrv {

    interface HubDesc {
        UUID: number;
        hubId: string;
        batteryLevel: number;
        address: string;
    }

}