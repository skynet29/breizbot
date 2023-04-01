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
        getHubDevices(): DeviceInfo[];
        init(device: BluetoothDevice): Promise<void>;
        shutdown(): Promise<void>;
        getDeviceType(portId: PortMap): string;
        setPortFormat(portId: PortMap, mode: DeviceMode, cbk?: (data)=>void, deltaInterval?: number, ckb?: (data: {portId: number, mode: number, value: number}) => void): Promise<void>;
        createVirtualPort(portId1: PortMap, portId2: PortMap): Promise<string>;
        getPortInformation(portId: PortMap): Promise<PortInformation>;
        waitTestValue(portId: number, mode: number, testFn: (value: number) => boolean): Promise<void>;
        getMotor(portId: number): Motor;
        getDblMotor(portId1: number, portId2: number): Promise<DoubleMotor>
        getLed(portId: number):Led;
        getPortIdFromName(name: string): number;
        startNotification(): Promise<void>;
        getPortValue(portId: number, mode: number):Promise<number>;
        waitTestValue(portId: number, mode: number, testFn: (value: number) => boolean):Promise<void>;
    }
     
    interface Motor {
        setPower(power: number): Promise<void>;
        resetZero(): Promise<void>;
        setSpeed(speed: number): Promise<void>;
        setSpeedForTime(speed: number, time: number, waitFeedback: boolean = false, brakingStyle:BrakingStyle = BrakingStyle.BRAKE): Promise<void>;
        rotateDegrees(degrees: number, speed: number, waitFeedback: boolean, brakingStyle = BrakingStyle.BRAKE): Promise<void>; 
        gotoAngle(angle: number, speed: number, waitFeedback: boolean, brakingStyle = BrakingStyle.BRAKE): Promise<void>;
        calibrate():Promise<void>;

    }

    interface DoubleMotor {
        create(): Promise<void>;
        setSpeed(speed1: number, speed2: number): Promise<void>;
        setSpeedForTime(speed1: number, speed2: number, time: number, waitFeedback: boolean = false, brakingStyle:BrakingStyle = BrakingStyle.BRAKE): Promise<void>;
        rotateDegrees(degrees: number, speed1: number, speed2: number, waitFeedback: boolean, brakingStyle = BrakingStyle.BRAKE): Promise<void>; 
        gotoAngle(angle1: number, angle2: number, speed: number, waitFeedback: boolean, brakingStyle = BrakingStyle.BRAKE): Promise<void>;

    }


    interface Led {
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
        hubDevice: HUB.HubDevice;
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
        execAction(hubDevices: Array<HubDesc>, actions: Array<ActionDesc>, actionName: string, factor: number):Promise<void>;
        getVariables(): Array<VarDesc>;
        resetVariables():void;

    }
}