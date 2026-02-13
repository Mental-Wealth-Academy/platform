export class SecretsError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SecretsError';
    }
}
