# PowerAuth Test Client for JavaScript

This library provides RESTapi client written in TypeScript that allows you to conenct directly to the [PowerAuth Server's RESTful API](https://github.com/wultra/powerauth-server/blob/develop/docs/WebServices-Methods.md). This is useful for various integration testing purposes for projects that needs to test the functionality against real [PowerAuth Server](https://github.com/wultra/powerauth-server).

<!-- begin box warning -->
This library shold not be used in production application. You usually don't have direct access to PowerAuth Server in production.
<!-- end -->

## Installation

Install the package via `npm` as a development dependency:

```
npm i powerauth-js-test-client -D
``` 

## Configuration

The basic configuration is easy:

```typescript
import { Config, PowerAuthTestServer } from 'powerauth-js-test-client'

async function prepareTestServer(): Promise<PowerAuthTestServer> {
    let server = new PowerAuthTestServer({ connection: { baseUrl: "http://localhost:8080/powerauth-java-server"}})
    await server.connect()
    return server
}
```

For more details, check documentation for `Config` interface. You can also check `tests/config/config.ts` file to see how this library is preparing configuration for its own tests.

## Usage

### `ActivationHelper` class

The `ActivationHelper` class simplifies regular tasks with activation creation. To create a propper instance of this object you need to have implementation that provides PowerAuth mobile SDK functionality. In this example, we'll use our [react-native wrapper](https://github.com/wultra/react-native-powerauth-mobile-sdk) as such provider:

```typescript
import { ActivationHelper, PowerAuthTestServer } from 'powerauth-js-test-client'
import { PowerAuth, PowerAuthActivation } from 'react-native-powerauth-mobile-sdk'

type RNActivationHelper = ActivationHelper<PowerAuth, PowerAuthCreateActivationResult>

const PA_SERVER_URL = "http://localhost:8080/powerauth-java-server"
const PA_ENROLLMENT = "http://localhost:8080/enrollment-server"

/**
 * Function create instnace of activation helper typed with RN wrapper objects.
 */
async function getActivationHelper(): Promise<RNActivationHelper> {
    let cfg = { connection: { baseUrl: PA_SERVER_URL}}
    let helper = await ActivationHelper.createWithConfig<PowerAuth>(cfg)
    helper.createSdk = async (appSetup, prepareData) => {
        // Prepare instanceId. We're using custom data in prepare interface to keep instance id.
        let instanceId = prepareData?.customData?.get('instanceId') ?? 'your-app-instance-id'
        let sdk = new PowerAuth(instanceId)
        if (sdk.isConfigured()) {
            await sdk.deconfigure() // depending on whether you expect config changes
        }
        let unsecure = PA_ENROLLMENT.startsWith('http://')
        await sdk.configure(appSetup.appKey, appSetup.appSecret, appSetup.masterServerPublicKey, PA_ENROLLMENT, unsecure)
        return sdk
    }
    helper.prepareStep = async (helper, activation, prepareData) => {
        if (prepareData == undefined) throw new Error('Missing prepare data object')
        if (prepareData.password == undefined) throw new Error('Missing password in prepare data object')
        let sdk = helper.getPowerAuthSdk()
        let deviceName = 'Test device'
        let activationData = PowerAuthActivation.createWithActivationCode(activation.activationCode!, deviceName)
        // Create activation
        let result = await sdk.createActivation(activationData)
        // Commit activation locally
        let auth = new PowerAuthAuthentication()
        auth.usePossession = true
        auth.userPassword = prepareData.password
        auth.useBiometry = prepareData.useBiometry ?? false
        if (auth.useBiometry) {
            auth.biometryMessage = "Enable biometry"
        }
        await sdk.commitActivation(auth)
        return result
    }
    return helper
}

/**
 * Function prepare activation to active state.
 */
async function prepareActivationWithHelper(prepareData: ActivationHelperPrepareData): Promise<RNActivationHelper> {
    let helper = await createActivationHelper(config, prepareData)
    await helper.createActivation(helper.userId, prepareData)
    return helper
}
```

Once the activation helper is created, then you can use it in tests. For example:

```typescript
describe('Manage PowerAuth applications', () => {

    var activationHelper: RNActivationHelper

    beforeEach(async () => {
        activationHelper = await prepareActivationWithHelper({ password: "1234" })
    })

    afterEach(async () => {
        await activationHelper?.cleanup()
    })

    test('Test activation block and unblock', async () => {
        await activationHelper.blockActivation('TEST-REASON')
        let status = await activationHelper.getActivationStatus()
        expect(status).toBe(ActivationStatus.BLOCKED)
    })
})
```

### `PowerAuthTestServer` class

The `PowerAuthTestServer` class provides subset of PowerAuth Server RESTful API that allows you to manupulate activations. You can construct this object on your own, or simply use `activationHelper.server` property to access helper's own instance. You can check documentation for this class for more details.

## License

All sources are licensed using Apache 2.0 license, you can use them with no restriction. If you are using PowerAuth 2.0, please let us know. We will be happy to share and promote your project.

## Contact

If you need any assistance, do not hesitate to drop us a line at [hello@wultra.com](mailto:hello@wultra.com).

### Security Disclosure

If you believe you have identified a security vulnerability with PowerAuth, you should report it as soon as possible via email to [support@wultra.com](mailto:support@wultra.com). Please do not post it to a public issue tracker.