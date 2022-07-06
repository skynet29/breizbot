declare namespace DJMix {

    declare namespace AudioPlayer {

        interface Interface {
            getAudioElement(): HTMLAudioElement;
            togglePlay(): void;
            setInfo(info: {name: string, url: string, mp3?: {artist: string, title: string}}):Promise<void>;
            setVolume(volume: number):void;
        }
    }
}