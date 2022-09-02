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

import { ServerVersion } from "./Version"

export interface ConnectionConfig {
    /**
     * URL to PowerAuth Server RESTful API.
     */
    readonly baseUrl: string
    /**
     * Expdected server version. If not provided, then you don't care about server's version. 
     */
    readonly serverVersion?: ServerVersion | undefined
    /**
     * Optional username if server require basic authentication.
     */
    readonly username?: string | undefined
    /**
     * Optional Password if server require basic authentication.
     */
    readonly password?: string | undefined
    /**
     * If true, then enrollment automatically commit the activation. If `undefined` is specified, then the behavior is determined in the runtime.
     */
    readonly autoCommit?: boolean | undefined
    /**
     * Timeout for HTTP request completion in milliseconds.
     */
    readonly requestTimeout: number
}

export interface ApplicationConfig {
    applicationName: string
    applicationVersion?: string | undefined
}

/**
 * Configuration for `PowerAuthTestServer`.
 */
export interface Config {
    connection: ConnectionConfig
    application?: ApplicationConfig | undefined
}

// Default values

export const DEFAULT_APPLICATION_NAME = "PowerAuthJsTestClient-Application"
export const DEFAULT_APPLICATION_VERSION_NAME = "default"
export const DEFAULT_EXTERNAL_USER_ID = "PowerAuthJsTestClient-ExternalUser"
export const DEFAULT_REQUEST_TIMEOUT = 4000 // should be less than 5000 (jest's timeout for test execution)