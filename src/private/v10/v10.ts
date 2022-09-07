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
    Activation,
    ActivationDetail,
    ActivationOtpValidation,
    ActivationStatus,
    Application,
    ApplicationDetail,
    ApplicationVersion,
    Config,
    ObjectId,
    PowerAuthServerError,
    RecoveryConfig,
    ServerVersion,
    SystemStatus } from "../../index";
import { 
    ApplicationCreate_Request,
    ApplicationCreate_Response,
    ApplicationDetail_Request,
    ApplicationDetail_Response,
    ApplicationList_Response,
    ApplicationVersionCreate_Request,
    ApplicationVersionCreate_Response, 
    ApplicationVersionSupport_Request,
    ApplicationVersionSupport_Response } from "./Application";
import { 
    ActivationBlock_Request,
    ActivationBlock_Response,
    ActivationCommit_Request,
    ActivationCommit_Response,
    ActivationInit_Request,
    ActivationInit_Response, 
    ActivationOtpUpdate_Request,
    ActivationOtpUpdate_Response,
    ActivationPrepare_Request,
    ActivationPrepare_Response,
    ActivationRemove_Request,
    ActivationRemove_Response,
    ActivationStatus_Request,
    ActivationStatus_Response,
    ActivationUnblock_Request,
    ActivationUnblock_Response} from "./Activation";
import {
    GetRecoveryConfig_Request,
    GetRecoveryConfig_Response,
    UpdateRecoveryConfig_Request,
    UpdateRecoveryConfig_Response } from "./Recovery";
import { ActivationPrepareData, ActivationPrepareResult } from "../../model/Activation";

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


    // Recovery

    async getRecoveryConfig(application: Application): Promise<RecoveryConfig> {
        let request = { applicationId: application.applicationId.legacyIdentifier }
        let response = await this.client.post<GetRecoveryConfig_Request, GetRecoveryConfig_Response>(Endpoints.recoveryConfigDetail, request)
        return {
            applicationId: ObjectId.fromV10Data(response.applicationId, application.applicationName),
            activationRecoveryEnabled: response.activationRecoveryEnabled,
            recoveryPostcardEnabled: response.recoveryPostcardEnabled,
            allowMultipleRecoveryCodes: response.allowMultipleRecoveryCodes,
            remotePostcardPublicKey: response.remotePostcardPublicKey,
            postcardPublicKey: response.postcardPublicKey
        }
    }

    async updateRecoveryConfig(recoveryConfig: RecoveryConfig): Promise<boolean> {
        let request = {
            applicationId: recoveryConfig.applicationId.legacyIdentifier,
            activationRecoveryEnabled: recoveryConfig.activationRecoveryEnabled,
            recoveryPostcardEnabled: recoveryConfig.recoveryPostcardEnabled,
            allowMultipleRecoveryCodes: recoveryConfig.allowMultipleRecoveryCodes,
            remotePostcardPublicKey: recoveryConfig.remotePostcardPublicKey
        }
        let response = await this.client.post<UpdateRecoveryConfig_Request, UpdateRecoveryConfig_Response>(Endpoints.recoveryConfigUpdate, request)
        return response.updated
    }

    // Activation

    async activationInit(application: Application, userId: string, otp: string | undefined, otpValidation: ActivationOtpValidation | undefined, maxFailureCount: number | undefined): Promise<Activation> {
        let request = {
            applicationId: application.applicationId.legacyIdentifier,
            userId: userId,
            activationOtp: otp,
            activationOtpValidation: otpValidation,
            maxFailureCount: maxFailureCount
        }
        let response = await this.client.post<ActivationInit_Request, ActivationInit_Response>(Endpoints.activationInit, request)
        return {
            userId: response.userId,
            applicationId: application.applicationId,
            activationId: response.activationId,
            activationCode: response.activationCode,
            activationSignature: response.activationSignature
        }
    }

    async activationUpdateOtp(activation: Activation, otp: string, externalUserId: string | undefined): Promise<boolean> {
        let request = {
            activationId: activation.activationId,
            activationOtp: otp,
            externalUserId: externalUserId
        }
        let response = await this.client.post<ActivationOtpUpdate_Request, ActivationOtpUpdate_Response>(Endpoints.activationUpdateOtp, request)
        return response.updated        
    }

    async activationCommit(activation: Activation, otp: string | undefined, externalUserId: string | undefined): Promise<boolean> {
        let request = {
            activationId: activation.activationId,
            activationOtp: otp,
            externalUserId: externalUserId
        }
        let response = await this.client.post<ActivationCommit_Request, ActivationCommit_Response>(Endpoints.activationCommit, request)
        return response.activated
    }

    async activationBlock(activation: Activation, reason: string | undefined, externalUserId: string | undefined): Promise<ActivationStatus> {
        let request = {
            activationId: activation.activationId,
            reason: reason,
            externalUserId: externalUserId
        }
        let response = await this.client.post<ActivationBlock_Request, ActivationBlock_Response>(Endpoints.activationBlock, request)
        return response.activationStatus
    }

    async activationUnblock(activation: Activation, externalUserId: string | undefined): Promise<ActivationStatus> {
        let request = {
            activationId: activation.activationId,
            externalUserId: externalUserId
        }
        let response = await this.client.post<ActivationUnblock_Request, ActivationUnblock_Response>(Endpoints.activationBlock, request)
        return response.activationStatus
    }

    async activationRemove(activation: Activation, revokeRecoveryCodes: boolean, externalUserId: string | undefined): Promise<boolean> {
        let request = {
            activationId: activation.activationId,
            revokeRecoveryCodes: revokeRecoveryCodes,
            externalUserId: externalUserId
        }
        let response = await this.client.post<ActivationRemove_Request, ActivationRemove_Response>(Endpoints.activationRemove, request)
        return response.removed
    }

    async getActivationDetail(activation: Activation, challenge: string | undefined): Promise<ActivationDetail> {
        let request = {
            activationId: activation.activationId,
            challenge: challenge
        }
        return await this.client.post<ActivationStatus_Request, ActivationStatus_Response>(Endpoints.activationDetail, request)
    }

    async activationPrepare(data: ActivationPrepareData): Promise<ActivationPrepareResult> {
        let response = await this.client.post<ActivationPrepare_Request, ActivationPrepare_Response>(Endpoints.activationPrepare, data)
        return {
            activationId: response.activationId,
            userId: response.userId,
            applicationId: ObjectId.fromV10Data(response.applicationId),
            encryptedData: response.encryptedData,
            mac: response.mac,
            activationStatus: response.activationStatus
        }
    }
}