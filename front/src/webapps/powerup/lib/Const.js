//@ts-check

const { getEnumName } = $$.util

const Event = {
    DETACHED_IO: 0x00,
    ATTACHED_IO: 0x01,
    ATTACHED_VIRTUAL_IO: 0x02,
}
const EventNames = getEnumName(Event)

const HubAlertType = {
    LOW_VOLTAGE: 0x01,
    HIGH_CURRENT: 0x02,
    LOW_SIGNAL_STRENGTH: 0x03,
    OVER_POWER_CONDITION: 0x04
}

const MessageType = {
    HUB_PROPERTIES: 0x01,
    HUB_ACTIONS: 0x02,
    HUB_ALERTS: 0x03,
    HUB_ATTACHED_IO: 0x04,
    GENERIC_ERROR_MESSAGES: 0x05,
    HW_NETWORK_COMMANDS: 0x08,
    FW_UPDATE_GO_INTO_BOOT_MODE: 0x10,
    FW_UPDATE_LOCK_MEMORY: 0x11,
    FW_UPDATE_LOCK_STATUS_REQUEST: 0x12,
    FW_LOCK_STATUS: 0x13,
    PORT_INFORMATION_REQUEST: 0x21,
    PORT_MODE_INFORMATION_REQUEST: 0x22,
    PORT_INPUT_FORMAT_SETUP_SINGLE: 0x41,
    PORT_INPUT_FORMAT_SETUP_COMBINEDMODE: 0x42,
    PORT_INFORMATION: 0x43,
    PORT_MODE_INFORMATION: 0x44,
    PORT_VALUE_SINGLE: 0x45,
    PORT_VALUE_COMBINEDMODE: 0x46,
    PORT_INPUT_FORMAT_SINGLE: 0x47,
    PORT_INPUT_FORMAT_COMBINEDMODE: 0x48,
    VIRTUAL_PORT_SETUP: 0x61,
    PORT_OUTPUT_COMMAND: 0x81,
    PORT_OUTPUT_COMMAND_FEEDBACK: 0x82,
}



const MessageTypeNames = getEnumName(MessageType)

const DeviceType = {
    UNKNOWN: 0,
    SIMPLE_MEDIUM_LINEAR_MOTOR: 1,
    TRAIN_MOTOR: 2,
    LIGHT: 8,
    VOLTAGE_SENSOR: 20,
    CURRENT_SENSOR: 21,
    PIEZO_BUZZER: 22,
    HUB_LED: 23,
    TILT_SENSOR: 34,
    MOTION_SENSOR: 35,
    COLOR_DISTANCE_SENSOR: 37,
    MEDIUM_LINEAR_MOTOR: 38,
    MOVE_HUB_MEDIUM_LINEAR_MOTOR: 39,
    MOVE_HUB_TILT_SENSOR: 40,
    DUPLO_TRAIN_BASE_MOTOR: 41,
    DUPLO_TRAIN_BASE_SPEAKER: 42,
    DUPLO_TRAIN_BASE_COLOR_SENSOR: 43,
    DUPLO_TRAIN_BASE_SPEEDOMETER: 44,
    TECHNIC_LARGE_LINEAR_MOTOR: 46, // Technic Control+
    TECHNIC_XLARGE_LINEAR_MOTOR: 47, // Technic Control+
    TECHNIC_MEDIUM_ANGULAR_MOTOR: 48, // Spike Prime
    TECHNIC_LARGE_ANGULAR_MOTOR: 49, // Spike Prime
    TECHNIC_MEDIUM_HUB_GEST_SENSOR: 54,
    REMOTE_CONTROL_BUTTON: 55,
    REMOTE_CONTROL_RSSI: 56,
    TECHNIC_MEDIUM_HUB_ACCELEROMETER: 57,
    TECHNIC_MEDIUM_HUB_GYRO_SENSOR: 58,
    TECHNIC_MEDIUM_HUB_TILT_SENSOR: 59,
    TECHNIC_MEDIUM_HUB_TEMPERATURE_SENSOR: 60,
    TECHNIC_COLOR_SENSOR: 61, // Spike Prime
    TECHNIC_DISTANCE_SENSOR: 62, // Spike Prime
    TECHNIC_FORCE_SENSOR: 63, // Spike Prime
    TECHNIC_3X3_COLOR_LIGHT_MATRIX: 64, // Spike Essential
    TECHNIC_SMALL_ANGULAR_MOTOR: 65, // Spike Essential
    MARIO_ACCELEROMETER: 71,
    MARIO_BARCODE_SENSOR: 73,
    MARIO_PANTS_SENSOR: 74,
    TECHNIC_MEDIUM_ANGULAR_MOTOR_GREY: 75, // Mindstorms
    TECHNIC_LARGE_ANGULAR_MOTOR_GREY: 76, // Technic Control+
    VIRTUAL_DEVICE: 100
}

