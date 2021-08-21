declare namespace Breizbot {

    declare namespace Services {

        declare namespace AppData {

            interface Interface {
                getData():any;
                saveData(data):Promise; 
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
            };
    
            interface Interface {
                list(path: string, options: FileOptions, friendUser?: string): Promise<FileInfo[]>;
                fileInfo(filePath: string, friendUser?: string, options?: FileOptions): Promise<FileInfo>;
                fileUrl(fileName: string, friendUser?: string): string;
                fileThumbnailUrl(fileName: string, size: string, friendUser?: string): string;
                fileAppUrl(fileName: string): string;
                fileAppThumbnailUrl(fileName: string, size: string): string;
                uploadFile(blob: Blob, saveAsfileName: string, destPath: string, onUploadProgress: (percentComplete: number) => void): Promise;
                saveFile(blob: Blob, saveAsfileName: string, destPath?: string): Promise;
            }
    
    
        };
    
        declare namespace Http {
    
            interface Interface {
                get(url: string, params?: { [param]: any }): Promise;
    
                fetch(url: string, params?: { [param]: any }): Promise;
    
                post(url: string, params?: { [param]: any }): Promise;
                put(url: string, params?: { [param]: any }): Promise;
                postFormData(url: string, fd: FormData, onUploadProgress: () => void): Promise;
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
                call(to: string, appName: string, iconCls: string): Promise;
                cancel(updateStatus: boolean = true): Promise;
                accept(): Promise;
                deny(): Promise;
                bye(): Promise;
                sendData(type: string, data: any): Promise;
                onData(type: string, callback: (data, time) => void): void;
                processCall(): void;
                on(eventName: EventName, callback: () => void): void;
                getRemoteClientId(): number;
                isCallee(): boolean;
                exit(): Promise;
            }
        }
    
        declare namespace Scheduler {
    
            interface Interface {
                openApp(appName: string, appParams: any): void;
                logout(): Promise;
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
                sendNotif(to: string, notif: NotifDesc):Promise;
                removeNotif(notifId: string):Promise;
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
                add(data: UserCreateInfo):Promise;
                remove(user: string):Promise;
                update(user: string, data: UserInfo):Promise;
                get(user: string):Promise<UserInfo>;
            }
    
            interface Interface {
                activateApp(appName: string, activated: boolean):Promise;
                changePwd(newPwd: string):Promise;
                getUserSettings():Promise<UserSettings>
                setUserSettings(settings: UserSettings):Promise
                match(match: string):Promise<UserCreateInfo[]>;
    
            }
        }
    
        declare namespace Songs {
            interface Interface {
                generateDb():Promise;
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
    
            interface Interface {
                getFriends():Promise<FriendInfo[]>;
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
                requestWakeLock(): Promise;
            }
        }

        declare namespace City {
            interface Interface {
                getCountries(): Promise<string[]>;
                getCities(country: string, search: string): Promise<string[]>;
                getCitesFromPostalCode(postalCode: string): Promise<string[]>;
            }
        }
    }


    declare namespace Controls {

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
                }

                interface SelChange {
                    isShareSelected: boolean;
                }
            }

            interface Props {
                selectionEnabled?: boolean;
                imageOnly?: boolean;
                filterExtension?: string;
                getMP3Info?: boolean;
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
                updateFileInfo(fileName: string, options: Services.Files.FileOptions):Promise;
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