declare namespace DJMix {

    declare namespace Service {

        declare namespace MIDICtrl {

            type eventNames = 'MASTER_LEVEL' | 'CUE_LEVEL' | 'CROSS_FADER' | 'LEVEL' | 'PITCH' | 'SYNC' | 'CUE' | 'PLAY' | 'PFL' | 'JOGTOUCH' | 'LOAD' | 'ENTER' | 'JOG_WHEEL' | 'BROWSE_WHEEL' | 'HOT_CUE' | 'LOOP_AUTO' | 'LOOP_MANUAL' | 'SAMPLER'

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
                getMIDIOutpus(): Array<{label: string, value: string}>;
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
        declare namespace AudioPlayer {

            interface Interface {
                togglePlay(): void;
                setInfo(info: {name: string, url: string, mp3?: {artist: string, title: string}}):Promise<AudioBuffer>;
                setVolume(volume: number):void;
                isPlaying(): boolean;
                getAudioBuffer(): AudioBuffer;
                getCurrentTime(): number;
                isLoaded(): boolean;
                getOutputNode(): AudioNode
                seek(ticks: number):void;
                reset(time?: number, restart?: boolean):void;
            }
        }
    
    }

}