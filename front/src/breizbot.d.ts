
declare namespace Breizbot {

    declare namespace Services {


        declare namespace Radar {

            interface RadarInfo {
                location: {type: 'Point', coordinates: [longitude: number, latitude: number]};
                type: string;
                speed: number
                equipement: string
                departement: string
                route: string
            }

            interface Interface {
                getRadar(): Promise<RadarInfo[]>;
            }
        }

        declare namespace Playlists {

            interface FileInfo {
                fileName: string;
                friendUser: string;
                rootDir: string;
            }
        
            interface PlaylistInfo {
                fileInfo: FileInfo;
                mp3: Breizbot.Services.Files.Mp3Info;
            }            

            interface Interface {
                getPlaylist():Promise<string[]>;
    
                getPlaylistSongs(name):Promise<PlaylistInfo[]>;
            }
        }

        declare namespace Spotify {

            interface SearchInfo {
                id: string;
                name: string;
                preview_url: string;
                artists: Array<{name: string, id: string}>
            }
    
            interface FeaturesInfo {
                tempo: number;
            }
    
            interface Interface {
                searchTracks(query: string):Promise<SearchInfo>;
                getAudioFeaturesForTrack(trackId: string): Promise<FeaturesInfo>;
            }
        }

        declare namespace BeatDetector {

            interface BeatInfo {
                tempo: number;
                bpm: number;
                offset: number;
            }
            
            interface Interface {
                computeBeatDetection(audioBuffer: AudioBuffer): Promise<BeatInfo>;
            }
        }        

        declare namespace Gamepad {
            type EventName = 'connected' | 'disconnected' | 'buttonUp' | 'buttonDown' | 'axe'

            interface Info {
                index: number;
                id: string;
                axes: Array<number>;
                buttons: Array<{presses: boolean}>;
            }

            interface Interface {
                on(event: EventName, callback: (ev: Info) => void): void;
                getGamepads(): Array<Info>;
                checkGamePadStatus():void;
                getButtonState(buttonId: number):boolean;
                getAxeValue(axeId: number):number;
        
            }
        }

        declare namespace Display {

            type EventName = 'availability' | 'connectionavailable' | 'ready' | 'close' | 'playing' | 'paused';

            interface Interface {
                on(event: EventName, callback: (data: any) => void): void;
                start(): Promise<void>;
                close();
                setUrl(url: String): void;
                setVolume(volume: number): void;
                setCurrentTime(currentTime: number): void;
                isStarted(): boolean;
                play(): void;
                pause(): void;
                enableKaraoke(enabled: boolean): void;

            }
        }

        declare namespace BlocklyInterpretor {

            interface Block {
                fields?: {[name: string]: any};
                inputs?: {[name: string]: any};
                type: string;
                next?: Block;
                extraState?: {[name: string]: any};
            }

            interface VariableDef {
                id: string;
                name: string;
            }

            interface CodeDef {
                variables: Array<VariableDef>;
                blocks: {blocks: Array<Block>};
            }

            interface Interface {
                startCode(codeDef: CodeDef):Promise<void>;
                setLlogFunction(fn: (text: string) => void);
                evalCode(block: Block): Promise<aby>;
                dumpVariables(): void;
                addBlockType(typeName: string, fn: (block: Block) => Promise<any>);
                getVarValue(varId: string): any;
                getVarName(varId: string): string;
            }
        }

        declare namespace AppData {

            interface Interface {
                getData():any;
                saveData(data):Promise<void>; 
            }
        }

        declare namespace Broker {

            interface Msg {
                time: number;
                type: string;
                topic: string;
                data: any;
                hist: boolean;
            };
    
            interface Interface {
                emitTopic(topicName: string, data: any): void;
                register(topicName: string, callback: (msg: Msg) => void): void;
                unregister(topicName: string, callback: (msg: Msg) => void): void;
                onTopic(topicName: string, callback: (msg: Msg) => void): void;
                offTopic(topicName: string, callback: (msg: Msg) => void): void;               
                on(event: string, callback: (data: any) => void): void;
    
            }

