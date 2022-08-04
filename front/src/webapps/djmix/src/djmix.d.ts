declare namespace DJMix {

    declare namespace Service {

        declare namespace MIDICtrl {

            type eventNames = 'MIDI_STATECHANGE' | 'MASTER_LEVEL' | 'CUE_LEVEL' | 'CROSS_FADER' | 'LEVEL' | 'PITCH' | 'SYNC' | 'CUE' | 'PLAY' | 'PFL' | 'JOGTOUCH_PRESS' | 'JOGTOUCH_RELEASE' | 'LOAD' | 'ENTER' | 'JOG_WHEEL' | 'BROWSE_WHEEL' | 'HOT_CUE' | 'LOOP_AUTO' | 'LOOP_MANUAL' | 'SAMPLER'

            interface MidiInfo {
                midiInputs: Array<{label: string, value: string}>,
                midiOutputs: Array<{label: string, value: string}>
            }

            interface Interface {
                setButtonIntensity(action: string, intensity: number, deck?: number, key?: number);
                selectMIDIInput(id: number): void;
                selectMIDIOutput(id: number): void;
                selectMIDIDevice(id: number): void;
                clearAllButtons():void;
                requestMIDIAccess(): Promise<MidiInfo>;
                getMIDIInputs(): Array<{label: string, value: string}>;
                on(action: eventNames, cbk: ({deck: number, key: number, velocity: number}) => void): void;
            }
        }

        declare namespace AudioTools {

            interface CrossFaderWithMasterLevel {
                setFaderLevel(level: number): void;
                setMasterLevel(level: number): void;   
                getOutputNode(): AudioNode; 
            }

            interface Interface {
                createStereoMerger(source1: AudioNode, source2: AudioNode): AudioNode;
                createDestination(channelCount: number, inputNode: AudioNode): void;
                createCrossFaderWithMasterLevel(source1: AudioNode, source2: AudioNode): CrossFaderWithMasterLevel;
                getAudioContext():AudioContext;
                getCurrentTime(): number;
            }
        }
    }

    declare namespace Control {

        declare namespace FileList {

            interface Interface {
                getSelFile(): {url: string, artist: string, title: string, bpm: number, length: number};
                selUp():void;
                selDown():void;
            }
        }

        declare namespace AudioPlayer {

            interface HotcueInfo {
                time: number;
                div: HTMLElement;
            }

            interface SamplerInfo {
                value: number;
                label: string;
                audioBuffer: AudioBuffer;
            }

            interface Interface {
                togglePlay(): void;
                setInfo(info: {name: string, url: string, mp3?: {artist: string, title: string}}):
                    Promise<{ audioBuffer: AudioBuffer, tempo: Breizbot.Services.BeatDetector.BeatInfo}>;
                setVolume(volume: number):void;
                isPlaying(): boolean;
                getAudioBuffer(): AudioBuffer;
                getCurrentTime(): number;
                isLoaded(): boolean;
                getOutputNode(): AudioNode
                seek(ticks: number):void;
                reset(time?: number, restart?: boolean):void;
                getHotcue(nb: number): HotcueInfo;
                addHotcue(nb: number, time: number, div:HTMLElement):void;
                jumpToHotcue(nb: number, restart:boolean = true): void;
                toggleHotcueDeleteMode():void;
                isHotcueDeleteMode():boolean;
                deleteHotcue(nb: number):void;
                autoLoopActivate(nb: number, startTime: number, duration: number):number;
                getBpm():number;
                setStartLoopTime(time: number):void;
                getStartLoopTime(): number;
                setEndLoopTime(time:number):void;
                clearLoop():void;
                setSamplers(samplers: Array<SamplerInfo>): void;
                playSample(key:number):void;
                setPlaybackRate(rate: number):void;
                getRealTime():number;
                jogTouch(isPressed:boolean):void;
            }
        }
    
    }

}