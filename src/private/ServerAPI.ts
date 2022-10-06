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
    OfflineSignatureData,
    OnlineSignatureData,
    RecoveryConfig,
    ServerVersion,
    SignatureVerifyResult,
    SystemStatus,
    TokenDigest,
    TokenDigestVerifyResult
 } from "../index"

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

    // Recovery

    /**
     * Get recovery config effective for given application.
     * @param application Application object.
     * @returns Promise with `RecoveryConfig` object in result.
     */
    getRecoveryConfig(application: Application): Promise<RecoveryConfig>

    /**
     * Update recovery config for application specified in config object.
     * @param recoveryConfig Recovery config to apply to the server.
     * @returns Promise with boolean in result.
     */
    updateRecoveryConfig(recoveryConfig: RecoveryConfig): Promise<boolean>
    
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
        otp: string | undefined,
        otpValidation: ActivationOtpValidation | undefined,
        maxFailureCount: number | undefined
    ): Promise<Activation>
    
    /**
     * Update activation OTP on the server.
     * @param activationId Activation identifier.
     * @param otp New activation OTP.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with boolean in result.
     */
    activationUpdateOtp(
        activationId: string,
        otp: string,
        externalUserId: string | undefined
    ): Promise<boolean>

    /**
     * Commit activation on the server.
     * @param activationId Activation identifier.
     * @param otp Optional OTP, in case that OTP is expected in this phase.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with boolean in result.
     */
    activationCommit(
        activationId: string,
        otp: string | undefined,
        externalUserId: string | undefined
    ): Promise<boolean>

    /**
     * Set activation blocked on the server.
     * @param activationId Activation identifier.
     * @param reason Optional block reason.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with boolean in result.
     */
    activationBlock(
        activationId: Activation | string,
        reason: string | undefined,
        externalUserId: string | undefined
    ): Promise<ActivationStatus>

    /**
     * Set activation unblocked on the server.
     * @param activationId Activation identifier.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with boolean in result.
     */
    activationUnblock(
        activationId: string,
        externalUserId: string | undefined
    ): Promise<ActivationStatus>

    /**
     * Remove activation on the server.
     * @param activationId Activation identifier.
     * @param revokeRecoveryCodes If true, then also revoke recovery codes associated to this activation.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with boolean in result.
     */
    activationRemove(
        activationId: string,
        revokeRecoveryCodes: boolean,
        externalUserId: string | undefined
    ): Promise<boolean>

    /**
     * Get activation detail from the server.
     * @param activationId Activation identifier.
     * @param challenge If provided, then also encrypted status blob V3.1 is returend.
     * @returns Promise with `ActivationDetail` in result.
     */
    getActivationDetail(activationId: string, challenge: string | undefined): Promise<ActivationDetail>

    /**
     * Prepare activation. This call is typically used in RESTful integration layer to process activation 
     * request from the mobile SDK. The method is useful also for this library testing.
     * @param data Activation data
     * @returns Promise with `ActivationPrepareResult` in result.
     */
    activationPrepare(data: ActivationPrepareData): Promise<ActivationPrepareResult>

    // Signatures

    /**
     * Verify online signature.
     * @param signatureData Data for online signature verification.
     * @returns Promise with `SignatureVerifyResult` in result.
     */
    verifyOnlineSignature(signatureData: OnlineSignatureData): Promise<SignatureVerifyResult>

    /**
     * Verify offline signature.
     * @param signatureData Data for offline signature verification.
     * @returns Promise with `SignatureVerifyResult` in result.
     */
    verifyOfflineSignature(signatureData: OfflineSignatureData): Promise<SignatureVerifyResult>

    /**
     * Create a data payload used as a challenge for non-personalized off-line signatures.
     * @param application Application object.
     * @param data Data to sign.
     * @returns Promise with `EcdsaSignedOfflineData` in result.
     */
    createNonPersonalizedOfflineSignature(application: Application, data: string): Promise<SignedOfflineDataPayload>

    /**
     * Create a data payload used as a challenge for non-personalized off-line signatures.
     * @param activationId Activation identifier.
     * @param data Data to sign.
     * @returns Promise with `EcdsaSignedOfflineData` in result.
     */
    createPersonalizedOfflineSignature(activationId: string, data: string): Promise<SignedOfflineDataPayload>

     /**
      * Verify ECDSA signature on device signed data.
      * @param activationId Activation identifier.
      * @param data Signed data.
      * @param signature Signature calculated from data.
      * @returns Promise with boolean result.
      */
    verifyDeviceSignedData(activationId: string, data: string, signature: string): Promise<boolean>

    // Tokens

    /**
     * Remove token.
     * @param activationId Activation identifier.
     * @param tokenId Token identifier.
     * @returns Promise with boolean in result.
     */
    removeToken(activationId: string, tokenId: string): Promise<boolean>

    /**
     * Verify token digest.
     * @param tokenDigest Token digest data.
     * @returns Promise with `TokenDigestVerifyResult` in result.
     */
    verifyTokenDigest(tokenDigest: TokenDigest): Promise<TokenDigestVerifyResult>
}