            declare namespace Events {

                interface Friends {
                    isConnected: boolean;
                    userName: string;
                }

                interface FriendPosition {
                    coords: Brainjs.Controls.Map.LatLng;
                    userName: string;
                }

                declare namespace HomeBox {
                    interface Status {
                        connected: boolean;
                    }                    
                }
            }
    
        };
    
        declare namespace Files {
    
            interface Dimension {
                width: number;
                height: number;
            }

            interface Mp3Info {
                title: string;
                artist: string;
                year?: number;
                genre?: string;
                bpm?: number;
                length?: number;
            }
    
            interface FileInfo {
                name: string;
                folder: boolean;
                size?: number;
                isImage?: boolean;
                mtime?: number;
                dimension?: Dimension;
                mp3?: Mp3Info;
            };
    
            interface FileOptions {
                getMP3Info?: boolean;
                getExifInfo?: boolean;
                filterExtension?: string;
                imageOnly?: boolean;
                folderOnly?: boolean;
                filesOnly?: boolean;
                
            };
    
            interface Interface {
                list(path: string, options: FileOptions, friendUser?: string): Promise<FileInfo[]>;
                fileInfo(filePath: string, friendUser?: string, options?: FileOptions): Promise<FileInfo>;
                fileUrl(fileName: string, friendUser?: string): string;
                fileThumbnailUrl(fileName: string, size: string, friendUser?: string): string;
                fileAppUrl(fileName: string): string;
                fileAppThumbnailUrl(fileName: string, size: string): string;
                uploadFile(blob: Blob, saveAsfileName: string, destPath: string, checkExists: boolean, onUploadProgress: (percentComplete: number) => void): Promise<void>;
                saveFile(blob: Blob, saveAsfileName: string, options?: {checkExists?: boolean, destPath?: string}): Promise<boolean>;
                assetsUrl(fileName: string): string;
                move(fileName: string, destPath: string):Promise<void>;
            }
    
    
        };
    
        declare namespace Http {
    
            interface Interface extends Brainjs.Services.Http.Interface {
            }
    
    
    
        };
    
        declare namespace Pager {
    
            interface ButtonOptions {
                title: string;
                icon: string;
                onClick: () => void;
            };
    
            interface PagerOptions {
                title: string;
                props?: {};
                onReturn?: (data: any) => void;
                onBack?: () => void;
                buttons?: { [buttonName]: ButtonOptions };
                events?: { [eventName]: (ev: JQuery.TriggeredEvent, ...data) => void};
            }
    
            interface Interface {
                popPage(data: any): void;
                pushPage(ctrlName: string, options: PagerOptions): any;
    
                setButtonVisible(buttonsVisible: { [buttonName]: boolean } | boolean): void;
                setButtonEnabled(buttonsEnabled: { [buttonName]: boolean } | boolean): void;
            }
    
        };
    
        declare namespace RTC {
    
            type EventName = 'ready' | 'accept' | 'bye' | 'status' | 'call' | 'cancel';
    
            interface Interface {
                call(to: string, appName: string, iconCls: string): Promise<void>;
                cancel(updateStatus: boolean = true): Promise<void>;
                accept(): Promise<void>;
                deny(): Promise<void>;
                bye(): Promise<void>;
                sendData(type: string, data: any): Promise<void>;
                onData(type: string, callback: (data, time) => void): void;
                processCall(): void;
                on(eventName: EventName, callback: () => void): void;
                getRemoteClientId(): number;
                isCallee(): boolean;
                exit(): Promise<void>;
            }
        }
    
        declare namespace Scheduler {
    
            interface Interface {
                openApp(appName: string, appParams: any, newTabTitle?: string): void;
                logout(): Promise<void>;
            }
        }
    
        declare namespace Notif {
    
            interface NotifDesc {
                text?: string;
                type?: string;
                reply?: boolean;
            }
    
