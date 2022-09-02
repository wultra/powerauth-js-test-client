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

import { Application, ApplicationDetail, ApplicationVersion } from "../model/Application"
import { Config } from "../model/Config"
import { SystemStatus } from "../model/SystemStatus"
import { ServerVersion } from "../model/Version"

export interface ServerAPI {

    // Connection & Server version

    /**
     * Contains configuration used to create this API.
     */
    readonly config: Config

    /**
     * Validate's whether server's version is supported by API implementation.
     * @param serverVersion Server version to validate.
     * @returns Version of PowerAuth Server.
     */
    validateServerVersion(serverVersion: string): ServerVersion

    /**
     * Get system status from the server.
     * @param failIfNoOK If `true` then function fail if status is not OK.
     * @returns Promise with SystemStatus received from the server.
     */
    getSystemStatus(failIfNoOK: boolean): Promise<SystemStatus>

    /**
     * Validate connection to the server and return server's version.
     * @returns Promise with Version of PowerAuth Server.
     */
    getServerVersion(): Promise<ServerVersion>


    // Application management

    /**
     * Get list of all applications.
     * @returns Promise with array of applications in result.
     */
    getApplicationList(): Promise<Array<Application>>

    /**
     * Create new application with requested  name.
     * @param applicationName Name of new application.
     * @returns Promise with Application object in result.
     */
    createApplication(applicationName: string): Promise<Application>

    /**
     * Get application's detail from application.
     * @param application Application object
     * @returns Promise with application detail object.
     */
    getApplicationDetail(application: Application): Promise<ApplicationDetail>

    /**
     * Create new application version.
     * @param application Application in which the version will be created.
     * @param versionName Version name
     * @returns Promise with application version in result.
     */
    createApplicationVersion(application: Application, versionName: string): Promise<ApplicationVersion>

    /**
     * Set application version supported or unsupported.
     * @param applicationVersion Application version to alter.
     * @param supported Set `true` to make this version supported, otherwise `false`.
     * @returns Promise with updated `ApplicationVersion` object in result.
     */
    setAppplicationVersionSupported(applicationVersion: ApplicationVersion, supported: boolean): Promise<boolean>
}

