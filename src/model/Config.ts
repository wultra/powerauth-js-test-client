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

/**
 * Connection configuration defines information about how to connect to PowerAuth Server RESTful API.
 */
export interface ConnectionConfig {
    /**
     * URL to PowerAuth Server RESTful API.
     */
    readonly baseUrl: string
    /**
     * Expdected server version. If not provided, then you don't care about server's version. 
     */
    readonly serverVersion?: ServerVersion
    /**
     * Optional username if server require basic authentication.
     */
    readonly username?: string
    /**
     * Optional Password if server require basic authentication.
     */
    readonly password?: string
    /**
     * If true, then enrollment automatically commit the activation. If `undefined` is specified, then the behavior is determined in the runtime.
     */
    readonly autoCommit?: boolean
    /**
     * Timeout for HTTP request completion in milliseconds. The default value is 4000 (4 seconds)
     */
    readonly requestTimeout?: number
}

/**
 * PowerAuth application configuration that will be used in tests.
 */
export interface ApplicationConfig {
    /**
     * Application name used for testing. If not specified, then `"PowerAuthJsTestClient-Application"` constant is used.
     */
    applicationName?: string
    /**
     * Application version name for testing. If not specified, then `"default"` constant is used.
     */
    applicationVersion?: string
    /**
     * Define whether recovery codes must be enabled for specified application. If not specified, then
     * tests doesn't require recovery codes.
     */
    enableRecoveryCodes?: boolean
}

/**
 * Configuration for users
 */
export interface TestUserConfig {
    /**
     * User identifier for activation-related tests.
     */
    userId: string

    /**
     * Optional alternate user identifier.
     */
    alternateUserId?: string

    /**
     * Optional identifier of external user.
     */
    externalUserId?: string
}

/**
 * Configuration for `PowerAuthTestServer`.
 */
export interface Config {
    /**
     * Connection configuration.
     */
    connection: ConnectionConfig
    /**
     * Optional application configuration.
     */
    application?: ApplicationConfig

    /**
     * Optional user configuration for activation tests.
     */
    testUser?: TestUserConfig
}

// Default values

export const DEFAULT_APPLICATION_NAME = "PowerAuthJsTestClient-Application"
export const DEFAULT_APPLICATION_VERSION_NAME = "default"
export const DEFAULT_USER_ID = "PowerAuthJsTestClient-User"
export const DEFAULT_USER_ID_ALT = "PowerAuthJsTestClient-UserAlt"
export const DEFAULT_EXTERNAL_USER_ID = "PowerAuthJsTestClient-ExternalUser"
export const DEFAULT_MAX_FAILED_ATTEMPTS = 5
export const DEFAULT_REQUEST_TIMEOUT = 4000 // should be less than 5000 (jest's timeout for test execution)