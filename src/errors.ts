export class AuthError extends Error {
    cause?: unknown;
    
    constructor(
        message?: string,
        options?: ErrorOptions,
    ) {
        super(message);
        this.name = "AuthError";

        if (options) Object.assign(this, options);
    }
}

export class ConnectionError extends Error {
    cause?: unknown;

    constructor(
        message = "Socket.io connection error. Do the server and client version match? Did you enter the right server details? Is the server running?",
        options?: ErrorOptions,
    ) {
        super(message);
        this.name = "ConnectionError";

        if (options) Object.assign(this, options);
    }
}

export class NotConnectedError extends Error {
    cause?: unknown;
    
    constructor(
        message = "Not connected to a server! Connect to one first before using any other functions.",
        options?: ErrorOptions,
    ) {
        super(message);
        this.name = "NotConnectedError";

        if (options) Object.assign(this, options);
    }
}

export class ImpossibleError extends Error {
    cause?: unknown;
    
    constructor(
        message = "This state is physically impossible, but typescript doesn't understand.",
        options?: ErrorOptions,
    ) {
        super(message);
        this.name = "ImpossibleError";

        if (options) Object.assign(this, options);
    }
}