const DeviceTypeNames = getEnumName(DeviceType)

const ErrorCode = {
    ACK: 0x01,
    MACK: 0x02,
    BUFFER_OVERFLOW: 0x03,
    TIMEOUT: 0x04,
    COMMAND_NOT_RECOGNIZED: 0x05,
    INVALID_USE: 0x06,
    OVERCURRENT: 0x07,
    INTERNAL_ERROR: 0x08,
}

const ErrorCodeNames = getEnumName(ErrorCode)


const HubPropertyPayload = {
    ADVERTISING_NAME: 0x01,
    BUTTON_STATE: 0x02,
    FW_VERSION: 0x03,
    HW_VERSION: 0x04,
    RSSI: 0x05,
    BATTERY_VOLTAGE: 0x06,
    BATTERY_TYPE: 0x07,
    MANUFACTURER_NAME: 0x08,
    RADIO_FIRMWARE_VERSION: 0x09,
    LWP_PROTOCOL_VERSION: 0x0A,
    SYSTEM_TYPE_ID: 0x0B,
    HW_NETWORK_ID: 0x0C,
    PRIMARY_MAC_ADDRESS: 0x0D,
    SECONDARY_MAC_ADDRESS: 0x0E,
    HW_NETWORK_FAMILY: 0x0F
}

const HubPropertyPayloadNames = getEnumName(HubPropertyPayload)

const ModeInformationType = {
    NAME: 0x00,
    RAW: 0x01,
    PCT: 0x02,
    SI: 0x03,
    SYMBOL: 0x04,
    MAPPING: 0x05,
    USED_INTERNALLY: 0x06,
    MOTOR_BIAS: 0x07,
    CAPABILITY_BITS: 0x08,
    VALUE_FORMAT: 0x80,
}

const ModeInformationTypeNames = getEnumName(ModeInformationType)

const PortMap = {
    "A": 0,
    "B": 1,
    "C": 2,
    "D": 3,
    "HUB_LED": 50,
    "CURRENT_SENSOR": 59,
    "VOLTAGE_SENSOR": 60,
    "ACCELEROMETER": 97,
    "GYRO_SENSOR": 98,
    "TILT_SENSOR": 99
}

const DeviceMode = {
    POWER: 0x00,
    SPEED: 0x01,
    ROTATION: 0x02,
    ABSOLUTE: 0x03,
    COLOR: 0x00,
    RGB: 0x01,
    TILT_POS: 0x00,
    TILT_INPACT_COUNT: 0x01
}

const BrakingStyle = {
    FLOAT: 0,
    HOLD: 126,
    BRAKE: 127
}

const PortMapNames = getEnumName(PortMap)

module.exports = {
    MessageType,
    MessageTypeNames,
    Event,
    EventNames,
    BrakingStyle,
    DeviceMode,
    DeviceType,
    DeviceTypeNames,
    ModeInformationType,
    ModeInformationTypeNames,
    PortMap,
    PortMapNames,
    HubPropertyPayload,
    HubPropertyPayloadNames,
    ErrorCodeNames
}