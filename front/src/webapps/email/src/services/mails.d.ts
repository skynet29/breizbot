declare namespace AppEmail {

    interface Interface {
		getMailAccounts():Promise<string[]>;
		getMailAccount(name: string):Promise;
		createMailAccount(data):Promise;
		updateMailAccount(data):Promise;
		getMailboxes(name: string, addUnseenNb: boolean = false):Promise;
		openMailbox(name: string, mailboxName: string, pageNo: number):Promise;
		openMessage(name: string, mailboxName: string, seqNo: number, partID: number):Promise;
		openAttachment(name: string, mailboxName: string, seqNo: number, partID: number):Promise;
		deleteMessage(name: string, mailboxName: string, seqNos: number[]):Promise;
		moveMessage(name:string, mailboxName: string, targetName: string, seqNos: number[]):Promise 
        removeMailAccount(name: string): Promise;
        addMailbox(name: string, mailboxName: string):Promise;
		sendMail(accountName: string, data: any):Promise;
       
    }
}