            interface NotifInfo {
                from: string;
                date: number;
                notif: NotifDesc;
            }
    
            interface Interface {
                sendNotif(to: string, notif: NotifDesc):Promise<void>;
                removeNotif(notifId: string):Promise<void>;
                getNotifs():Promise<NotifInfo[]>;
                getNotifCount():Promise<number>
            }
        }
    
        declare namespace Contact {
    
            type GenderType = 'male' | 'female';
    
            interface ContactInfo {
                gender?: GenderType;
                birthday?: string;
                birthdayNotif?: boolean;
                email: string;
                name: string;
                mobilePhone?: string;
                phone?: string;
                address?: string;
                city?: string;
                postalCode?: string;
            };
    
            interface Interface {
                addContact(info: ContactInfo):Promise
                getContacts():Promise<ContactInfo[]>
                removeContact(contactId: string):Promise
                updateContactInfo(contactId: string, info: ContactInfo): Promise
            }
        }
    
        declare namespace Geoloc {
            interface Interface {
                startWatch(): void;
            }
        }
    
        declare namespace User {
    
            interface UserSettings {
                birthdayScheduleTime: string;
                autoImageResizing: boolean;            
            }
    
            interface UserCreateInfo {
                username: string;
                pseudo: string;
                location: string;
                email: string;
            }
    
            interface UserInfo extends UserCreateInfo {
                apps: string[];
                createDate: number;
                lastLoginDate: number;
            }
    
            interface AdminInterface {
                list():Promise<UserInfo[]>;
                add(data: UserCreateInfo):Promise<void>;
                remove(user: string):Promise<void>;
                update(user: string, data: UserInfo):Promise<void>;
                get(user: string):Promise<UserInfo>;
            }
    
            interface Interface {
                activateApp(appName: string, activated: boolean):Promise<void>;
                changePwd(newPwd: string):Promise<void>;
                getUserSettings():Promise<UserSettings>
                setUserSettings(settings: UserSettings):Promise
                match(match: string):Promise<UserCreateInfo[]>;
    
            }
        }
    
        declare namespace Songs {
            interface Interface {
                generateDb():Promise<void>;
                querySongs(query: string): Promise<void>;
            }
        }
    
        declare namespace Apps {
            interface AppProps {
                iconCls: string;
                colorCls: string;
                title: string;
                description: string;
            }
    
            interface AppInfo {
                activated: boolean;
                name: string;
                props: AppProps;
            }
            
            interface Interface {
                listAll():Promise<AppInfo[]>;
            }
        }
    
        declare namespace Friends {
            interface FriendInfo {
                friend: string;
                groups: string[];
                positionAuth: boolean;
            }

            interface FriendInfo2 {
                friendUserName: string;
                isConnected: boolean;
            }
    
            interface Interface {
                getFriends():Promise<FriendInfo2[]>;
                getFriendInfo(friend: string):Promise<FriendInfo>
                setFriendInfo(friend: string, groups: string[], positionAuth: boolean):Promise
                addFriend(friendUserName):Promise
            }
        }
    
        declare namespace FullScreen {
            interface Interface {
                init(callback: (isFullScreen: boolean) => void): void;
                enter(): void;
                exit(): void;
            }
        }
    
        declare namespace WakeLock {
            interface Interface {
                requestWakeLock(): Promise<void>;
            }
        }

        declare namespace City {

            interface CityCoordinates {
                lon: number;
                lat: number;
            }

            interface CityInfo {
                country: string;
                name: string;
                coord: CityCoordinates;
            }

            interface Interface {
                getCountries(): Promise<string[]>;
                getCities(country: string, search: string): Promise<CityInfo[]>;
                getCitesFromPostalCode(postalCode: string): Promise<string[]>;
            }
        }
    }


    declare namespace Controls {

        declare namespace Editor {
            declare interface Interface {
                html(htmlString?: string): string;       
                load (url: string, cbk?: () => void): void;       
                getValue(): string;        
                setValue(value: string): void;        
                focus():void;
                isEditable():boolean;
                addLink(cbk :() => Promise<string> | Promise<string>):void;
            }
        }

