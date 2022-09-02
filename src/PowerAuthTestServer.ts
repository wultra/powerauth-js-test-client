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

import { PowerAuthServerError } from "./PowerAuthServerError"
import { Application, ApplicationDetail, ApplicationVersion, ApplicationWithVersion } from "./model/Application"
import { ApplicationConfig, Config, DEFAULT_APPLICATION_NAME, DEFAULT_APPLICATION_VERSION_NAME } from "./model/Config"
import { SystemStatus } from "./model/SystemStatus"
import { ServerVersion } from "./model/Version"
import { ServerAPI } from "./private/ServerAPI"
import { ClientFactory } from "./private/ClientFactory"
import { Logger } from "./Logger"

export class PowerAuthTestServer {

    readonly config: Config

    constructor(config: Config) {
        Logger.setBaseUrlForRequests(config.connection.baseUrl)
        this.config = config
    }

    private apiInstance: ServerAPI | undefined

    private get api(): ServerAPI {
        if (!this.apiInstance) {
            throw new PowerAuthServerError("There's no connection to server")
        }
        return this.apiInstance
    }

    // Connection & System Status

    /**
     * Connect to PowerAuth Server RESTful API.
     */
    async connect(): Promise<void> {
        if (!this.apiInstance) {
            this.apiInstance = await ClientFactory.createTestServerApi(this.config)
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.connect()
            return true
        } catch (error) {
            Logger.exception(error)
            return false
        }
    }

    /**
     * Get system status from the server.
     * @param failIfNoOK If `true` then function fail if status is not OK.
     * @returns Promise with SystemStatus received from the server.
     */
    async getSystemStatus(failIfNoOK: boolean = true): Promise<SystemStatus> {
        return await this.api.getSystemStatus(failIfNoOK)
    }

    /**
     * Validate connection to the server and return server's version.
     * @returns Promise with Version of PowerAuth Server.
     */
    async getServerVersion(): Promise<ServerVersion> {
        return await this.api.getServerVersion()
    }

    // Application management

    /**
     * Find application by name.
     * @param applicationName Application's name to look up.
     * @returns Promise with optional `Application` object in a result.
     */
    async findApplicationByName(applicationName: string): Promise<Application | undefined> {
        let appList = await this.getApplicationList()
        return appList.find(app => app.applicationName == applicationName)
    }

    /**
     * Find application version by name in provided application detail object.
     * @param applicationDetail ApplicationDetail containing all application versions.
     * @param applicationVersionName Application version to look up.
     * @returns `ApplicationVersion` or `null` if no such version was found.
     */
    findApplicationVersionByName(applicationDetail: ApplicationDetail, applicationVersionName: String): ApplicationVersion | undefined {
        return applicationDetail.versions.find(version => version.applicationVersionId.objectName == applicationVersionName)
    }

    /**
     * Get list of all applications.
     * @returns Promise with array of `Application` objects in a result.
     */
    async getApplicationList(): Promise<Array<Application>> {
        return this.api.getApplicationList()
    }

    /**
     * Get application's detail from application.
     * @param application Application object
     * @returns Promise with `ApplicationDetail` in a result.
     */
    async getApplicationDetail(application: Application): Promise<ApplicationDetail> {
        return this.api.getApplicationDetail(application)
    }

    /**
     * Create new application with requested  name.
     * @param applicationName Name of new application.
     * @returns Promise with `Application` object in result.
     */
    async createApplication(applicationName: string): Promise<Application> {
        return this.api.createApplication(applicationName)
    }

    /**
     * Create new application version in given application.
     * @param application Application for which the version will be created.
     * @param versionName New application's version.
     * @returns Promise with `ApplicationVersion` in a result.
     */
    async createApplicationVersion(application: Application, versionName: string): Promise<ApplicationVersion> {
        return this.api.createApplicationVersion(application, versionName)
    }

    /**
     * Set application version supported or unsupported. Be aware that the content of provided version object is changed after this call.
     * @param applicationVersion Application version to alter.
     * @param supported Set `true` to make this version supported, otherwise `false`.
     * @returns Promise with void in result.
     */
    async setAppplicationVersionSupported(applicationVersion: ApplicationVersion, supported: boolean): Promise<void> {
        if (applicationVersion.supported == supported) {
            Logger.warning(`Application version is already ${supported ? "supported" : "not-supported"}`)
            return
        }
        let result = await this.api.setAppplicationVersionSupported(applicationVersion, supported)
        if (result != supported) {
            throw new PowerAuthServerError(`Failed to set application version ${supported ? "supported" : "not-supported"}. The status after request is different than expected.`)
        }
        applicationVersion.supported = supported
    }

    /**
     * Prepare pair of application and its version from configuration. If no configuration object is provided, then
     * the configuration provided in this object's constructor is used. If such configuration has no 'application' section
     * @param applicationConfig Configuration for application and its version to be prepared. If not provided, then configuration from this object's constructor is used.
     * @returns Promise with `ApplicationWithVersion` in a result.
     */
    async prepareApplicationFromConfiguration(applicationConfig: ApplicationConfig | undefined = undefined): Promise<ApplicationWithVersion> {
        let appConfig = applicationConfig ?? this.config.application
        if (appConfig == undefined) {
            throw new PowerAuthServerError("Missing 'application' section in configuration")
        }

        let applicationName = appConfig.applicationName
        let applicationVersionName = appConfig.applicationVersion ?? DEFAULT_APPLICATION_VERSION_NAME

        Logger.info(`Preparing application '${applicationName}' with version '${applicationVersionName}'`)

        var application = await this.findApplicationByName(applicationName)
        if (application == null) {
            application = await this.api.createApplication(applicationName)
        }
        let applicationDetail = await this.getApplicationDetail(application)
        var version = this.findApplicationVersionByName(applicationDetail, applicationVersionName)
        if (version == null) {
            version = await this.api.createApplicationVersion(application, applicationVersionName)
        }
        if (!version.supported) {
            await this.setAppplicationVersionSupported(version, true)
        }
        return {
            application: applicationDetail,
            applicationVersion: version
        }
    }
}