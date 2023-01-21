declare namespace AppJukebox {

    interface FileInfo {
        fileName: string;
        friendUser: string;
        rootDir: string;
    }

    interface PlaylistInfo {
        fileInfo: FileInfo;
        mp3: Breizbot.Services.Files.Mp3Info;
        status: 'ok' | 'ko';
    }

    interface PlayerInfo {
        fileName: string;
        rootDir: string;
        friendUser: string;
        mp3: Breizbot.Services.Files.Mp3Info;
    }

    interface Interface {
        getPlaylist(): Promise<string[]>;
        getPlaylistSongs(name: string): Promise<PlaylistInfo[]>;

        swapSongIndex(id1: string, id2: string):Promise;

        removePlaylist(name: string): Promise;

        removeSong(songId: string): Promise;

        addSong(name: string, fileInfo: FileInfo, checkExists: boolean): Promise;

        saveInfo(filePath: string, friendUser: string, tags: Breizbot.Services.Files.Mp3Info): Promise;

    }
}