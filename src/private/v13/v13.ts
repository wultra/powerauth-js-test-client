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
    ActivationPrepareData,
    ActivationPrepareResult,
    ActivationStatus,
    Application,
    ApplicationDetail,
    ApplicationVersion,
    Config,
    SignedOfflineDataPayload,
    ObjectId,
    OfflineSignatureData,
    OnlineSignatureData,
    PowerAuthServerError,
    RecoveryConfig,
    ServerVersion,
    SignatureVerifyResult,
    SystemStatus, 
    TokenDigest, 
    TokenDigestVerifyResult} from "../../index";
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
    ActivationUnblock_Response} from "./Activation"
import {
    GetRecoveryConfig_Request,
    GetRecoveryConfig_Response,
    UpdateRecoveryConfig_Request,
    UpdateRecoveryConfig_Response } from "./Recovery";
import {
    TokenRemove_Request,
    TokenRemove_Response } from "./Token";
import {
    CreateNonPersonalizedOfflineSignature_Request,
    CreatePersonalizedOfflineSignature_Request,
    VerifyDeviceSignedData_Request,
    VerifyDeviceSignedData_Response } from "./Siganture";

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
        const version = ServerVersion.fromString(serverVersion)
        if (version.numericVersion < this.minSupportedVersion.numericVersion || version.numericVersion > this.maxSupportedVersion.numericVersion) {
            throw new PowerAuthServerError(`Unsupported server version in V1_3 client. Version = ${serverVersion}`)
        }
        return version
    }

    async getServerVersion(): Promise<ServerVersion> {
        if (!this.currentServerVersion) {
            const status = await this.getSystemStatus(true)
            this.currentServerVersion = this.validateServerVersion(status.version)
        }
        return this.currentServerVersion
    }

    // Applications
    
    async getApplicationList(): Promise<Application[]> {
        const list = (await this.client.postEmpty<ApplicationList_Response>(Endpoints.applicationList)).applications ?? []
        return list.map(app => Application.fromV13Data(app.applicationId, app.applicationRoles))
    }

    async createApplication(applicationName: string): Promise<Application> {
        const request = { applicationId: applicationName }
        const app = await this.client.post<ApplicationCreate_Request, ApplicationCreate_Response>(Endpoints.applicationCreate, request)
        return Application.fromV13Data(app.applicationId, app.applicationRoles)
    }

    async getApplicationDetail(application: Application): Promise<ApplicationDetail> {
        const request = { applicationId: application.applicationId.identifier }
        const detail = await this.client.post<ApplicationDetail_Request, ApplicationDetail_Response>(Endpoints.applicationDetail, request)
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
        const request = { 
            applicationId: application.applicationId.identifier,
            applicationVersionId: versionName
        }
        const response = await this.client.post<ApplicationVersionCreate_Request, ApplicationVersionCreate_Response>(Endpoints.applicationVersionCreate, request)
        return {
            applicationId: application.applicationId,
            applicationVersionId: ObjectId.fromV13Data(response.applicationVersionId),
            applicationKey: response.applicationKey,
            applicationSecret: response.applicationSecret,
            supported: response.supported
        }
    }

    async setAppplicationVersionSupported(applicationVersion: ApplicationVersion, supported: boolean): Promise<boolean> {
        const request = {
             applicationId: applicationVersion.applicationId.identifier,
             applicationVersionId: applicationVersion.applicationVersionId.identifier 
        }
        const response = await this.client.post<ApplicationVersionSupport_Request, ApplicationVersionSupport_Response>(Endpoints.applicationVersionSupport(supported), request)
        return response.supported
    }

    // Recovery

    async getRecoveryConfig(application: Application): Promise<RecoveryConfig> {
        const request = { applicationId: application.applicationId.identifier }
        const response = await this.client.post<GetRecoveryConfig_Request, GetRecoveryConfig_Response>(Endpoints.recoveryConfigDetail, request)
        return {
            applicationId: ObjectId.fromV13Data(response.applicationId),
            activationRecoveryEnabled: response.activationRecoveryEnabled,
            recoveryPostcardEnabled: response.recoveryPostcardEnabled,
            allowMultipleRecoveryCodes: response.allowMultipleRecoveryCodes,
            remotePostcardPublicKey: response.remotePostcardPublicKey,
            postcardPublicKey: response.postcardPublicKey
        }
    }

    async updateRecoveryConfig(recoveryConfig: RecoveryConfig): Promise<boolean> {
        const request = {
            applicationId: recoveryConfig.applicationId.identifier,
            activationRecoveryEnabled: recoveryConfig.activationRecoveryEnabled,
            recoveryPostcardEnabled: recoveryConfig.recoveryPostcardEnabled,
            allowMultipleRecoveryCodes: recoveryConfig.allowMultipleRecoveryCodes,
            remotePostcardPublicKey: recoveryConfig.remotePostcardPublicKey
        }
        const response = await this.client.post<UpdateRecoveryConfig_Request, UpdateRecoveryConfig_Response>(Endpoints.recoveryConfigUpdate, request)
        return response.updated
    }

    // Activation

    async activationInit(application: Application, userId: string, otp: string | undefined, otpValidation: ActivationOtpValidation | undefined, maxFailureCount: number | undefined): Promise<Activation> {
        const request = {
            applicationId: application.applicationId.identifier,
            userId: userId,
            activationOtp: otp,
            activationOtpValidation: otpValidation,
            maxFailureCount: maxFailureCount
        }
        const response = await this.client.post<ActivationInit_Request, ActivationInit_Response>(Endpoints.activationInit, request)
        return {
            userId: response.userId,
            applicationId: application.applicationId,
            activationId: response.activationId,
            activationCode: response.activationCode,
            activationSignature: response.activationSignature
        }
    }

    async activationUpdateOtp(activationId: string, otp: string, externalUserId: string | undefined): Promise<boolean> {
        const request = {
            activationId: activationId,
            activationOtp: otp,
            externalUserId: externalUserId
        }
        const response = await this.client.post<ActivationOtpUpdate_Request, ActivationOtpUpdate_Response>(Endpoints.activationUpdateOtp, request)
        return response.updated        
    }

    async activationCommit(activationId: string, otp: string | undefined, externalUserId: string | undefined): Promise<boolean> {
        const request = {
            activationId: activationId,
            activationOtp: otp,
            externalUserId: externalUserId
        }
        const response = await this.client.post<ActivationCommit_Request, ActivationCommit_Response>(Endpoints.activationCommit, request)
        return response.activated
    }

    async activationBlock(activationId: string, reason: string | undefined, externalUserId: string | undefined): Promise<ActivationStatus> {
        const request = {
            activationId: activationId,
            reason: reason,
            externalUserId: externalUserId
        }
        const response = await this.client.post<ActivationBlock_Request, ActivationBlock_Response>(Endpoints.activationBlock, request)
        return response.activationStatus
    }

    async activationUnblock(activationId: string, externalUserId: string | undefined): Promise<ActivationStatus> {
        const request = {
            activationId: activationId,
            externalUserId: externalUserId
        }
        const response = await this.client.post<ActivationUnblock_Request, ActivationUnblock_Response>(Endpoints.activationUnblock, request)
        return response.activationStatus
    }

    async activationRemove(activationId: string, revokeRecoveryCodes: boolean, externalUserId: string | undefined): Promise<boolean> {
        const request = {
            activationId: activationId,
            revokeRecoveryCodes: revokeRecoveryCodes,
            externalUserId: externalUserId
        }
        const response = await this.client.post<ActivationRemove_Request, ActivationRemove_Response>(Endpoints.activationRemove, request)
        return response.removed
    }

    async getActivationDetail(activationId: string, challenge: string | undefined): Promise<ActivationDetail> {
        const request = {
            activationId: activationId,
            challenge: challenge
        }
        return await this.client.post<ActivationStatus_Request, ActivationStatus_Response>(Endpoints.activationDetail, request)
    }

    async activationPrepare(data: ActivationPrepareData): Promise<ActivationPrepareResult> {
        const response = await this.client.post<ActivationPrepare_Request, ActivationPrepare_Response>(Endpoints.activationPrepare, data)
        return {
            activationId: response.activationId,
            userId: response.userId,
            applicationId: ObjectId.fromV13Data(response.applicationId),
            encryptedData: response.encryptedData,
            mac: response.mac,
            activationStatus: response.activationStatus
        }
    }

    // Signatures

    verifyOnlineSignature(signatureData: OnlineSignatureData): Promise<SignatureVerifyResult> {
        return this.client.post<OnlineSignatureData, SignatureVerifyResult>(Endpoints.signatureOnlineVerify, signatureData)
    }

    verifyOfflineSignature(signatureData: OfflineSignatureData): Promise<SignatureVerifyResult> {
        return this.client.post<OfflineSignatureData, SignatureVerifyResult>(Endpoints.signatureOnlineVerify, signatureData)
    }

    createNonPersonalizedOfflineSignature(application: Application, data: string): Promise<SignedOfflineDataPayload> {
        const request = {
            applicationId: application.applicationId.identifier,
            data: data
        }
        return this.client.post<CreateNonPersonalizedOfflineSignature_Request, SignedOfflineDataPayload>(Endpoints.createNonPersonalizedOfflineSignature, request)
    }

    createPersonalizedOfflineSignature(activationId: string, data: string): Promise<SignedOfflineDataPayload> {
        const request = {
            activationId: activationId,
            data: data
        }
        return this.client.post<CreatePersonalizedOfflineSignature_Request, SignedOfflineDataPayload>(Endpoints.createPersonalizedOfflineSignature, request)
    }

    async verifyDeviceSignedData(activationId: string, data: string, signature: string): Promise<boolean> {
        const request = {
            activationId: activationId,
            data: data,
            signature: signature
        }
        const result = await this.client.post<VerifyDeviceSignedData_Request, VerifyDeviceSignedData_Response>(Endpoints.ecdsaVerifyDeviceSignedData, request)
        return result.signatureValid
    }

    // Tokens

    async removeToken(activationId: string, tokenId: string): Promise<boolean> {
        const request = {
            activationId: activationId,
            tokenId: tokenId
        }
        const response = await this.client.post<TokenRemove_Request, TokenRemove_Response>(Endpoints.tokenRemove, request)
        return response.removed
    }

    verifyTokenDigest(tokenDigest: TokenDigest): Promise<TokenDigestVerifyResult> {
        return this.client.post<TokenDigest, TokenDigestVerifyResult>(Endpoints.tokenVerify, tokenDigest)
    }
}
