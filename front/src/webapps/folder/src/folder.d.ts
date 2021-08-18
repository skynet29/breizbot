declare namespace AppFolder {

    interface Interface {
        removeFiles(fileNames: string[]):Promise;

        mkdir(fileName: string): Promise;
 
        moveFiles(fileNames: string[], destPath: string): Promise;
 
        shareFiles(fileNames: string[], groupName: string): Promise;
 
        copyFiles(fileNames: string[], destPath: string): Promise;
 
        renameFile(filePath: string, oldFileName: string, newFileName: string): Promise;
 
        resizeImage(filePath: string, fileName: string, resizeFormat: string): Promise;
 
        convertToMP3(filePath: string, fileName: string): Promise;
 
        zipFolder(folderPath: string, folderName: string): Promise;
 
        unzipFile(folderPath: string, fileName: string): Promise;
 
        importUrl(folderPath: string, url: string): Promise;
    }
}