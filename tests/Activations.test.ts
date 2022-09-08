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
import { ActivationHelper, ActivationHelperPrepareData, ActivationStatus, Config, Logger, PowerAuthTestServer } from "../src/index";
import { CreateActivationData, MiniMobileClient } from "./crypto/MiniMobileClient";
import { createActivationHelper } from "./config/helpers";


let activationPayload: CreateActivationData = {
    activationName: 'activation-test',
    platform: 'nodejs',
    deviceInfo: 'nodejs-tests',
    extras: 'some-extras'
}
let preapreData: ActivationHelperPrepareData = {
    customData: new Map<string, any>()
}
preapreData.customData!.set('activationPayload', activationPayload)

describe('Manage PowerAuth applications', () => {

    var cfg: Config
    var activationHelper: ActivationHelper<MiniMobileClient, boolean>
    var server: PowerAuthTestServer

    beforeAll(async () => {
        cfg = await testServerConfiguration()
    })

    beforeEach(async () => {
        activationHelper = await createActivationHelper(cfg, preapreData)
        server = activationHelper.server
    })

    afterEach(async () => {
        await activationHelper?.cleanup()
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

    test('Test activation block and unblock', async () => {
        await activationHelper.createActivation()
        await activationHelper.blockActivation('TEST-REASON')
        let detail = await activationHelper.getActivationDetail()
        expect(detail.activationStatus).toBe(ActivationStatus.BLOCKED)
        expect(detail.blockedReason).toEqual('TEST-REASON')
        await activationHelper.unblockActivation()
        let status = await activationHelper.getActivationStatus()
        expect(status).toBe(ActivationStatus.ACTIVE)
    })

    test('Test activation remove', async () => {
        await activationHelper.createActivation()
        await activationHelper.removeActivation()
        let detail = await activationHelper.getActivationDetail()
        expect(detail.activationStatus).toBe(ActivationStatus.REMOVED)
    })
})
