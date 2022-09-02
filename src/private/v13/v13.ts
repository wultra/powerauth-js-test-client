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
    Application,
    ApplicationDetail,
    ApplicationVersion,
    Config,
    ObjectId,
    PowerAuthServerError,
    ServerVersion,
    SystemStatus
} from "../../index";
import { 
    ApplicationCreate_Request,
    ApplicationCreate_Response,
    ApplicationDetail_Request,
    ApplicationDetail_Response,
    ApplicationList_Response,
    ApplicationVersionCreate_Request,
    ApplicationVersionCreate_Response, 
    ApplicationVersionSupport_Request
} from "./Application";
import {
    ActivationInit_Request
} from "./Activation"
import { ApplicationVersionSupport_Response } from "../v10/Application";

/**
 * Create `ServerAPI` implementation that connects to servers V1.3 and newer.
 * @param config Configuration.
 * @param client HttpClient.
 * @returns Instance of ServerAPI.
 */
export function createV13Client(config: Config, client: HttpClient): ServerAPI {
    return new ClientImpl(config, client)
}

/**
 * ServerAPI implementation that connects to servers V1.3 and newer.
 */
class ClientImpl implements ServerAPI {
    
    readonly config: Config;
    readonly client: HttpClient

    readonly minSupportedVersion = ServerVersion.V1_3_0
    readonly maxSupportedVersion = ServerVersion.LATEST

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
            throw new PowerAuthServerError(`Unsupported server version in V1_3 client. Version = ${serverVersion}`)
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
        return list.map(app => Application.fromV13Data(app.applicationId, app.applicationRoles))
    }

    async createApplication(applicationName: string): Promise<Application> {
        let request = { applicationId: applicationName }
        let app = await this.client.post<ApplicationCreate_Request, ApplicationCreate_Response>(Endpoints.applicationCreate, request)
        return Application.fromV13Data(app.applicationId, app.applicationRoles)
    }

    async getApplicationDetail(application: Application): Promise<ApplicationDetail> {
        let request = { applicationId: application.applicationId.identifier }
        let detail = await this.client.post<ApplicationDetail_Request, ApplicationDetail_Response>(Endpoints.applicationDetail, request)
        return {
            applicationId: ObjectId.fromV13Data(detail.applicationId),
            masterPublicKey: detail.masterPublicKey,
            applicationRoles: detail.applicationRoles ?? [],
            versions: (detail.versions ?? []).map(version => {
                return {
                    applicationId: application.applicationId,
                    applicationVersionId: ObjectId.fromV13Data(version.applicationVersionId),
                    applicationKey: version.applicationKey,
                    applicationSecret: version.applicationSecret,
                    supported: version.supported
                }
            })
        }
    }

    async createApplicationVersion(application: Application, versionName: string): Promise<ApplicationVersion> {
        let request = { 
            applicationId: application.applicationId.identifier,
            applicationVersionId: versionName
        }
        let response = await this.client.post<ApplicationVersionCreate_Request, ApplicationVersionCreate_Response>(Endpoints.applicationVersionCreate, request)
        return {
            applicationId: application.applicationId,
            applicationVersionId: ObjectId.fromV13Data(response.applicationVersionId),
            applicationKey: response.applicationKey,
            applicationSecret: response.applicationSecret,
            supported: response.supported
        }
    }

    async setAppplicationVersionSupported(applicationVersion: ApplicationVersion, supported: boolean): Promise<boolean> {
        let request = {
             applicationId: applicationVersion.applicationId.identifier,
             applicationVersionId: applicationVersion.applicationVersionId.identifier 
        }
        let response = await this.client.post<ApplicationVersionSupport_Request, ApplicationVersionSupport_Response>(Endpoints.applicationVersionSupport(supported), request)
        return response.supported
    }
}
