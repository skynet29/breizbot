import RgbLed from "../lib/RgbLed";

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
        getDeviceType(portId: PortMap): string;
        createVirtualPort(portId1: PortMap, portId2: PortMap): Promise<void>;
        getPortInformation(portId: PortMap): Promise<PortInformation>;

        getMotor(portId: number): Promise<Motor>;
        getDblMotor(portId1: number, portId2: number): Promise<DoubleMotor>
        getRbgLed(portId: number):Promise<RgbLed>;
        getTiltSensor(portId: number):Promise<TiltSensor>; 
        getSinpleLed(portId: number):Promise<Led>;

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
    }

    interface TiltSensor extends Device {

    }
     
    interface Motor extends Device {
        setPower(power: number): Promise<void>;
        resetZero(): Promise<void>;
        setSpeed(speed: number): Promise<void>;
        setSpeedForTime(speed: number, time: number, waitFeedback: boolean = false, brakingStyle:BrakingStyle = BrakingStyle.BRAKE): Promise<void>;
        rotateDegrees(degrees: number, speed: number, waitFeedback: boolean, brakingStyle = BrakingStyle.BRAKE): Promise<void>; 
        gotoAngle(angle: number, speed: number, waitFeedback: boolean, brakingStyle = BrakingStyle.BRAKE): Promise<void>;
        calibrate():Promise<void>;

    }

    interface DoubleMotor extends Device {
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

    interface StepDesc {
        type: 'SPEED' | 'DBLSPEED' | 'POWER' | 'ROTATE' |
         'POSITION' | 'CALIBRATE' | 'ZERO' | 'COLOR' | 'RGB' | 'SPEEDTIME' | 'SLEEP' | 'TESTVAR' | 'SETVAR';
        hub: string;
        port?: string;
        speed?: number;
        port1?: string;
        port2?: string;
        speed1?: number;
        speed2?: number;
        power?: number;
        angle?: number;
        waitFeedback?: boolean;
        color?: number;
        red?: number;
        green?: number;
        blue?: number;
        time?: number;
        brakeStyle?: HUB.BrakingStyle;
        angle1?: number;
        angle2?: number;
        varName?: string;
        varValue?: string;
        eqAction?: string;
        neqAction?: string;
    }

    interface ActionDesc {
        name: string;
        steps: Array<StepDesc>;
    }

    interface VarDesc {
        name: string;
        value: string;
    }

    interface Interface {
        execAction(hubDevices: Array<HUB.HubDevice>, actions: Array<ActionDesc>, actionName: string, factor: number):Promise<void>;
        getVariables(): Array<VarDesc>;
        resetVariables():void;

    }
}