declare namespace AppYoutube {

    interface Interface {
        info(url: string):Promise;

        download(url: string, fileName: string, itag: string): Promise;

        search(query: string, maxResults: number = 3):Promise;
    }
}