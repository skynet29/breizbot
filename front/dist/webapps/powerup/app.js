$$.service.registerService("hub",{init:function(){let t=null,e={};const n=new EventEmitter2,o={},a={},i=function(...t){0};function s(t){const e={};return Object.entries(t).forEach(([t,n])=>{e[n]=t}),e}const c={DETACHED_IO:0,ATTACHED_IO:1,ATTACHED_VIRTUAL_IO:2},r=s(c),E={HUB_PROPERTIES:1,HUB_ACTIONS:2,HUB_ALERTS:3,HUB_ATTACHED_IO:4,GENERIC_ERROR_MESSAGES:5,HW_NETWORK_COMMANDS:8,FW_UPDATE_GO_INTO_BOOT_MODE:16,FW_UPDATE_LOCK_MEMORY:17,FW_UPDATE_LOCK_STATUS_REQUEST:18,FW_LOCK_STATUS:19,PORT_INFORMATION_REQUEST:33,PORT_MODE_INFORMATION_REQUEST:34,PORT_INPUT_FORMAT_SETUP_SINGLE:65,PORT_INPUT_FORMAT_SETUP_COMBINEDMODE:66,PORT_INFORMATION:67,PORT_MODE_INFORMATION:68,PORT_VALUE_SINGLE:69,PORT_VALUE_COMBINEDMODE:70,PORT_INPUT_FORMAT_SINGLE:71,PORT_INPUT_FORMAT_COMBINEDMODE:72,VIRTUAL_PORT_SETUP:97,PORT_OUTPUT_COMMAND:129,PORT_OUTPUT_COMMAND_FEEDBACK:130},T=s(E),_={UNKNOWN:0,SIMPLE_MEDIUM_LINEAR_MOTOR:1,TRAIN_MOTOR:2,LIGHT:8,VOLTAGE_SENSOR:20,CURRENT_SENSOR:21,PIEZO_BUZZER:22,HUB_LED:23,TILT_SENSOR:34,MOTION_SENSOR:35,COLOR_DISTANCE_SENSOR:37,MEDIUM_LINEAR_MOTOR:38,MOVE_HUB_MEDIUM_LINEAR_MOTOR:39,MOVE_HUB_TILT_SENSOR:40,DUPLO_TRAIN_BASE_MOTOR:41,DUPLO_TRAIN_BASE_SPEAKER:42,DUPLO_TRAIN_BASE_COLOR_SENSOR:43,DUPLO_TRAIN_BASE_SPEEDOMETER:44,TECHNIC_LARGE_LINEAR_MOTOR:46,TECHNIC_XLARGE_LINEAR_MOTOR:47,TECHNIC_MEDIUM_ANGULAR_MOTOR:48,TECHNIC_LARGE_ANGULAR_MOTOR:49,TECHNIC_MEDIUM_HUB_GEST_SENSOR:54,REMOTE_CONTROL_BUTTON:55,REMOTE_CONTROL_RSSI:56,TECHNIC_MEDIUM_HUB_ACCELEROMETER:57,TECHNIC_MEDIUM_HUB_GYRO_SENSOR:58,TECHNIC_MEDIUM_HUB_TILT_SENSOR:59,TECHNIC_MEDIUM_HUB_TEMPERATURE_SENSOR:60,TECHNIC_COLOR_SENSOR:61,TECHNIC_DISTANCE_SENSOR:62,TECHNIC_FORCE_SENSOR:63,TECHNIC_3X3_COLOR_LIGHT_MATRIX:64,TECHNIC_SMALL_ANGULAR_MOTOR:65,MARIO_ACCELEROMETER:71,MARIO_BARCODE_SENSOR:73,MARIO_PANTS_SENSOR:74,TECHNIC_MEDIUM_ANGULAR_MOTOR_GREY:75,TECHNIC_LARGE_ANGULAR_MOTOR_GREY:76},l=s(_),O=s({ACK:1,MACK:2,BUFFER_OVERFLOW:3,TIMEOUT:4,COMMAND_NOT_RECOGNIZED:5,INVALID_USE:6,OVERCURRENT:7,INTERNAL_ERROR:8}),d={ADVERTISING_NAME:1,BUTTON_STATE:2,FW_VERSION:3,HW_VERSION:4,RSSI:5,BATTERY_VOLTAGE:6,BATTERY_TYPE:7,MANUFACTURER_NAME:8,RADIO_FIRMWARE_VERSION:9,LWP_PROTOCOL_VERSION:10,SYSTEM_TYPE_ID:11,HW_NETWORK_ID:12,PRIMARY_MAC_ADDRESS:13,SECONDARY_MAC_ADDRESS:14,HW_NETWORK_FAMILY:15},R=s(d),u={NAME:0,RAW:1,PCT:2,SI:3,SYMBOL:4,MAPPING:5,USED_INTERNALLY:6,MOTOR_BIAS:7,CAPABILITY_BITS:8,VALUE_FORMAT:128},I=s(u),A={A:0,B:1,C:2,D:3,HUB_LED:50,CURRENT_SENSOR:59,VOLTAGE_SENSOR:60,ACCELEROMETER:97,GYRO_SENSOR:98,TILT_SENSOR:99},p={POWER:0,SPEED:1,ROTATION:2,ABSOLUTE:3,COLOR:0,RGB:1},N={FLOAT:0,HOLD:126,BRAKE:127},b=s(A),M={};M[E.HUB_ATTACHED_IO]=function(t){const o=t.getUint8(3),a=t.getUint8(4),s=a?t.getUint16(5,!0):0,E=l[s]||"Unknown",T=r[a];if(i("handlePortMsg",{portId:o,eventName:T,deviceTypeName:E}),a==c.ATTACHED_IO)e[o]=s,n.emit("attach",{portId:o,deviceTypeName:E});else if(a==c.DETACHED_IO)delete e[o],n.emit("detach",{portId:o});else if(a==c.ATTACHED_VIRTUAL_IO){const e=b[t.getUint8(7)],a=b[t.getUint8(8)];b[o]=`${e}_${a}`,i({portIdA:e,portIdB:a}),n.emit("attach",{portId:o,deviceTypeName:"Virtual Port"})}},M[E.GENERIC_ERROR_MESSAGES]=function(t){const e=t.getUint8(3),o=t.getUint8(4);i({cmdType:e,errorCode:O[o]}),n.emit("error",{cmdType:e,errorCode:O[o]})},M[E.HUB_PROPERTIES]=function(t){const e=t.getUint8(3);if(i({property:R[e]}),e==d.BATTERY_VOLTAGE){const e=t.getUint8(5);i({batteryLevel:e}),n.emit("batteryLevel",{batteryLevel:e})}else if(e==d.BUTTON_STATE){const e=t.getUint8(5);i({buttonState:e}),n.emit("buttonState",{buttonState:e})}},M[E.PORT_OUTPUT_COMMAND_FEEDBACK]=function(t){for(let e=3;e<t.byteLength;e+=2){const n=t.getUint8(e),a=t.getUint8(e+1);if(i({portId:n,feedback:a}),10==a){const t=o[n];"function"==typeof t&&(t(),delete o[n])}D[n].shift();const s=D[n][0];s&&(i("envoie message mis en attente",s),P(s))}},M[E.PORT_INFORMATION]=function(t){const e=t.getUint8(3);let n=t.getUint8(5);const a=t.getUint8(6),s=t.getUint16(7,!0),c=t.getUint16(9,!0);i(`Port ${e}, capabilities ${n}, total modes ${a}, \n                input modes ${s}, output modes ${c}`);const r="output,input,logical combinable, logical synchronisable".split(",");let E=[];for(let t=0;t<4;t++)n>>t&1&&E.push(r[t]);const T={portId:e,capabilities:E.join(", "),count:a,input:s,output:c},_=o[e];"function"==typeof _&&_(T)},M[E.PORT_MODE_INFORMATION]=function(t){const e=t.getUint8(3),n=t.getUint8(4),a=t.getUint8(5),s={portId:e,mode:n,type:I[a]};switch(a){case u.NAME:s.name=C(t.buffer.slice(6,t.byteLength));break;case u.RAW:case u.PCT:case u.SI:s.min=t.getFloat32(6,!0),s.max=t.getFloat32(10,!0);break;case u.SYMBOL:s.symbol=C(t.buffer.slice(6,t.byteLength));break;case u.VALUE_FORMAT:s.numValues=t.getUint8(6),s.dataType=["8bit","16bit","32bit","float"][t.getUint8(7)],s.totalFigures=t.getUint8(8),s.decimals=t.getUint8(9)}i("portModeInformation",s);const c=o[e];"function"==typeof c&&(c(s),delete o[e])},M[E.PORT_VALUE_SINGLE]=function(t){i("msg",t);const n=t.getUint8(3),o=e[n];i("handlePortValueSingle",{portId:n,device:o});const a=U[o];"function"==typeof a&&a(t)};const U={};function S(t){const e=t.getUint8(3);if(null!=a[e]){const{mode:n,cbk:o}=a[e];let i;switch(n){case p.ABSOLUTE:i=t.getInt16(4,!0);break;case p.ROTATION:i=t.getInt32(4,!0);break;case p.SPEED:i=t.getInt8(4)}"function"==typeof o&&o({mode:n,value:i,portId:e})}}function C(t){const e=new Uint8Array(t);let n="";for(let t=0;t<e.byteLength&&0!=e[t];t++)n+=String.fromCharCode(e[t]);return n}function m(...t){const e=t.flat(2),n=e.length+2,o=new ArrayBuffer(n),a=new Uint8Array(o);return a[0]=n,a[1]=0,a.set(e,2),o}async function P(e){i("sendMsg",e),await t.writeValueWithoutResponse(e)}async function f(t,e,n=null){a[t]={mode:e,cbk:n},await P(m(E.PORT_INPUT_FORMAT_SETUP_SINGLE,t,e,1,0,0,0,1))}function w(t,e,n){return new Promise(async a=>{await P(m(E.PORT_MODE_INFORMATION_REQUEST,t,e,n)),o[t]=a})}U[_.TECHNIC_LARGE_LINEAR_MOTOR]=S,U[_.TECHNIC_LARGE_ANGULAR_MOTOR_GREY]=S;const D={};async function L(t,...e){return i("writePortCommand",{portId:t}),new Promise(async n=>{const a=m(E.PORT_OUTPUT_COMMAND,t,17,e);null==D[t]&&(D[t]=[]),0==D[t].length?(D[t].push(a),await P(a)):(i("Message mis en attente"),D[t].push(a)),o[t]=n})}const g=100;function h(t){const e=new Uint8Array(4);return new DataView(e.buffer).setInt32(0,t,!0),Array.from(e)}function y(t,e,...n){return L(t,81,e,n)}function v(t){!function(t){const e=t.byteLength,n=t.getUint8(0),o=t.getUint8(2);i("decodeMsg",{msgLen:n,bufferLen:e,msgType:T[o]});const a=M[o];"function"==typeof a&&a(t)}(t.target.value)}function B(){i("onGattServerDisconnected"),n.emit("disconnected")}return{connect:async function(){i("connect"),e={};const n=await navigator.bluetooth.requestDevice({acceptAllDevices:!0,optionalServices:["00001623-1212-efde-1623-785feabcd123"]});n.addEventListener("gattserverdisconnected",B);const o=await n.gatt.connect();i("Connected");const a=await o.getPrimaryService("00001623-1212-efde-1623-785feabcd123");(t=await a.getCharacteristic("00001624-1212-efde-1623-785feabcd123")).addEventListener("characteristicvaluechanged",v),t.startNotifications(),await P(m(E.HUB_PROPERTIES,d.BATTERY_TYPE,5)),await P(m(E.HUB_PROPERTIES,d.BATTERY_VOLTAGE,2)),await P(m(E.HUB_PROPERTIES,d.BUTTON_STATE,2))},shutdown:function(){return P(m(E.HUB_ACTIONS,1))},getDeviceType:function(t){return l[e[t]]},subscribe:f,waitTestValue:async function(t,e,n){return new Promise(async o=>{await f(t,e,e=>{i("waitTestValue",e),n(e.value)&&(delete a[t],o())})})},createVirtualPort:function(t,e){return P(m(E.VIRTUAL_PORT_SETUP,1,t,e))},getPortInformation:async function(t){const e=await function(t){return new Promise(async e=>{await P(m(E.PORT_INFORMATION_REQUEST,t,1)),o[t]=e})}(t),{capabilities:n,count:a,output:i,input:s}=e,c=Math.max(s,i),r=[];for(let e=0;e<a;e++){const n={};if(c>>e){let o;o=await w(t,e,u.NAME),n.name=o.name,n[(o=await w(t,e,u.RAW)).type]={min:o.min,max:o.max},n[(o=await w(t,e,u.PCT)).type]={min:o.min,max:o.max},n[(o=await w(t,e,u.SI)).type]={min:o.min,max:o.max},o=await w(t,e,u.SYMBOL),n.unit=o.symbol,o=await w(t,e,u.VALUE_FORMAT);const{numValues:a,dataType:i,totalFigures:s,decimals:c}=o;n[o.type]={numValues:a,dataType:i,totalFigures:s,decimals:c}}r.push(n)}return{modes:r,capabilities:n}},getPortIdFromName:function(t){for(const[e,n]of Object.entries(b))if(n==t)return e;return-1},on:n.on.bind(n),motor:{setPower:function(t,e){return y(t,p.POWER,e)},resetZero:function(t){return y(t,p.ROTATION,0,0,0,0)},setSpeed:function(t,e){return L(t,7,e,g,0)},setSpeedEx:function(t,e,n){return L(t,8,e,n,g,0)},setSpeedForTime:function(t,e,n,o=N.BRAKE){return L(t,9,function(t){const e=new Uint8Array(2);return new DataView(e.buffer).setInt16(0,t,!0),Array.from(e)}(n),e,g,o)},rotateDegrees:function(t,e,n,o=N.BRAKE){return L(t,11,h(e),n,g,o)},gotoAngle:function(t,e,n,o=N.BRAKE){return L(t,13,h(e),n,g,o)}},led:{setColor:async function(t){return await f(A.HUB_LED,p.COLOR),y(A.HUB_LED,p.COLOR,t)},setRGBColor:async function(t,e,n){return await f(A.HUB_LED,p.RGB),y(A.HUB_LED,p.RGB,t,e,n)}},Color:{BLACK:0,PINK:1,PURPLE:2,BLUE:3,LIGHT_BLUE:4,CYAN:5,GREEN:6,YELLOW:7,ORANGE:8,RED:9,WHITE:10,NONE:255},PortMap:A,PortMapNames:b,DeviceMode:p,BrakingStyle:N}}}),$$.control.registerControl("rootPage",{template:'<div class="toolbar">\n    <div>\n        <button class="w3-blue w3-button" \n            bn-event="click: onConnect"\n            bn-show="!connected"\n        >Connect to HUB</button>\n    \n        <button class="w3-blue w3-button" \n            bn-event="click: onShutdown"\n            bn-show="connected"\n        >Shutdown</button>\n    \n        <button class="w3-blue w3-button" \n            bn-event="click: onCalibrate"\n            bn-show="connected"\n        >Calibrate</button>\n\n        <button class="w3-blue w3-button" \n            bn-event="click: onChangeMode"\n            bn-show="connected"\n        >Change Mode</button>\n        \n        <button class="w3-blue w3-button" \n            bn-event="click: onSendMsg"\n            bn-show="connected"\n        >Send Msg</button>\n    </div>\n    <div bn-show="connected">\n        Mode:\n        <span bn-text="mode"></span>\n    </div>\n</div>\n\n\n<div bn-show="connected" class="scrollBar">\n    <h1>External Devices</h1>\n    <table class="w3-table-all">\n        <thead>\n            <tr>\n                <th>Port</th>\n                <th>Device Type</th>\n                <th>Action</th>\n            </tr>\n        </thead>\n        <tbody bn-each="externalDevices" bn-event="mousedown.action: onMouseUp, mouseup.action:onMouseDown, click.portInfo: onInfo2">\n            <tr>\n                <td bn-text="$scope.$i.portName"></td>\n                <td bn-text="$scope.$i.deviceTypeName"></td>\n                <td>\n                    <button class="w3-button w3-green action" data-action="forward">FWD</button>\n                    <button class="w3-button w3-green action" data-action="backward">BKWD</button>\n                    <button class="w3-button w3-blue portInfo">INFO</button>\n                </td>\n            </tr>\n\n        </tbody>\n    </table>\n    <h1>Internal Devices</h1>\n    <table class="w3-table-all">\n        <thead>\n            <tr>\n                <th>Device Type</th>\n                <th>Action</th>\n            </tr>\n        </thead>\n        <tbody bn-each="internalDevices" bn-event="click.w3-button: onInfo">\n            <tr>\n                <td bn-text="$scope.$i.deviceTypeName"></td>\n                <td>\n                    <button class="w3-button w3-blue">INFO</button>\n                </td>\n            </tr>\n\n        </tbody>\n    </table></div>',deps:["breizbot.pager","hub","breizbot.gamepad"],props:{},init:function(t,e,n,o){Number.prototype.map=function(t,e,n,o){return(this-t)*(o-n)/(e-t)+n};let a=100,i=100,s=!1;function c(t){const e=t.closest("tr").index();return E.model.externalDevices[e].portId}function r(t,n){e.pushPage("info",{title:n,props:{portId:t}})}o.on("connected",t=>{console.log("gamepad connnected",t),o.checkGamePadStatus()}),o.on("buttonUp",async t=>{console.log("buttonUp",t);const e=n.getPortIdFromName("C_D");console.log("portId",e),s=!1,await n.motor.setPower(e,0)}),o.on("buttonDown",async t=>{console.log("buttonDown",t);const e=n.getPortIdFromName("C_D");console.log("portId",e),s=!0,await n.motor.setSpeedEx(e,-a,-i)}),o.on("axe",t=>{const{id:e,value:o}=t;if(0==e&&(o<=0?(a=100,i=Math.ceil(o.map(-1,0,0,100))):(a=Math.ceil(o.map(0,1,100,0)),i=100),console.log({speed1:a,speed2:i}),s)){const t=n.getPortIdFromName("C_D");n.motor.setSpeedEx(t,-a,-i)}}),n.on("disconnected",()=>{E.setData({connected:!1})}),n.on("attach",t=>{const{portId:e,deviceTypeName:o}=t;e<50?(E.model.externalDevices.push({portId:e,portName:n.PortMapNames[t.portId],deviceTypeName:o}),E.model.externalDevices.sort((t,e)=>t.portId-e.portId)):E.model.internalDevices.push({deviceTypeName:o,portId:e}),E.update()}),n.on("detach",t=>{const e=E.model.externalDevices.findIndex(e=>e.portId==t.portId);console.log("idx",e),E.model.externalDevices.splice(e,1),E.update()}),n.on("error",t=>{console.log(t)}),n.on("batteryLevel",t=>{const{batteryLevel:e}=t;E.setData({batteryLevel:e})});const E=$$.viewController(t,{data:{connected:!1,internalDevices:[],externalDevices:[],batteryLevel:0,mode:"UNKNOWN"},events:{onMouseUp:function(){const t=$(this).data("action"),e=c($(this));switch(t){case"off":n.motor.setPower(e,0);break;case"forward":n.motor.setPower(e,100);break;case"backward":n.motor.setPower(e,-100)}},onMouseDown:function(){const t=c($(this));n.motor.setPower(t,0)},onConnect:async function(){await n.connect(),E.setData({connected:!0}),await n.createVirtualPort(n.PortMap.C,n.PortMap.D)},onCalibrate:async function(){console.log("onCalibrate"),E.setData({mode:"CALIBRATING"}),console.log("step 1"),await n.led.setColor(n.Color.RED),await n.motor.setSpeed(n.PortMap.A,-20),await $$.util.wait(200),await n.motor.setSpeed(n.PortMap.A,20),await n.waitTestValue(n.PortMap.A,n.DeviceMode.SPEED,t=>t>5),console.log("step 2"),await n.waitTestValue(n.PortMap.A,n.DeviceMode.SPEED,t=>t<6),console.log("step 3"),await n.motor.setPower(n.PortMap.A,0),await $$.util.wait(300),await n.motor.rotateDegrees(n.PortMap.A,-220,-20),await n.motor.resetZero(n.PortMap.A),await n.led.setColor(n.Color.BLUE),E.setData({mode:"RUNNING"})},onChangeMode:async function(){const{mode:t}=E.model;"RUNNING"==t?(await n.led.setColor(n.Color.YELLOW),await n.motor.rotateDegrees(n.PortMap.A,180,50),await n.led.setColor(n.Color.GREEN),E.setData({mode:"MANIPULATOR"})):"MANIPULATOR"==t&&(await n.led.setColor(n.Color.YELLOW),await n.motor.rotateDegrees(n.PortMap.A,180,-50),await n.led.setColor(n.Color.BLUE),E.setData({mode:"RUNNING"}))},onSendMsg:async function(){console.log("onSendMsg"),await n.led.setColor(n.Color.RED),console.log("Finished"),await n.motor.resetZero(n.PortMap.B),console.log("Finished"),await n.motor.rotateDegrees(n.PortMap.B,720,100),console.log("Finished")},onShutdown:async function(){await n.shutdown()},onInfo:function(){const t=$(this).closest("tr").index(),{portId:e,deviceTypeName:n}=E.model.internalDevices[t];r(e,n)},onInfo2:function(){const t=$(this).closest("tr").index(),{portId:e,deviceTypeName:n}=E.model.externalDevices[t];r(e,n)}}})}}),$$.control.registerControl("info",{template:'<div>\n    <div>\n        Capabilities: <span bn-text="capabilities"></span>\n    </div>\n    <table class="w3-table-all">\n        <thead>\n            <tr>\n                <th>NAME</th>\n                <th>UNIT</th>\n                <th>RAW</th>\n                <th>PCT</th>\n                <th>SI</th>\n                <th>VALUE FORMAT</th>\n            </tr>\n        </thead>\n        <tbody bn-each="modes">\n            <tr>\n                <td bn-text="$scope.$i.name"></td>\n                <td bn-text="$scope.$i.unit"></td>\n                <td>\n                    <span bn-text="$scope.$i.RAW.min"></span><br>\n                    <span bn-text="$scope.$i.RAW.max"></span>\n                </td>\n                <td>\n                    <span bn-text="$scope.$i.PCT.min"></span><br>\n                    <span bn-text="$scope.$i.PCT.max"></span>\n                </td>\n                <td>\n                    <span bn-text="$scope.$i.SI.min"></span><br>\n                    <span bn-text="$scope.$i.SI.max"></span>\n                </td>\n                <td>\n                    dataType: <span bn-text="$scope.$i.VALUE_FORMAT.dataType"></span><br>\n                    numValues: <span bn-text="$scope.$i.VALUE_FORMAT.numValues"></span>\n                </td>\n            </tr>\n        </tbody>\n    </table>\n</div>',deps:["breizbot.pager","hub"],props:{},init:function(t,e,n){const{portId:o}=this.props,a=$$.viewController(t,{data:{modes:[],capabilities:""},events:{}});!async function(){const t=await n.getPortInformation(o);console.log("portInfo",t);const{modes:e,capabilities:i}=t;a.setData({modes:e,capabilities:i})}()}});