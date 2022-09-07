//
// Copyright 2022 Wultra s.r.o.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { testServerConfiguration } from "./config/config";
import { ActivationHelper, ActivationStatus, ApplicationSetup, Config, Logger, PowerAuthTestServer } from "../src/index";
import { CreateActivationData, FakeMobileClient } from "./helpers/FakeMobileClient";

describe('Manage PowerAuth applications', () => {

    let activationPayload: CreateActivationData = {
        activationName: 'activation-test',
        platform: 'nodejs',
        deviceInfo: 'nodejs-tests',
        extras: 'some-extras'
    }

    var cfg: Config
    var activationHelper: ActivationHelper
    var client: FakeMobileClient
    var server: PowerAuthTestServer

    beforeAll(async () => {
        cfg = await testServerConfiguration()
    })

    beforeEach(async () => {
        activationHelper = await ActivationHelper.createWithConfig(cfg, async (helper, activation, otp) => {
            // Encrypt inner activation data with fake mobile client
            let encryptedPayload = client.createActivation({...activationPayload, activationOtp: otp})
            // Prepare activation on the server
            let response = await helper.server.activationPrepare({
                activationCode: activation.activationCode!,
                applicationKey: helper.appSetup.appKey,
                ephemeralPublicKey: encryptedPayload.key!,
                encryptedData: encryptedPayload.body!,
                mac: encryptedPayload.mac!,
                nonce: encryptedPayload.nonce!
            })
            expect(response).toBeDefined()
            // Commit activation on the client
            client.commitActivation(response)
        })
        server = activationHelper.server
        client = new FakeMobileClient(activationHelper.appSetup)
    })

    afterEach(async () => {
        await activationHelper.cleanup()
    })

    test('Test create activation with activation code ', async () => {
        let activation = await activationHelper.initActivation()
        var status = await activationHelper.getActivationStatus()
        Logger.info(`Status = ${status}`)
        expect(activation.activationCode).toBeDefined()
        expect(status).toBe(ActivationStatus.CREATED)
        // 
        await activationHelper.prepareActivation()
        status = await activationHelper.getActivationStatus()
        expect(status).toBe(ActivationStatus.PENDING_COMMIT)

        await activationHelper.commitActivation()
        status = await activationHelper.getActivationStatus()
        expect(status).toBe(ActivationStatus.ACTIVE)
    })

    test('Test automatic activation create ', async () => {
        let activation = await activationHelper.createActivation()
        var status = await activationHelper.getActivationStatus()
        expect(status).toBe(ActivationStatus.ACTIVE)
    })
})
