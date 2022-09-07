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
import { ApplicationWithVersion, Config, Logger, PowerAuthTestServer } from "../src/index";

describe('Manage PowerAuth applications', () => {

    var cfg: Config
    var server: PowerAuthTestServer
    var app: ApplicationWithVersion

    beforeAll(async () => {
        cfg = await testServerConfiguration()
        server = new PowerAuthTestServer(cfg)
        await server.connect()
        app = await server.prepareApplicationFromConfiguration()
    })

    test('Get recovery config', async () => {
        let config = await server.getRecoveryConfig(app.application)
        expect(config.applicationId).toEqual(app.application.applicationId)
    })

    test('Alter recovery config', async () => {
        let config = await server.getRecoveryConfig(app.application)
        expect(config.applicationId).toEqual(app.application.applicationId)
        // Keep original value
        let rcEnabled = config.activationRecoveryEnabled

        // Update config to opposite value
        config.activationRecoveryEnabled = !rcEnabled
        var updated = await server.updateRecoveryConfig(config)
        expect(updated).toBe(true)

        // Validate change with get
        var rcAfterUpdate = await server.getRecoveryConfig(app.application)
        expect(rcAfterUpdate.activationRecoveryEnabled).toEqual(!rcEnabled)

        // Set back to original value
        config.activationRecoveryEnabled = rcEnabled
        updated = await server.updateRecoveryConfig(config)
        expect(updated).toBe(true)

        // Validate change with get
        rcAfterUpdate = await server.getRecoveryConfig(app.application)
        expect(rcAfterUpdate.activationRecoveryEnabled).toEqual(rcEnabled)
    })
})
