import jwt from "jsonwebtoken";

// Usage: node privateKeyToPAT.js <base 64 encoded contents of the private key.pem file>
const privateKeyBase64 = process.argv[2];
const appId = "809549";
const installationId = "46654931";

// Step 1: Generate a JWT
const privateKey = Buffer.from(privateKeyBase64, "base64").toString();
const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes
    iss: appId,
};
const token = jwt.sign(payload, privateKey, { algorithm: "RS256" });

// Step 2: Exchange JWT for an Access Token (PAT)
const githubApiUrl = `https://api.github.com/app/installations/${installationId}/access_tokens`;

fetch(githubApiUrl, {
    method : "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        Accept       : "application/vnd.github.v3+json",
    },
})
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to retrieve access token: ${response.status} ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(`PAT=${data.token}`);
    })
    .catch(error => {
        console.error("Error:", error);
        process.exit(1);
    });