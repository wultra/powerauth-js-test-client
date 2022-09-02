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

import { ServerAPI } from "../ServerAPI";
import { HttpClient } from "../HttpClient";
import { getSystemStatus } from "../StatusFetch";
import { Endpoints } from "./Endpoints";
import { 
    ApplicationCreate_Request,
    ApplicationCreate_Response,
    ApplicationDetail_Request,
    ApplicationDetail_Response,
    ApplicationList_Response,
    ApplicationVersionCreate_Request,
    ApplicationVersionCreate_Response, 
    ApplicationVersionSupport_Request,
    ApplicationVersionSupport_Response
} from "./Application";
import {
    Application,
    ApplicationDetail,
    ApplicationVersion,
    Config,
    ObjectId,
    PowerAuthServerError,
    ServerVersion,
    SystemStatus,
} from "../../index";

/**
 * Create `ServerAPI` implementation that connects to servers from V1.0 up to V1.2.x.
 * @param config Configuration.
 * @param client HttpClient.
 * @returns Instance of ServerAPI.
 */
 export function createV10Client(config: Config, client: HttpClient): ServerAPI {
    return new ClientImpl(config, client)
}

/**
 * ServerAPI implementation that connects to servers from V1.0 up to V1.2.x.
 */
class ClientImpl implements ServerAPI {
    
    readonly config: Config;
    readonly client: HttpClient

    readonly minSupportedVersion = ServerVersion.V1_0_0
    readonly maxSupportedVersion = ServerVersion.V1_2_5

    private currentServerVersion: ServerVersion | undefined

    constructor(config: Config, client: HttpClient) {
        this.config = config
        this.client = client
    }

    // Status & Server version

    async getSystemStatus(failIfNoOK: boolean): Promise<SystemStatus> {
        return await getSystemStatus(this.client, failIfNoOK)
    }

    validateServerVersion(serverVersion: string): ServerVersion {
        let version = ServerVersion.fromString(serverVersion)
        if (version.numericVersion < this.minSupportedVersion.numericVersion || version.numericVersion > this.maxSupportedVersion.numericVersion) {
            throw new PowerAuthServerError(`Unsupported server version in V1_0 client. Version = ${serverVersion}`)
        }
        return version
    }

    async getServerVersion(): Promise<ServerVersion> {
        if (this.currentServerVersion != undefined) {
            return this.currentServerVersion
        }
        let status = await this.getSystemStatus(true)
        this.currentServerVersion = this.validateServerVersion(status.version)
        return this.currentServerVersion
    }

    // Applications
    
    async getApplicationList(): Promise<Application[]> {
        let list = (await this.client.postEmpty<ApplicationList_Response>(Endpoints.applicationList)).applications ?? []
        return list.map(app => Application.fromV10Data(app.id, app.applicationName, app.applicationRoles))
    }

    async createApplication(applicationName: string): Promise<Application> {
        let request = { applicationName: applicationName }
        let app = await this.client.post<ApplicationCreate_Request, ApplicationCreate_Response>(Endpoints.applicationCreate, request)
        return Application.fromV10Data(app.applicationId, app.applicationName, app.applicationRoles)
    }

    async getApplicationDetail(application: Application): Promise<ApplicationDetail> {
        let request = { applicationId: application.applicationId.legacyIdentifier }
        let detail = await this.client.post<ApplicationDetail_Request, ApplicationDetail_Response>(Endpoints.applicationDetail, request)
        return {
            applicationId: ObjectId.fromV10Data(detail.applicationId, detail.applicationName),
            masterPublicKey: detail.masterPublicKey,
            applicationRoles: detail.applicationRoles ?? [],
            versions: detail.versions?.map(version => {
                return {
                    applicationId: application.applicationId,
                    applicationVersionId: ObjectId.fromV10Data(version.applicationVersionId, version.applicationVersionName),
                    applicationKey: version.applicationKey,
                    applicationSecret: version.applicationSecret,
                    supported: version.supported
                }
            }) ?? []
        }
    }

    async createApplicationVersion(application: Application, versionName: string): Promise<ApplicationVersion> {
        let request = { 
            applicationId: application.applicationId.legacyIdentifier,
            applicationVersionName: versionName
        }
        let response = await this.client.post<ApplicationVersionCreate_Request, ApplicationVersionCreate_Response>(Endpoints.applicationVersionCreate, request)
        return {
            applicationId: application.applicationId,
            applicationVersionId: ObjectId.fromV10Data(response.applicationVersionId, response.applicationVersionName),
            applicationKey: response.applicationKey,
            applicationSecret: response.applicationSecret,
            supported: response.supported
        }
    }

    async setAppplicationVersionSupported(applicationVersion: ApplicationVersion, supported: boolean): Promise<boolean> {
        let request = { applicationVersionId: applicationVersion.applicationVersionId.legacyIdentifier }
        let response = await this.client.post<ApplicationVersionSupport_Request, ApplicationVersionSupport_Response>(Endpoints.applicationVersionSupport(supported), request)
        return response.supported
    }
}