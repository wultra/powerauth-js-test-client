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

import { Logger } from "./Logger"
import { PowerAuthServerError } from "./PowerAuthServerError"
import { SystemStatus } from "./model/SystemStatus"
import { ServerVersion } from "./model/Version"
import { ServerAPI } from "./private/ServerAPI"
import { ClientFactory } from "./private/ClientFactory"
import { RecoveryConfig } from "./model/Recovery"
import { getActivationId } from "./helpers/ActivationHelper"
import {
    Activation,
    ActivationDetail,
    ActivationOtpValidation,
    ActivationPrepareData,
    ActivationPrepareResult,
    ActivationStatus } from "./model/Activation"
import {
    Application,
    ApplicationDetail,
    ApplicationVersion,
    ApplicationSetup } from "./model/Application"
import {
    ApplicationConfig,
    Config,
    DEFAULT_APPLICATION_NAME,
    DEFAULT_APPLICATION_VERSION_NAME,
    DEFAULT_MAX_FAILED_ATTEMPTS } from "./model/Config"
import {
    SignedOfflineDataPayload,
    OfflineSignatureData,
    OnlineSignatureData,
    SignatureVerifyResult } from "./model/Signature"
import {
    TokenDigest,
    TokenDigestVerifyResult } from "./model/Token"
import { Base64 } from "js-base64"
import { parseOfflinePayloadData } from "./private/OfflineDataParser"

/**
 * Class that implements connection to PowerAuth Server RESTful API.
 */
export class PowerAuthTestServer {

    readonly config: Config

    /**
     * Construct object with configuration.
     * @param config Configuration used to connection.
     * @param testPrefix If provided, then such prefix will be used for all default identifiers, such as userId or application name.
     */
    constructor(config: Config) {
        Logger.setBaseUrlForRequests(config.connection.baseUrl)
        this.config = config
    }

    private apiInstance: ServerAPI | undefined

    /**
     * Contains internal `ServerAPI`. If connection is not established, then throws error.
     */
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
    getSystemStatus(failIfNoOK: boolean = true): Promise<SystemStatus> {
        return this.api.getSystemStatus(failIfNoOK)
    }

    /**
     * Validate connection to the server and return server's version.
     * @returns Promise with Version of PowerAuth Server.
     */
    getServerVersion(): Promise<ServerVersion> {
        return this.api.getServerVersion()
    }


    // Application management

