# Tests configuration

This folder may contain optional `test-config.json` file with custom configuration applied to `jest` tests. Check [`src/model/Config.ts`](../../src/model/Config.ts) file for the configuration specification.

Example of configuration file:

```json
{
    "connection": {
        "baseUrl": "http://localhost:8080/powerauth-java-server",
        "username": "api-user",
        "password": "api-password"
    },
    "application": {
        "applicationName": "PowerAuthJsTestClient-Application",
        "applicationVersion": "default-application"
    }
}
```