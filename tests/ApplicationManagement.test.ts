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

import { testServerConfiguration } from "./config";
import { PowerAuthTestServer } from "../src/index";

const cfg = testServerConfiguration()

describe('testing basic connection to localhost server', () => {

    test('connection should succeed', async () => {
        let server = new PowerAuthTestServer(cfg)
        let result = await server.testConnection()
        expect(result).toBe(true)
    })

    test('Create default application from default Config', async () => {
        let server = new PowerAuthTestServer(cfg)
        await server.connect()
        let application = await server.prepareApplicationFromConfiguration()
        expect(application).toBeDefined()
    })

    test('Find unknown application', async () => {
        let server = new PowerAuthTestServer(cfg)
        await server.connect()
        let application = await server.findApplicationByName("ApplicationNameThatShouldNotExist")
        expect(application).toBeUndefined()
    })

    test('Find known application', async () => {
        let server = new PowerAuthTestServer(cfg)
        await server.connect()
        var appList = await server.getApplicationList()
        if (appList.length == 0) {
            await server.prepareApplicationFromConfiguration()
            appList = await server.getApplicationList()
            expect(appList.length).toBeGreaterThan(0)
        }
        // find first and last app
        var app = await server.findApplicationByName(appList[0].applicationName)
        expect(app).toBeDefined()
        expect(app?.applicationName).toEqual(appList[0].applicationName)
        app = await server.findApplicationByName(appList[appList.length - 1].applicationName)
        expect(app).toBeDefined()
        expect(app?.applicationName).toEqual(appList[appList.length - 1].applicationName)
    })

    test('Find unknown application version', async () => {
        let server = new PowerAuthTestServer(cfg)
        await server.connect()
        let appWithVersion = await server.prepareApplicationFromConfiguration()
        let version = server.findApplicationVersionByName(appWithVersion.application, "ApplicationVersionThatShouldNotExist")
        expect(version).toBeUndefined()
    })

    test('Find known application version', async () => {
        let server = new PowerAuthTestServer(cfg)
        await server.connect()
        let appWithVersion = await server.prepareApplicationFromConfiguration()

        appWithVersion.application.versions.forEach(it => {
            let versionName = it.applicationVersionId.objectName
            let result = server.findApplicationVersionByName(appWithVersion.application, versionName)
            expect(result).toBeDefined()
            expect(result?.applicationVersionId.objectName).toEqual(versionName)
        })
    })

    test('Support application version', async () => {
        let server = new PowerAuthTestServer(cfg)
        await server.connect()
        let appWithVersion = await server.prepareApplicationFromConfiguration()
        expect(appWithVersion.applicationVersion.supported).toBe(true)
        await server.setAppplicationVersionSupported(appWithVersion.applicationVersion, false)
        await server.setAppplicationVersionSupported(appWithVersion.applicationVersion, true)
    })
})
