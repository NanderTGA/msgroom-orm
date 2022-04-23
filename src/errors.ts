export class AuthError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message);
        this.name = "AuthError";
        if (options) {
            Object.assign(this, options);
        }
    }
}

export class ConnectionError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message);
        this.name = "ConnectionError";
        if (options) {
            Object.assign(this, options);
        }
    }
}