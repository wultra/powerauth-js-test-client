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

import fs from 'fs/promises'
import path from 'path'
import {
    Config,
    DEFAULT_APPLICATION_NAME,
    DEFAULT_APPLICATION_VERSION_NAME,
    DEFAULT_EXTERNAL_USER_ID,
    DEFAULT_USER_ID,
    DEFAULT_USER_ID_ALT,
    Logger } from "../../src/index"

const ID_SUFFIX = '_libTests'

export const DEFAULT_CONFIG_TO_LOCALHOST: Config = {
    connection: {
        baseUrl: "http://localhost:8080/powerauth-java-server",
    },
    application: {
        applicationName: DEFAULT_APPLICATION_NAME + ID_SUFFIX,
        applicationVersion: DEFAULT_APPLICATION_VERSION_NAME + ID_SUFFIX
    },
    testUser: {
        userId: DEFAULT_USER_ID + ID_SUFFIX,
        alternateUserId: DEFAULT_USER_ID_ALT + ID_SUFFIX,
        externalUserId: DEFAULT_EXTERNAL_USER_ID + ID_SUFFIX
    }
}

export async function testServerConfiguration(): Promise<Config> {
    try {
        // test config file
        const configFile = 'test-config.json'
        const configPath = path.resolve(__dirname, `./${configFile}`)
        const configData = await fs.readFile(configPath, 'utf-8')
        const config = JSON.parse(configData) as Config
        if (config.connection != undefined && config.connection.baseUrl != undefined) {
            return config
        }
    } catch (error) {
        if (error instanceof Error) {
            // Config is optional, so `ENOENT - No such file or directory` error should be ignored.
            if (error.name != "ENOENT") {
                Logger.exception(error)
            }
        }
    }
    return DEFAULT_CONFIG_TO_LOCALHOST
}