        declare namespace Contacts {

            type Events = "contactcontextmenu";
    
            interface Props {
                hasSearchbar: boolean;
                showSelection: boolean;
                contextMenu: {[key] : Brainjs.Controls.ContextMenu.Item};
            }
    
        }        

        declare namespace Friends {
            interface Props {
                showSelection?: boolean;
                showSendMessage?: boolean;
                showConnectionState?: boolean;
            }

            type Events = 'friendclick'

            declare namespace EventData {
                interface FriendClick {
                    userName: string;
                }
            }

            interface Interface {
                getSelection(): string;
                getFriends(): string[];
                update(): void;

            }
        }

        declare namespace Viewer {
            interface Props {
                url: string;
                type: 'image' | 'pdf' | 'audio' | 'video' | 'hdoc'
            }
        }

        declare namespace FileList {

            interface Mp3Filter {
                artist?: string;
                genre?: string;
            }

            type Events = 'fileclick' | 'dirchange';

            declare namespace EventData {
                interface DirChange {
                    newDir: string;
                }

                interface FileClick {
                    fileName: string;
                    rootDir:string;
                    isImage: boolean;
                    mp3?: Services.Files.Mp3Info;
                }

            }

            interface Props {
                selectionEnabled?: boolean; // default false
                filterExtension?: string;
                getMP3Info?: boolean;       // default false
                friendUser?: string;
                mp3Filters?: Mp3Filter;
            }


            interface Interface {
                getSelFile(): {name: string, url: string, mp3?: Services.Files.Mp3Info};
                selUp():void;
                selDown():void;
                enterSelFolder():void;
            }
           
        }

        declare namespace FolderTree {

            interface Interface {
                getSelPath(): string;
            }
        }

        declare namespace Files {

            interface Mp3Filter {
                artist?: string;
                genre?: string;
            }

            type Events = 'fileclick' |  'contextmenuItem' | 'selchange' | 'dirchange';

            declare namespace EventData {
                interface DirChange {
                    newDir: string;
                }

                interface ContextMenuItem {
                    cmd: string;
                    idx: number;
                    name: string;
                    rootDir: string;
                }

                interface FileClick {
                    fileName: string;
                    rootDir:string;
                    isImage: boolean;
                    mp3?: Services.Files.Mp3Info;
                }

                interface SelChange {
                    isShareSelected: boolean;
                }
            }

            interface Props {
                selectionEnabled?: boolean; // default false
                folderSelectionEnabled?: boolean; // default true
                imageOnly?: boolean;        // default false
                filterExtension?: string;
                getMP3Info?: boolean;       // default false
                friendUser?: string;
                mp3Filters?: Mp3Filter;
                menuItems?: (data: Services.Files.FileInfo) => {};
            }

            interface FileDesc {
                fileName: string;
                idx: number;
            }

            interface Interface {
                reload();
                updateFile(idx: number, fileInfo: Services.Files.FileInfo): void;
                insertFile(fileInfo: Services.Files.FileInfo, idx?: number): void;
                removeFiles(fileIdx: number[]): void;
                setMP3Filters(mp3Filter: Mp3Filter);
                getMP3Filters(): Mp3Filter;
                getFiles(): Services.Files.FileInfo[];
                getFilteredFiles(): Services.Files.FileInfo[];
                updateFileInfo(fileName: string, options: Services.Files.FileOptions):Promise<void>;
                getSelFiles(): FileDesc[]
                getSelFileNames() :string[];
                getNbSelFiles(): number;
                toggleSelection(): void;
                getRootDir(): string; 
            }
           
        }
    }



}

type NotifyType = 'success' | 'error'

interface JQueryStatic {
    notify(text: string, type: NotifyType): void;
}

interface EventEmitter2 {
    on(evtName: string, cbk: () => void): void;
}