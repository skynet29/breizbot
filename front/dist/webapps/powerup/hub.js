!function(){return function e(t,s,o){function i(n,r){if(!s[n]){if(!t[n]){var c="function"==typeof require&&require;if(!r&&c)return c(n,!0);if(a)return a(n,!0);var l=new Error("Cannot find module '"+n+"'");throw l.code="MODULE_NOT_FOUND",l}var h=s[n]={exports:{}};t[n][0].call(h.exports,function(e){return i(t[n][1][e]||e)},h,h.exports,e,t,s,o)}return s[n].exports}for(var a="function"==typeof require&&require,n=0;n<o.length;n++)i(o[n]);return i}}()({1:[function(e,t,s){t.exports=class{constructor(){this.callbacks=[]}on(e){this.callbacks.push(e)}emit(e){let t=this.callbacks.length;for(;t--;)(0,this.callbacks[t])(e)&&this.callbacks.splice(t,1)}}},{}],2:[function(e,t,s){const{getEnumName:o}=$$.util,i={DETACHED_IO:0,ATTACHED_IO:1,ATTACHED_VIRTUAL_IO:2},a=o(i),n={HUB_PROPERTIES:1,HUB_ACTIONS:2,HUB_ALERTS:3,HUB_ATTACHED_IO:4,GENERIC_ERROR_MESSAGES:5,HW_NETWORK_COMMANDS:8,FW_UPDATE_GO_INTO_BOOT_MODE:16,FW_UPDATE_LOCK_MEMORY:17,FW_UPDATE_LOCK_STATUS_REQUEST:18,FW_LOCK_STATUS:19,PORT_INFORMATION_REQUEST:33,PORT_MODE_INFORMATION_REQUEST:34,PORT_INPUT_FORMAT_SETUP_SINGLE:65,PORT_INPUT_FORMAT_SETUP_COMBINEDMODE:66,PORT_INFORMATION:67,PORT_MODE_INFORMATION:68,PORT_VALUE_SINGLE:69,PORT_VALUE_COMBINEDMODE:70,PORT_INPUT_FORMAT_SINGLE:71,PORT_INPUT_FORMAT_COMBINEDMODE:72,VIRTUAL_PORT_SETUP:97,PORT_OUTPUT_COMMAND:129,PORT_OUTPUT_COMMAND_FEEDBACK:130},r=o(n),c={UNKNOWN:0,SIMPLE_MEDIUM_LINEAR_MOTOR:1,TRAIN_MOTOR:2,LIGHT:8,VOLTAGE_SENSOR:20,CURRENT_SENSOR:21,PIEZO_BUZZER:22,HUB_LED:23,TILT_SENSOR:34,MOTION_SENSOR:35,COLOR_DISTANCE_SENSOR:37,MEDIUM_LINEAR_MOTOR:38,MOVE_HUB_MEDIUM_LINEAR_MOTOR:39,MOVE_HUB_TILT_SENSOR:40,DUPLO_TRAIN_BASE_MOTOR:41,DUPLO_TRAIN_BASE_SPEAKER:42,DUPLO_TRAIN_BASE_COLOR_SENSOR:43,DUPLO_TRAIN_BASE_SPEEDOMETER:44,TECHNIC_LARGE_LINEAR_MOTOR:46,TECHNIC_XLARGE_LINEAR_MOTOR:47,TECHNIC_MEDIUM_ANGULAR_MOTOR:48,TECHNIC_LARGE_ANGULAR_MOTOR:49,TECHNIC_MEDIUM_HUB_GEST_SENSOR:54,REMOTE_CONTROL_BUTTON:55,REMOTE_CONTROL_RSSI:56,TECHNIC_MEDIUM_HUB_ACCELEROMETER:57,TECHNIC_MEDIUM_HUB_GYRO_SENSOR:58,TECHNIC_MEDIUM_HUB_TILT_SENSOR:59,TECHNIC_MEDIUM_HUB_TEMPERATURE_SENSOR:60,TECHNIC_COLOR_SENSOR:61,TECHNIC_DISTANCE_SENSOR:62,TECHNIC_FORCE_SENSOR:63,TECHNIC_3X3_COLOR_LIGHT_MATRIX:64,TECHNIC_SMALL_ANGULAR_MOTOR:65,MARIO_ACCELEROMETER:71,MARIO_BARCODE_SENSOR:73,MARIO_PANTS_SENSOR:74,TECHNIC_MEDIUM_ANGULAR_MOTOR_GREY:75,TECHNIC_LARGE_ANGULAR_MOTOR_GREY:76,VIRTUAL_DEVICE:100},l=o(c),h=o({ACK:1,MACK:2,BUFFER_OVERFLOW:3,TIMEOUT:4,COMMAND_NOT_RECOGNIZED:5,INVALID_USE:6,OVERCURRENT:7,INTERNAL_ERROR:8}),d={ADVERTISING_NAME:1,BUTTON_STATE:2,FW_VERSION:3,HW_VERSION:4,RSSI:5,BATTERY_VOLTAGE:6,BATTERY_TYPE:7,MANUFACTURER_NAME:8,RADIO_FIRMWARE_VERSION:9,LWP_PROTOCOL_VERSION:10,SYSTEM_TYPE_ID:11,HW_NETWORK_ID:12,PRIMARY_MAC_ADDRESS:13,SECONDARY_MAC_ADDRESS:14,HW_NETWORK_FAMILY:15},E=o(d),T={NAME:0,RAW:1,PCT:2,SI:3,SYMBOL:4,MAPPING:5,USED_INTERNALLY:6,MOTOR_BIAS:7,CAPABILITY_BITS:8,VALUE_FORMAT:128},u=o(T),_={A:0,B:1,C:2,D:3,HUB_LED:50,CURRENT_SENSOR:59,VOLTAGE_SENSOR:60,ACCELEROMETER:97,GYRO_SENSOR:98,TILT_SENSOR:99},R=o(_);t.exports={MessageType:n,MessageTypeNames:r,Event:i,EventNames:a,BrakingStyle:{FLOAT:0,HOLD:126,BRAKE:127},DeviceMode:{POWER:0,SPEED:1,ROTATION:2,ABSOLUTE:3,COLOR:0,RGB:1,TILT_POS:0},DeviceType:c,DeviceTypeNames:l,ModeInformationType:T,ModeInformationTypeNames:u,PortMap:_,PortMapNames:R,HubPropertyPayload:d,HubPropertyPayloadNames:E,ErrorCodeNames:h}},{}],3:[function(e,t,s){const o=e("./CallbackEmitter"),{MessageType:i,PortMapNames:a}=e("./Const"),{log:n,toUint32:r}=e("./Util");t.exports=class{constructor(e,t,s){this.hubDevice=e,this.portId=t,this.type=s,this.name=a[t],this.feedbackCallback=null,this.valueCallbacks=new o,this.mode=void 0,this.modes=void 0,this.capabilities=void 0}async writePortCommand(e,...t){return n("writePortCommand",this.portId,{waitFeedback:e,data:t}),e?new Promise(async e=>{await this.hubDevice.sendMsg(i.PORT_OUTPUT_COMMAND,this.portId,17,t),this.feedbackCallback=e}):this.hubDevice.sendMsg(i.PORT_OUTPUT_COMMAND,this.portId,16,t)}writeDirectMode(e,t,...s){return n("writeDirectMode",this.portId,{mode:e,waitFeedback:t}),this.writePortCommand(t,81,e,s)}setMode(e,t,s=1){return console.log("setMode",this.portId,{mode:e,notificationEnabled:t}),this.mode=e,this.hubDevice.sendMsg(i.PORT_INPUT_FORMAT_SETUP_SINGLE,this.portId,e,r(s),t?1:0)}decodeValue(e){if(null!=this.modes){const{VALUE_FORMAT:t,RAW:s,SI:o}=this.modes[this.mode],i=$$.util.mapRange(s.min,s.max,o.min,o.max);n("info",this.modes[this.mode]);const{dataType:a,numValues:r}=t,c=[];let l,h=4;for(let t=0;t<r;t++){switch(a){case"16bit":l=e.getInt16(h,!0),h+=2;break;case"8bit":l=e.getInt8(h),h+=1;break;case"32bit":l=e.getInt32(h,!0),h+=4;break;case"float":l=e.getFloat32(h,!0),h+=4}n("val",l),c.push(Math.trunc(i(l)))}return c}}handleValue(e){n("handleValue",this.portId,e);let t=this.decodeValue(e);null!=t&&this.valueCallbacks.emit(t)}handleFeedback(){"function"==typeof this.feedbackCallback&&this.feedbackCallback()}async getValue(e){return console.log("getValue",this.portId,{mode:e}),await this.setMode(e,!1),new Promise(async e=>{this.valueCallbacks.on(t=>(e(t),!0)),await this.hubDevice.sendMsg(i.PORT_INFORMATION_REQUEST,this.portId,0)})}async waitTestValue(e,t){return new Promise(async s=>{await this.setMode(e,!0),this.valueCallbacks.on(async o=>(n("waitTestValue",o),!!t(o)&&(n("waitTestValue OK"),await this.setMode(e,!1),s(),!0)))})}async subscribe(e,t,s=1){await this.setMode(e,!0,s),this.valueCallbacks.on(e=>(t(e),!1))}}},{"./CallbackEmitter":1,"./Const":2,"./Util":10}],4:[function(e,t,s){const o=e("./Motor"),{BrakingStyle:i}=e("./Const"),{toInt16:a,toInt32:n}=e("./Util"),r=100;t.exports=class extends o{constructor(e,t,s){super(e,t,"Virtual Device"),this.name=s}setSpeed(e,t){return this.writePortCommand(!1,8,e,t,r,0)}setSpeedForTime(e,t,s,o=!1,n=i.BRAKE){return console.log("setSpeedForTime",this.portId,{speed1:e,speed2:t,time:s,waitFeedback:o,brakingStyle:n}),this.writePortCommand(this.portId,o,10,a(s),e,t,r,n)}rotateDegrees(e,t,s,o,a=i.BRAKE){return console.log("rotateDegrees",this.portId,{degrees:e,speed1:t,speed2:s,waitFeedback:o,brakingStyle:a}),this.writePortCommand(o,12,n(e),t,s,r,a)}gotoAngle(e,t,s,o,a=i.BRAKE){return console.log("gotoAngle",this.portId,{angle1:e,angle2:t,speed:s,waitFeedback:o,brakingStyle:a}),this.writePortCommand(o,14,n(e),n(t),s,r,a)}}},{"./Const":2,"./Motor":6,"./Util":10}],5:[function(e,t,s){const o=e("./Device"),{PortMapNames:i,DeviceMode:a}=e("./Const");t.exports=class extends o{constructor(e,t,s){super(e,t,s)}setBrightness(e){return console.log("setBrightness",this.portId,{brightness:e}),this.writeDirectMode(a.POWER,!1,e)}}},{"./Const":2,"./Device":3}],6:[function(e,t,s){const o=e("./Device"),{PortMapNames:i,DeviceMode:a}=e("./Const");t.exports=class extends o{constructor(e,t,s){super(e,t,s)}setPower(e){return console.log("setPower",this.portId,{power:e}),this.writeDirectMode(a.POWER,!1,e)}}},{"./Const":2,"./Device":3}],7:[function(e,t,s){const o=e("./Device"),{PortMapNames:i,DeviceMode:a}=e("./Const");t.exports=class extends o{constructor(e,t,s){super(e,t,s)}async setColor(e){return console.log("setColor",this.portId,{color:e}),await this.setMode(a.COLOR,!1),this.writeDirectMode(a.COLOR,!1,e)}async setRGBColor(e,t,s){return console.log("setColor",this.portId,{r:e,g:t,b:s}),await this.setMode(a.RGB,!1),this.writeDirectMode(a.RGB,!1,e,t,s)}}},{"./Const":2,"./Device":3}],8:[function(e,t,s){const o=e("./Motor"),{PortMapNames:i,DeviceMode:a,BrakingStyle:n}=e("./Const"),{toInt32:r,toInt16:c}=e("./Util"),l=100;t.exports=class extends o{constructor(e,t,s){super(e,t,s)}setSpeed(e){return console.log("setSpeed",this.portId,{speed:e}),this.writePortCommand(!1,7,e,l,0)}rotateDegrees(e,t,s,o=n.BRAKE){return console.log("rotateDegrees",this.portId,{degrees:e,speed:t,waitFeedback:s,brakingStyle:o}),this.writePortCommand(s,11,r(e),t,l,o)}gotoAngle(e,t,s,o=n.BRAKE){return console.log("gotoAngle",this.portId,{angle:e,speed:t,waitFeedback:s,brakingStyle:o}),this.calibrationValue&&(e*=this.calibrationValue),this.writePortCommand(s,13,r(e),t,l,o)}setSpeedForTime(e,t,s=!1,o=n.BRAKE){return console.log("setSpeedForTime",this.portId,{speed:e,time:t,waitFeedback:s,brakingStyle:o}),this.writePortCommand(s,9,c(t),e,l,o)}resetZero(){return console.log("resetZero",this.portId),this.writeDirectMode(a.ROTATION,!0,0,0,0,0)}async calibrate(){console.log("calibrate",this.portId),this.setPower(50),await this.waitTestValue(a.SPEED,e=>e>10),await this.waitTestValue(a.SPEED,e=>0==e),this.setPower(0),await $$.util.wait(1e3),await this.resetZero(),this.setPower(-50),await this.waitTestValue(a.SPEED,e=>Math.abs(e)>10),await this.waitTestValue(a.SPEED,e=>0==e),this.setPower(0);const e=await this.getValue(a.ROTATION);console.log(e);const t=Math.floor(e/2);console.log({offset:t}),await this.gotoAngle(t,10,!0),await this.resetZero(),this.calibrationValue=Math.abs(t)}decodeValue(e){let t;switch(this.mode){case a.ABSOLUTE:t=e.getInt16(4,!0);break;case a.ROTATION:t=e.getInt32(4,!0);break;case a.SPEED:t=e.getInt8(4)}return t}}},{"./Const":2,"./Motor":6,"./Util":10}],9:[function(e,t,s){const o=e("./Device"),{PortMapNames:i,DeviceMode:a}=e("./Const");t.exports=class extends o{constructor(e,t,s){super(e,t,s)}decodeValue(e){let t;switch(this.mode){case a.TILT_POS:t={yaw:e.getInt16(4,!0),pitch:e.getInt16(6,!0),roll:e.getInt16(8,!0)}}return t}}},{"./Const":2,"./Device":3}],10:[function(e,t,s){t.exports={toInt16:function(e){const t=new Uint8Array(2);return new DataView(t.buffer).setInt16(0,e,!0),Array.from(t)},toInt32:function(e){const t=new Uint8Array(4);return new DataView(t.buffer).setInt32(0,e,!0),Array.from(t)},toUint32:function(e){const t=new Uint8Array(4);return new DataView(t.buffer).setUint32(0,e,!0),Array.from(t)},log:function(...e){}}},{}],11:[function(e,t,s){!function(){const t=e("./CallbackEmitter"),{EventNames:s,DeviceMode:o,DeviceTypeNames:i,BrakingStyle:a,PortMap:n,HubPropertyPayloadNames:r,ModeInformationTypeNames:c,Event:l,DeviceType:h,PortMapNames:d,MessageType:E,HubPropertyPayload:T,ModeInformationType:u,ErrorCodeNames:_,MessageTypeNames:R}=e("./Const"),O=e("./Motor"),I=e("./DoubleMotor"),M=e("./TachoMotor"),A=e("./Device"),m=e("./RgbLed"),g=e("./Led"),C=e("./TiltSensor"),{log:p}=e("./Util"),N={BLACK:0,PINK:1,PURPLE:2,BLUE:3,LIGHT_BLUE:4,CYAN:5,GREEN:6,YELLOW:7,ORANGE:8,RED:9,WHITE:10,NONE:255},b="00001623-1212-efde-1623-785feabcd123",S="00001624-1212-efde-1623-785feabcd123";function P(e){const t=new Uint8Array(e);let s="";for(let e=0;e<t.byteLength&&0!=t[e];e++)s+=String.fromCharCode(t[e]);return s}function U(e,t){return`${d[e]}_${d[t]}`}const D={[h.TECHNIC_LARGE_LINEAR_MOTOR]:M,[h.TECHNIC_LARGE_ANGULAR_MOTOR_GREY]:M,[h.TECHNIC_XLARGE_LINEAR_MOTOR]:M,[h.TECHNIC_MEDIUM_HUB_TILT_SENSOR]:C,[h.HUB_LED]:m,[h.LIGHT]:g};class f extends EventEmitter2{constructor(){super(),this.charac=null,this.portCmdQueue={},this.portCmdCallback={},this.hubDevices={},this.busy=!1,this.cmdQueue=[],this.attachCallbacks=new t}async init(e){const t=await e.gatt.connect();p("Connected");const s=await t.getPrimaryService(b);this.charac=await s.getCharacteristic(S);const o=e=>{this.decodeMsg(e.target.value)};e.addEventListener("gattserverdisconnected",()=>{console.log("onGattServerDisconnected",this),this.charac.removeEventListener("characteristicvaluechanged",o),this.charac=null,this.emit("disconnected")}),this.charac.addEventListener("characteristicvaluechanged",o),await this.charac.startNotifications(),await $$.util.wait(100)}async startNotification(){await this.sendMsg(E.HUB_PROPERTIES,T.BATTERY_VOLTAGE,2),await this.sendMsg(E.HUB_PROPERTIES,T.SYSTEM_TYPE_ID,5),await this.sendMsg(E.HUB_PROPERTIES,T.PRIMARY_MAC_ADDRESS,5),await this.sendMsg(E.HUB_ALERTS,1,1)}getMotor(e){return new Promise((t,s)=>{const o=this.hubDevices[e];o?o instanceof O?t(o):s():this.attachCallbacks.on(s=>s.portId==e&&(p(`device on portId ${e} is ready`),t(s),!0))})}getTachoMotor(e){return new Promise((t,s)=>{const o=this.hubDevices[e];o?o instanceof M?t(o):s():this.attachCallbacks.on(s=>s.portId==e&&(p(`device on portId ${e} is ready`),t(s),!0))})}isMotor(e){const t=this.hubDevices[e];return!!t&&t instanceof O}isLed(e){const t=this.hubDevices[e];return!!t&&t instanceof g}isTachoMotor(e){const t=this.hubDevices[e];return!!t&&t instanceof M}getTiltSensor(e){return new Promise((t,s)=>{const o=this.hubDevices[e];o?o instanceof C?t(o):s():this.attachCallbacks.on(s=>s.portId==e&&(p(`device on portId ${e} is ready`),t(s),!0))})}getRgbLed(e){return new Promise((t,s)=>{const o=this.hubDevices[e];o?o instanceof m?t(o):s():this.attachCallbacks.on(s=>s.portId==e&&(p(`device on portId ${e} is ready`),t(s),!0))})}getLed(e){return new Promise((t,s)=>{const o=this.hubDevices[e];o?o instanceof g?t(o):s():this.attachCallbacks.on(s=>s.portId==e&&(p(`device on portId ${e} is ready`),t(s),!0))})}async getDblMotor(e,t){return new Promise(async s=>{const o=U(e,t),i=Object.values(this.hubDevices).find(e=>e.name==o);i?s(i):(this.attachCallbacks.on(e=>e.name==o&&(console.log(`device on portId ${e.portId} is ready`),s(e),!0)),await this.createVirtualPort(e,t))})}async sendBuffer(e){console.log("sendBuffer",e),this.busy?(console.log("busy! push in queue"),this.cmdQueue.push(e)):(this.busy=!0,await this.charac.writeValueWithoutResponse(e),this.busy=!1,this.cmdQueue.length>0&&await this.sendBuffer(this.cmdQueue.shift()))}sendMsg(e,...t){return p("sendMsg",R[e],t),this.sendBuffer(function(e,...t){const s=t.flat(3),o=s.length+3,i=new ArrayBuffer(o),a=new Uint8Array(i);return a[0]=o,a[1]=0,a[2]=e,a.set(s,3),i}(e,t))}getPortIdFromName(e){for(const t of Object.values(this.hubDevices))if(t.name==e)return t.portId}createVirtualPort(e,t){return this.sendMsg(E.VIRTUAL_PORT_SETUP,1,e,t)}shutdown(){return this.sendMsg(E.HUB_ACTIONS,1)}getHubDevices(){return Object.values(this.hubDevices)}getDeviceType(e){return this.hubDevices[e].type}getDevice(e){return this.hubDevices[e]}async getPortInformation(e){let{modes:t,capabilities:s}=this.hubDevices[e];if(null!=t||null!=s)return{modes:t,capabilities:s};const o=await this.getPortInformationRequest(e),{count:i,output:a,input:n}=o;s=o.capabilities;const r=Math.max(n,a);t=[];for(let s=0;s<i;s++){const o={};if(r>>s){let t;t=await this.getPortModeInformationRequest(e,s,u.NAME),o.name=t.name,o[(t=await this.getPortModeInformationRequest(e,s,u.RAW)).type]={min:t.min,max:t.max},o[(t=await this.getPortModeInformationRequest(e,s,u.PCT)).type]={min:t.min,max:t.max},o[(t=await this.getPortModeInformationRequest(e,s,u.SI)).type]={min:t.min,max:t.max},t=await this.getPortModeInformationRequest(e,s,u.SYMBOL),o.unit=t.symbol,t=await this.getPortModeInformationRequest(e,s,u.VALUE_FORMAT);const{numValues:i,dataType:a,totalFigures:n,decimals:r}=t;o[t.type]={numValues:i,dataType:a,totalFigures:n,decimals:r}}t.push(o)}return this.hubDevices[e].modes=t,this.hubDevices[e].capabilities=s,{modes:t,capabilities:s}}getPortInformationRequest(e){return new Promise(async t=>{await this.sendMsg(E.PORT_INFORMATION_REQUEST,e,1),this.portCmdCallback[e]=t})}getPortModeInformationRequest(e,t,s){return new Promise(async o=>{await this.sendMsg(E.PORT_MODE_INFORMATION_REQUEST,e,t,s),this.portCmdCallback[e]=o})}decodeMsg(e){e.byteLength,e.getUint8(0);const t=e.getUint8(2);switch(p("decodeMsg",{msgType:R[t]}),t){case E.HUB_ATTACHED_IO:this.handlePortMsg(e);break;case E.GENERIC_ERROR_MESSAGES:this.handleGenericErrorMsg(e);break;case E.HUB_PROPERTIES:this.handleHubPropertyResponse(e);break;case E.HUB_ALERTS:this.handleHubAlerts(e);break;case E.PORT_OUTPUT_COMMAND_FEEDBACK:this.handlePortCommandFeedback(e);break;case E.PORT_MODE_INFORMATION:this.handlePortModeInformation(e);break;case E.PORT_INFORMATION:this.handlePortInformation(e);break;case E.PORT_VALUE_SINGLE:this.handlePortValueSingle(e)}}handlePortValueSingle(e){const t=e.getUint8(3),s=e.getUint8(0),o=this.hubDevices[t];p("handlePortValueSingle",{msgLen:s,portId:t}),o.handleValue(e)}handlePortModeInformation(e){const t=e.getUint8(3),s=e.getUint8(4),o=e.getUint8(5),i={portId:t,mode:s,type:c[o]};switch(o){case u.NAME:i.name=P(e.buffer.slice(6,e.byteLength));break;case u.RAW:case u.PCT:case u.SI:i.min=e.getFloat32(6,!0),i.max=e.getFloat32(10,!0);break;case u.SYMBOL:i.symbol=P(e.buffer.slice(6,e.byteLength));break;case u.VALUE_FORMAT:i.numValues=e.getUint8(6),i.dataType=["8bit","16bit","32bit","float"][e.getUint8(7)],i.totalFigures=e.getUint8(8),i.decimals=e.getUint8(9)}p("portModeInformation",i);const a=this.portCmdCallback[t];"function"==typeof a&&(a(i),delete this.portCmdCallback[t])}handlePortInformation(e){const t=e.getUint8(3);let s=e.getUint8(5);const o=e.getUint8(6),i=e.getUint16(7,!0),a=e.getUint16(9,!0);p(`Port ${t}, capabilities ${s}, total modes ${o}, \n                    input modes ${i}, output modes ${a}`);const n="output,input,logical combinable, logical synchronisable".split(",");let r=[];for(let e=0;e<4;e++)s>>e&1&&r.push(n[e]);const c={portId:t,capabilities:r.join(", "),count:o,input:i,output:a},l=this.portCmdCallback[t];"function"==typeof l&&l(c)}handleHubPropertyResponse(e){const t=e.getUint8(3);if(p({property:r[t]}),t==T.BATTERY_VOLTAGE){const t=e.getUint8(5);p({batteryLevel:t}),this.emit("batteryLevel",{batteryLevel:t})}else if(t==T.BUTTON_STATE){const t=e.getUint8(5);p({buttonState:t}),this.emit("buttonState",{buttonState:t})}else if(t==T.SYSTEM_TYPE_ID){const t=e.getUint8(5);p({systemType:t})}else if(t==T.PRIMARY_MAC_ADDRESS){const t=[];for(let s=0;s<6;s++)t.push(e.getUint8(5+s).toString(16).toLocaleUpperCase().padStart(2,"0"));p({bytes:t}),this.emit("address",{address:t.join(":")})}}handleGenericErrorMsg(e){const t=e.getUint8(3),s=e.getUint8(4);p({cmdType:t,errorCode:_[s]}),this.emit("error",{cmdType:t,errorCode:_[s]})}handleHubAlerts(e){const t=e.byteLength,s=e.getUint8(0),o=e.getUint8(3),i=e.getUint8(4),a=e.getUint8(5);p("handleHubAlerts",{bufferLen:t,msgLen:s,type:o,operation:i,payload:a}),this.emit("hubAlerts",{type:o,payload:a})}handlePortCommandFeedback(e){for(let t=3;t<e.byteLength;t+=2){const s=e.getUint8(t),o=e.getUint8(t+1),i=this.hubDevices[s];p("handlePortCommandFeedback",{portId:s,feedback:o}),10==o&&null!=i&&i.handleFeedback()}}handlePortMsg(e){const t=e.getUint8(3),o=e.getUint8(4),a=o?e.getUint16(5,!0):0,n=i[a]||"Unknown",r=s[o];if(console.log("handlePortMsg",{portId:t,eventName:r,deviceTypeName:n}),o==l.ATTACHED_IO){let e=D[a];e||(e=A);const s=new e(this,t,n);this.hubDevices[t]=s,this.attachCallbacks.emit(s),this.emit("attach",s)}else if(o==l.DETACHED_IO)delete this.hubDevices[t],this.emit("detach",{portId:t});else if(o==l.ATTACHED_VIRTUAL_IO){const s=e.getUint8(7),o=e.getUint8(8),i=new I(this,t,U(s,o));this.hubDevices[t]=i,this.attachCallbacks.emit(i),this.emit("attach",i)}}}$$.service.registerService("hub",{init:function(){return{connect:async function(){p("connect");const e=await navigator.bluetooth.requestDevice({acceptAllDevices:!0,optionalServices:[b]}),t=new f;return await t.init(e),t},Color:N,PortMap:n,PortMapNames:d,DeviceMode:o,BrakingStyle:a,DeviceTypeNames:i}}})}()},{"./CallbackEmitter":1,"./Const":2,"./Device":3,"./DoubleMotor":4,"./Led":5,"./Motor":6,"./RgbLed":7,"./TachoMotor":8,"./TiltSensor":9,"./Util":10}]},{},[11]);
//# sourceMappingURL=hub.js.map