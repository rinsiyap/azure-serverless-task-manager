const PROJECT_ID = "taskflow-auth-rinsiya";

let joseModule;

async function getJose() {
    if (!joseModule) {
        joseModule = import("jose");
    }

    return joseModule;
}

async function verifyFirebaseToken(request) {
    const authorization = request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return null;
    }

    const token = authorization.slice(7).trim();

    if (!token) {
        return null;
    }

    try {
        const { createRemoteJWKSet, jwtVerify } = await getJose();

        const jwks = createRemoteJWKSet(
            new URL(
                "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
            )
        );

        const { payload } = await jwtVerify(token, jwks, {
            issuer: `https://securetoken.google.com/${PROJECT_ID}`,
            audience: PROJECT_ID,
            algorithms: ["RS256"]
        });

        if (!payload.sub || typeof payload.sub !== "string") {
            return null;
        }

        return {
            uid: payload.sub,
            email: payload.email || null
        };
    } catch (error) {
        console.warn("Firebase token verification failed:", error.code || error.message);
        return null;
    }
}

function withFirebaseAuth(handler) {
    return async (request, context) => {
        const user = await verifyFirebaseToken(request);

        if (!user) {
            return {
                status: 401,
                jsonBody: {
                    error: "Unauthorized. Please sign in with Google."
                }
            };
        }

        request.authUser = user;

        return handler(request, context);
    };
}

module.exports = {
    verifyFirebaseToken,
    withFirebaseAuth
};