    /**
     * Find application by name.
     * @param applicationName Application's name to look up.
     * @returns Promise with optional `Application` object in a result.
     */
    async findApplicationByName(applicationName: string): Promise<Application | undefined> {
        const appList = await this.getApplicationList()
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
    getApplicationList(): Promise<Array<Application>> {
        return this.api.getApplicationList()
    }

    /**
     * Get application's detail from application.
     * @param application Application object
     * @returns Promise with `ApplicationDetail` in a result.
     */
    getApplicationDetail(application: Application): Promise<ApplicationDetail> {
        return this.api.getApplicationDetail(application)
    }

    /**
     * Create new application with requested  name.
     * @param applicationName Name of new application.
     * @returns Promise with `Application` object in result.
     */
    createApplication(applicationName: string): Promise<Application> {
        return this.api.createApplication(applicationName)
    }

    /**
     * Create new application version in given application.
     * @param application Application for which the version will be created.
     * @param versionName New application's version.
     * @returns Promise with `ApplicationVersion` in a result.
     */
    createApplicationVersion(application: Application, versionName: string): Promise<ApplicationVersion> {
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
        const result = await this.api.setAppplicationVersionSupported(applicationVersion, supported)
        if (result != supported) {
            throw new PowerAuthServerError(`Failed to set application version ${supported ? "supported" : "not-supported"}. The status after request is different than expected.`)
        }
        applicationVersion.supported = supported
    }

    /**
     * Prepare pair of application and its version from configuration. If no configuration object is provided, then
     * the configuration provided in this object's constructor is used.
     * @param applicationConfig Configuration for application and its version to be prepared. If not provided, then configuration from this object's constructor is used.
     * @returns Promise with `ApplicationWithVersion` in a result.
     */
    async prepareApplicationFromConfiguration(applicationConfig: ApplicationConfig | undefined = undefined): Promise<ApplicationSetup> {
        const appConfig = applicationConfig ?? this.config.application
        const applicationName = appConfig?.applicationName ?? DEFAULT_APPLICATION_NAME
        const applicationVersionName = appConfig?.applicationVersion ?? DEFAULT_APPLICATION_VERSION_NAME

        Logger.info(`Preparing application '${applicationName}' with version '${applicationVersionName}'`)

        let application = await this.findApplicationByName(applicationName)
        if (application == null) {
            application = await this.api.createApplication(applicationName)
        }
        const applicationDetail = await this.getApplicationDetail(application)
        let version = this.findApplicationVersionByName(applicationDetail, applicationVersionName)
        if (version == null) {
            version = await this.api.createApplicationVersion(application, applicationVersionName)
        }
        if (!version.supported) {
            await this.setAppplicationVersionSupported(version, true)
        }
        const appSetup = new ApplicationSetup(applicationDetail, version)
        if (appConfig?.enableRecoveryCodes) {
            const recoveryCodesConfig = await this.getRecoveryConfig(appSetup.application)
            if (!recoveryCodesConfig.activationRecoveryEnabled) {
                recoveryCodesConfig.activationRecoveryEnabled = true
                await this.updateRecoveryConfig(recoveryCodesConfig)
            }
        }
        return appSetup
    }

    // Recovery

    /**
     * Get recovery config effective for given application.
     * @param application Application object.
     * @returns Promise with `RecoveryConfig` object in result.
     */
    getRecoveryConfig(application: Application): Promise<RecoveryConfig> {
        return this.api.getRecoveryConfig(application)
    }

    /**
     * Update recovery config for application specified in config object.
     * @param recoveryConfig Recovery config to apply to the server.
     * @returns Promise with boolean in result.
     */
    updateRecoveryConfig(recoveryConfig: RecoveryConfig): Promise<boolean> {
        return this.api.updateRecoveryConfig(recoveryConfig)
    }


    // Activation management

    /**
     * Initialize activation for give application and user id. You can also specify other optional parameters,
     * like OTP and maximum failure attempts value.
     * @param application Application object.
     * @param userId User identifier.
     * @param otp Optional activation OTP.
     * @param otpValidation Optional activation OTP validation mode, that must be provided together with OTP.
     * @param maxFailureCount Optional maximum failure count. If not provided, value 5 will be used.
     * @returns Promise with `Activation` object in result.
     */
     activationInit(
        application: Application,
        userId: string,
        otp: string | undefined = undefined,
        otpValidation: ActivationOtpValidation | undefined = undefined,
        maxFailureCount: number | undefined = DEFAULT_MAX_FAILED_ATTEMPTS
    ): Promise<Activation> {
        return this.api.activationInit(application, userId, otp, otpValidation, maxFailureCount)
    }
    
    /**
     * Update activation OTP on the server.
     * @param activation Activation object or string with activation identifier.
     * @param otp New activation OTP.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with boolean in result.
     */
    activationUpdateOtp(
        activation: Activation | string,
        otp: string,
        externalUserId: string | undefined = undefined
    ): Promise<boolean> {
        return this.api.activationUpdateOtp(getActivationId(activation), otp, externalUserId)
    }

    /**
     * Commit activation on the server.
     * @param activation Activation object.
     * @param otp Optional OTP, in case that OTP is expected in this phase.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with boolean in result.
     */
    activationCommit(
        activation: Activation | string,
        otp: string | undefined = undefined,
        externalUserId: string | undefined = undefined
    ): Promise<boolean> {
        return this.api.activationCommit(getActivationId(activation), otp, externalUserId)
    }

    /**
     * Set activation blocked on the server.
     * @param activation Activation object or string with activation identifier.
     * @param reason Optional block reason.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with boolean in result.
     */
    async activationBlock(
        activation: Activation | string,
        reason: string | undefined = undefined,
        externalUserId: string | undefined = undefined
    ): Promise<boolean> {
        return await this.api.activationBlock(getActivationId(activation), reason, externalUserId) == ActivationStatus.BLOCKED
    }

    /**
     * Set activation unblocked on the server.
     * @param activation Activation object or string with activation identifier.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with boolean in result.
     */
    async activationUnblock(
        activation: Activation | string,
        externalUserId: string | undefined = undefined
    ): Promise<boolean> {
        return await this.api.activationUnblock(getActivationId(activation), externalUserId) == ActivationStatus.ACTIVE
    }

    /**
     * Remove activation on the server.
     * @param activation Activation object or string with activation identifier.
     * @param revokeRecoveryCodes If true, then also revoke recovery codes associated to this activation.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with boolean in result.
     */
    activationRemove(
        activation: Activation | string,
        revokeRecoveryCodes: boolean = true,
        externalUserId: string | undefined = undefined
    ): Promise<boolean> {
        return this.api.activationRemove(getActivationId(activation), revokeRecoveryCodes, externalUserId)
    }

    /**
     * Get activation detail from the server.
     * @param activation Activation object or string with activation identifier.
     * @param challenge If provided, then also encrypted status blob V3.1 is returend.
     * @returns Promise with `ActivationDetail` in result.
     */
    getActivationDetil(activation: Activation | string, challenge: string | undefined = undefined): Promise<ActivationDetail> {
        return this.api.getActivationDetail(getActivationId(activation), challenge)
    }

    /**
     * Prepare activation. This call is typically used in RESTful integration layer to process activation 
     * request from the mobile SDK. The method is useful also for this library testing.
     * @param data Activation data
     * @returns Promise with `ActivationPrepareResult` in result.
     */
    activationPrepare(data: ActivationPrepareData): Promise<ActivationPrepareResult> {
        return this.api.activationPrepare(data)
    }

    // Signatures

    /**
     * Verify online signature.
     * @param signatureData Data for online signature verification.
     * @returns Promise with `SignatureVerifyResult` in result.
     */
    verifyOnlineSignature(signatureData: OnlineSignatureData): Promise<SignatureVerifyResult> {
        return this.api.verifyOnlineSignature(signatureData)
    }

    /**
     * Verify offline signature.
     * @param signatureData Data for offline signature verification.
     * @returns Promise with `SignatureVerifyResult` in result.
     */
    verifyOfflineSignature(signatureData: OfflineSignatureData): Promise<SignatureVerifyResult> {
        return this.api.verifyOfflineSignature(signatureData)
    }

    /**
     * Create a data payload used as a challenge for non-personalized off-line signatures.
     * @param application Application object.
     * @param data Data to sign.
     * @returns Promise with `EcdsaSignedOfflineData` in result.
     */
    async createNonPersonalizedOfflineSignature(application: Application, data: string): Promise<SignedOfflineDataPayload> {
        return parseOfflinePayloadData(await this.api.createNonPersonalizedOfflineSignature(application, data))
    }

    /**
     * Create a data payload used as a challenge for non-personalized off-line signatures.
     * @param activationId Activation identifier.
     * @param data Data to sign.
     * @returns Promise with `EcdsaSignedOfflineData` in result.
     */
    async createPersonalizedOfflineSignature(activation: Activation | string, data: string): Promise<SignedOfflineDataPayload> {
        return parseOfflinePayloadData(await this.api.createPersonalizedOfflineSignature(getActivationId(activation), data))
    }

    /**
     * Verify ECDSA signature on device signed data.
     * @param activationId Activation identifier.
     * @param data Signed data.
     * @param signature Signature calculated from data.
     * @returns Promise with boolean result.
     */
    verifyDeviceSignedData(activation: Activation | string, data: string, signature: string): Promise<boolean> {
        return this.api.verifyDeviceSignedData(getActivationId(activation), Base64.encode(data), signature)
    }

    // Tokens

    /**
     * Remove token.
     * @param activationId Activation identifier.
     * @param tokenId Token identifier.
     * @returns Promise with boolean in result.
     */
    removeToken(activationId: Activation | string, tokenId: string): Promise<boolean> {
        return this.api.removeToken(getActivationId(activationId), tokenId)
     }

     /**
      * Verify token digest.
      * @param tokenId Token identifier.
      * @param digest Digest value.
      * @param nonce Nonce value.
      * @param timestamp Timestamp.
      * @returns Promise with `TokenVerifyResult` in result.
      */
    verifyTokenDigest(tokenDigest: TokenDigest): Promise<TokenDigestVerifyResult> {
        return this.api.verifyTokenDigest(tokenDigest)
    }
}
