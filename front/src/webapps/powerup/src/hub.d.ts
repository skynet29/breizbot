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

    interface HubDevice extends EventEmitter2 {
        getHubDevices(): {[portId: string]: string};
        connect(): Promise<void>;
        shutdown(): Promise<void>;
        getDeviceType(portId: PortMap): string;
        subscribe(portId: PortMap, mode: DeviceMode, deltaInterval?: number, ckb?: (data: {portId: number, mode: number, value: number}) => void): Promise<void>;
        createVirtualPort(portId1: PortMap, portId2: PortMap): Promise<void>;
        getPortInformation(portId: PortMap): Promise<PortInformation>;
        getPortIdFromName(portName: string): number;
        waitTestValue(portId: number, mode: number, testFn: (value: number) => boolean): Promise<void>;
        createMotor(portId): Motor;
    }
     
    interface Motor {
        setPower(power: number): Promise<void>;
        resetZero(): Promise<void>;
        setSpeed(speed: number): Promise<void>;
        setSpeedForTime(speed: number, time: number, brakingStyle:BrakingStyle = BrakingStyle.BRAKE): Promise<void>;
        rotateDegrees(degrees: number, speed: number, brakingStyle = BrakingStyle.BRAKE): Promise<void>; 
        gotoAngle(angle: number, speed: number, brakingStyle = BrakingStyle.BRAKE): Promise<void>;
        waitSpeed(testFn: (speed: number) => boolean): Promise<void>;

    }

    interface DoubleMotor {
        create(): Promise<void>;
        setSpeed(speed1: number, speed2: number): Promise<void>;
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
}
