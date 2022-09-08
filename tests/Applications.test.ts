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
import { Config, PowerAuthTestServer } from "../src";


describe('Manage PowerAuth applications', () => {

    let cfg: Config

    beforeAll(async () => {
        cfg = await testServerConfiguration()
    })

    test('Basic connection should work', async () => {
        const server = new PowerAuthTestServer(cfg)
        const result = await server.testConnection()
        expect(result).toBe(true)
    })

    test('Create default application from default Config', async () => {
        const server = new PowerAuthTestServer(cfg)
        await server.connect()
        const appSetup = await server.prepareApplicationFromConfiguration()
        expect(appSetup).toBeDefined()
    })

    test('Find unknown application', async () => {
        const server = new PowerAuthTestServer(cfg)
        await server.connect()
        const application = await server.findApplicationByName("ApplicationNameThatShouldNotExist")
        expect(application).toBeUndefined()
    })

    test('Find known application', async () => {
        const server = new PowerAuthTestServer(cfg)
        await server.connect()
        let appList = await server.getApplicationList()
        if (appList.length == 0) {
            await server.prepareApplicationFromConfiguration()
            appList = await server.getApplicationList()
            expect(appList.length).toBeGreaterThan(0)
        }
        // find first and last app
        let app = await server.findApplicationByName(appList[0].applicationName)
        expect(app).toBeDefined()
        expect(app?.applicationName).toEqual(appList[0].applicationName)
        app = await server.findApplicationByName(appList[appList.length - 1].applicationName)
        expect(app).toBeDefined()
        expect(app?.applicationName).toEqual(appList[appList.length - 1].applicationName)
    })

    test('Find unknown application version', async () => {
        const server = new PowerAuthTestServer(cfg)
        await server.connect()
        const appSetup = await server.prepareApplicationFromConfiguration()
        const version = server.findApplicationVersionByName(appSetup.applicationDetail, "ApplicationVersionThatShouldNotExist")
        expect(version).toBeUndefined()
    })

    test('Find known application version', async () => {
        const server = new PowerAuthTestServer(cfg)
        await server.connect()
        const appSetup = await server.prepareApplicationFromConfiguration()

        appSetup.applicationDetail.versions.forEach(it => {
            const versionName = it.applicationVersionId.objectName
            const result = server.findApplicationVersionByName(appSetup.applicationDetail, versionName)
            expect(result).toBeDefined()
            expect(result?.applicationVersionId.objectName).toEqual(versionName)
        })
    })

    test('Support application version', async () => {
        const server = new PowerAuthTestServer(cfg)
        await server.connect()
        const appSetup = await server.prepareApplicationFromConfiguration()
        expect(appSetup.applicationVersion.supported).toBe(true)
        await server.setAppplicationVersionSupported(appSetup.applicationVersion, false)
        await server.setAppplicationVersionSupported(appSetup.applicationVersion, true)
    })
})
