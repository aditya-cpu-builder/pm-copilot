export interface SessionState {
    name: string;
    date: string;
    domain: 'payments';
    subdomain: string;
    status: 'active' | 'completed' | 'crashed';
    resourcesFetched: string[];
    keyFindings: string[];
    lastCompletedStep: string;
    outputFile?: string;
}
