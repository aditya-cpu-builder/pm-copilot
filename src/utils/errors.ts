export class AppError extends Error {
    constructor(
        public contextStr: string,
        public category: string,
        public isRetriable: boolean,
        public howToFix: string,
        message: string
    ) {
        super(message);
        this.name = 'AppError';
    }
}
