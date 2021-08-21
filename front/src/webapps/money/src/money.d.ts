declare namespace AppMoney {

    interface AccountSynthesis {
        income: number;
        expenses: number;
        categories: { [name: string]: number };
    }

    interface AccountInfo {
        name: string;
        currency: string;
        finalBalance: number;
        initialBalance: number;
        heldAt: string;
        synthesis?: AccountSynthesis;
    }

    interface TransactionInfo {
        date: Date;
        clearedStatus: 'X' | 'P' | '';
        meno: string;
        amount: number;
        number: number;
        payee: string;
        category: string;
        subcategory: string;
    }

    interface FilterOptions {
        year: number;
        month: number;
        category: string;
        subcategory?: string;
    }

    interface LastStatementInfo {
        finalBalance: number;
        initialBalance: number;
    }

    interface Interface {
        getGlobalSynthesis(): Promise<AccountSynthesis>;

        addAccount(info: AccountInfo): Promise;
        removeAccount(accountId: string): Promise;
        getAccounts(withSynthesis: boolean): Promise<AccountInfo[]>;

        getUnclearedTransactions(accountId: string): Promise<TransactionInfo[]>;
        getOldestYearTransaction(accountId: string): Promise<number>;
        getSyntheses(accountId: string, year: number): Promise<AccountSynthesis>;
        getTransactions(accountId: string, offset: number): Promise<TransactionInfo[]>;
        getFilteredTransactions(accountId: string, filters: FilterOptions): Promise<TransactionInfo[]>;
        getNotPassedNumber(accountId: string): Promise<number>

        getCategories(accountId: string): Promise<string[]>;
        getSubcategories(accountId: string, category: string): Promise<string[]>;
        getPayees(accountId: string): Promise<string[]>;
        getLastNumber(accountId: string): Promise<number>;

        addTransaction(accountId: string, info: TransactionInfo): Promise;
        updateTransaction(accountId: string, transactionId: string, info: TransactionInfo): Promise;
        removeTransaction(accountId: string, transactionId: string, amount: number): Promise;
        importTransactions(accountId: string, fileName: string): Promise;

        addRecurringTransactions(accountId: string, info: TransactionInfo): Promise;
        updateRecurringTransaction(accountId: string, transactionId: string, info: TransactionInfo): Promise;
        removeRecurringTransaction(transactionId: string): Promise;


        ignoreNextOccurence(accountId: string, transactionId: string): Promise;
        enterNextOccurence(accountId: string, transactionId: string): Promise;
        enterAllOccurenceOfCurrentMonth(accountId: string): Promise;

        getLastStatementInfo(accountId: string): Promise<LastStatementInfo>;
        updateLastStatementInfo(accountId: string, info: LastStatementInfo): Promise;
    }

}