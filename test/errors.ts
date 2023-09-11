import { describe, it, expect } from "@jest/globals";
import { AuthError, ConnectionError, NotConnectedError } from "../src/errors";
import Client from "../src/index";

describe("Error constructors", () => {
    it("AuthError", () => {
        const authError = new AuthError();
        expect(authError.name).toBe("AuthError");
        expect(authError.message).toBe("");

        const authError2 = new AuthError("test 1 2 3", { cause: "something" });
        expect(authError2.message).toBe("test 1 2 3");
        expect(authError2.cause).toBe("something");
    });

    it("ConnectionError", () => {
        const connectionError = new ConnectionError();
        expect(connectionError.name).toBe("ConnectionError");
        expect(connectionError.message).toBe("Socket.io connection error. Do the server and client version match? Did you enter the right server details? Is the server running?");

        const connectionError2 = new ConnectionError("test 1 2 3", { cause: "something" });
        expect(connectionError2.message).toBe("test 1 2 3");
        expect(connectionError2.cause).toBe("something");
    });

    it("NotConnectedError", () => {
        const notConnectedError = new NotConnectedError();
        expect(notConnectedError.name).toBe("NotConnectedError");
        expect(notConnectedError.message).toBe("Not connected to a server! Connect to one first before using any other functions.");

        const notConnectedError2 = new NotConnectedError("test 1 2 3", { cause: "something" });
        expect(notConnectedError2.message).toBe("test 1 2 3");
        expect(notConnectedError2.cause).toBe("something");
    });
});

describe("Error throwing", () => {
    it("should throw a NotConnectedError", () => {
        const client = new Client("TestBot");

        expect( () => client.name = "fuck" ).toThrow(NotConnectedError);
        expect( () => client.ID ).toThrow(NotConnectedError);
        expect( () => void client.sendMessage("a") ).toThrow(NotConnectedError);
        expect( () => void client.adminAction("a") ).toThrow(NotConnectedError);
    });
});