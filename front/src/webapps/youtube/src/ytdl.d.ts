declare namespace AppYoutube {

    interface VideoInfo {
        title: string;
        thumbnail: { width: number, height: number };
        description: string;
        length_seconds,
        formats: { qualityLabel: string, itag: string }[];
    }

    interface SearchInfo {
        title: string;
        date: number;
        thumbnail: string;
        id: string;
    }

    declare namespace Controls {
        declare namespace InfoPage {
            interface Props {
                videoId: string;
                videoUrl: string;
                info: VideoInfo;
            }
        }
    }

    declare namespace Services {
        interface Interface {
            info(url: string): Promise<VideoInfo>;
    
            download(url: string, fileName: string, itag: string): Promise;
    
            search(query: string, maxResults: number = 3): Promise<SearchInfo[]>;
        }
    
    }
}