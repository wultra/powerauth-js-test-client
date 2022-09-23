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
//

import {
    Activation,
    ActivationDetail,
    ActivationOtpValidation,
    ActivationStatus,
    Application,
    ApplicationConfig,
    ApplicationSetup,
    Config,
    DEFAULT_MAX_FAILED_ATTEMPTS,
    DEFAULT_USER_ID,
    PowerAuthTestServer } from "../index";

/**
 * Interface that contains data for activation prepare. The content highly depends
 * on actual PowerAuth mobile SDK implementation, so each parameter is optional.
 */
export interface ActivationHelperPrepareData {
    /**
     * Password for knowledge factor
     */
    password?: string
    /**
     * Information whether activation will use also biometry factor.
     */
    useBiometry?: boolean
    /**
     * OTP in case of OTP validaiton.
     */
    otp?: string
    /**
     * OTP validation mode.
     */
    otpValidation?: ActivationOtpValidation
}

/**
 * Closure that provides instance of SDK type.
 */
export type CreateSdkFunc<SDK> = (appSetup: ApplicationSetup, prepareData: ActivationHelperPrepareData | undefined) => Promise<SDK>
/**
 * Closure that implements prepare step.
 */
 export type ActivationPrepareFunc<SDK, PrepareResult> = (helper: ActivationHelper<SDK, PrepareResult>, activation: Activation, prepareData: ActivationHelperPrepareData | undefined) => Promise<PrepareResult>

/**
 * The `ActivationHelper` class helps with various activation related tasks.
 */
export class ActivationHelper<SDK, PrepareResult> {

    readonly server: PowerAuthTestServer
    readonly appSetup: ApplicationSetup

    private activationData: Activation | undefined
    private sdkInstance: SDK | undefined
    private prepareData: ActivationHelperPrepareData | undefined
    private prepareResultData: PrepareResult | undefined

    prepareStep: ActivationPrepareFunc<SDK, PrepareResult> | undefined
    createSdk: CreateSdkFunc<SDK> | undefined

    // Construction

    /**
     * Construct ActivationHelper with known server and app setup.
     * @param server `PowerAuthTestServer` instance.
     * @param appSetup `ApplicationSetup` instance
     */
    constructor(
        server: PowerAuthTestServer,
        appSetup: ApplicationSetup,
    ) {
        this.server = server
        this.appSetup = appSetup
    }

    /**
     * Create instance of `ActivationHelper` with default or with provided `ApplicationConfig`. The function also 
     * guarantees that connection to the server works.
     * @param server `PowerAuthTestServer` instance.
     * @param applicationConfig `ApplicationConfig` instance or undefined, if default configuration will be used.
     * @returns Promise with `ActivationHelper` instance in result.
     */
    static async create<SDK, PrepareResult>(
        server: PowerAuthTestServer,
        applicationConfig: ApplicationConfig | undefined = undefined,
    ): Promise<ActivationHelper<SDK, PrepareResult>> {
        await server.connect()
        const appSetup = await server.prepareApplicationFromConfiguration(applicationConfig)
        return new ActivationHelper(server, appSetup)
    }

    /**
     * Create instance of `ActivationHelper` with server created with server's configuration. The function also 
     * guarantees that connection to the server works.
     * @param config Configuration for `PowerAuthTestServer`.
     * @returns Promise with `ActivationHelper` instance in result.
     */
    static async createWithConfig<SDK, PrepareResult>(
        config: Config,
    ): Promise<ActivationHelper<SDK, PrepareResult>> {
        return this.create(new PowerAuthTestServer(config))
    }

    // Getters

    /**
     * Default user identifier.
     */
    get userId(): string {
        return this.server.config.testUser?.userId ?? DEFAULT_USER_ID
    }

    /**
     * Application object.
     */
    get application(): Application {
        return this.appSetup.application
    }

    /**
     * Get Activation object. If activation is not known, then throws error.
     */
    get activation(): Activation {
        return this.withActivation(a => a)
    }

    /**
     * Activation object. If activation is not known, then throws error.
     */
    get activationId(): string {
        return this.withActivation(a => a.activationId)
    }

    /**
     * Return SDK instance. If there's no sdkFactory function set, then throws an error.
     */
    async getPowerAuthSdk(): Promise<SDK> {
        return await this.withSDK(a => a)
    }

    /**
     * Return SDK instance. If there's no such instance available, then throws an error.
     */
    get powerAuthSdk(): SDK {
        if (!this.sdkInstance) {
            throw new Error('PowerAuth SDK instance is not available')
        }
        return this.sdkInstance
    }

    /**
     * Result from prepare activation step. If result is not available then throws an error.
     */
    get prepareActivationResult(): PrepareResult {
        if (!this.prepareResultData) {
            throw new Error('Result from prepare activation is not available')
        }
        return this.prepareResultData
    }

    /**
     * Execute action with valid activation. If there's no activation then throws an error.
     * @param action Action to execute.
     * @returns Type returned from action.
     */
    withActivation<T>(action: (activation: Activation) => T): T {
        if (!this.activationData) {
            throw new Error('Activation is not available')
        }
        return action(this.activationData)
    }

    /**
     * Execute action with valid SDK instance. If there's no sdkFactory function set, then throws an error.
     * @param action Action to execute.
     * @returns Type returned from action.
     */
    async withSDK<T>(action: (sdk: SDK) => T): Promise<T> {
        let sdk: SDK
        if (!this.sdkInstance) {
            if (!this.createSdk) {
                throw new Error('SDK factory function is not set')
            }
            sdk = this.sdkInstance = await this.createSdk(this.appSetup, this.prepareData)
        } else {
            sdk = this.sdkInstance
        }
        return action(sdk)
    }

    // Activation management

    /**
     * Initialize activation.
     * @param userId User identifier. If nothing is provided, then default user identifier will be used.
     * @param otp Optional activation OTP.
     * @param otpValidation Optional activation OTP validation mode, that must be provided together with OTP.
     * @param maxFailureCount Optional maximum failure count. If not provided, value 5 will be used.
     * @returns Promise with `Activation` object in result.
     */
    async initActivation(
        userId: string = this.userId,
        otp: string | undefined = undefined,
        otpValidation: ActivationOtpValidation | undefined = undefined,
        maxFailureCount: number = DEFAULT_MAX_FAILED_ATTEMPTS
    ): Promise<Activation> {
        const activation = await this.server.activationInit(this.application, userId, otp, otpValidation, maxFailureCount)
        this.activationData = activation
        return activation
    }

    /**
     * Prepare activation. This function works only if helper is created with an optional prepare step.
     * The prepare step typically implements activation preparation with using a mobile SDK library.
     * If prepate step is not defined, then function throws an error.
     * @param prepareData Data for activation prepare step.
     * @returns Promise with void.
     */
    async prepareActivation(prepareData: ActivationHelperPrepareData | undefined = undefined): Promise<PrepareResult> {
        this.prepareResultData = await this.withActivation(activation => this.prepareActivationImpl(activation, prepareData))
        return this.prepareResultData
    }

    /**
     * Prepare activation implementation.
     */
    private prepareActivationImpl(activation: Activation, data: ActivationHelperPrepareData | undefined): Promise<PrepareResult> {
        if (!this.prepareStep) {
            throw new Error('Missing prepare step in ActivationHelper')
        }
        this.prepareData = data
        return this.prepareStep(this, activation, data)
    }

    /**
     * Commit activation.
     * @param otp Optional OTP, that should be used during commit phase of activation.
     * @param externalUserId Optional external user identifier.
     * @returns Promise with void.
     */
    async commitActivation(otp: string | undefined = undefined, externalUserId: string | undefined = undefined): Promise<void> {
        const result = await this.withActivation(activation => this.server.activationCommit(activation, otp, externalUserId))
        if (!result) throw new Error('Failed to comit activation')
    }

    /**
     * Initialize, prepare and commit activation in one function.
     * @param userId User identifier. If nothing is provided, then default user identifier will be used.
     * @param prepareData Data for activation prepare step.
     * @param maxFailureCount Optional maximum failure count. If not provided, value 5 will be used.
     * @returns Promise with `Activation` object in result.
     */
    async createActivation(
        userId: string = this.userId,
        prepareData: ActivationHelperPrepareData | undefined = undefined,
        maxFailureCount: number = DEFAULT_MAX_FAILED_ATTEMPTS
    ): Promise<Activation> {
        const otpValidation = prepareData?.otpValidation
        const otp = otpValidation == ActivationOtpValidation.ON_COMMIT ? prepareData?.otp : undefined
        const activation = await this.initActivation(userId, otp, otpValidation, maxFailureCount)
        await this.prepareActivationImpl(activation, prepareData)
        const status = await this.getActivationStatus()
        if (status == ActivationStatus.PENDING_COMMIT) {
            await this.commitActivation(otp)
        } else if (status != ActivationStatus.ACTIVE) {
            throw new Error(`Activation is in wrong state after create. State = ${status}`)
        }
        return activation
    }

    /**
     * Remove activation.
     * @param revokeRecoveryCodes If true (default) then also revokes all recovery codes associated with the activation.
     * @param externalUserId Optional external user identifier.
     * @returns Void promise. 
     */
    async removeActivation(revokeRecoveryCodes: boolean = true, externalUserId: string | undefined = undefined): Promise<void> {
        return await this.withActivation(async activation => {
            const removed = await this.server.activationRemove(activation, revokeRecoveryCodes, externalUserId)
            if (!removed) throw new Error('Failed to remove activation')
        })
    }

    /**
     * Block activation. 
     * @param reason Optional reason for activation block.
     * @param externalUserId Optional external user identifier.
     * @returns Void promise.
     */
    async blockActivation(reason: string | undefined = undefined, externalUserId: string | undefined = undefined): Promise<void> {
        return await this.withActivation(async activation => {
            const blocked = await this.server.activationBlock(activation, reason, externalUserId)
            if (!blocked) throw new Error('Failed to block activation')
        })
    }

    /**
     * Unblock activation. 
     * @param externalUserId Optional external user identifier.
     * @returns Void promise.
     */
    async unblockActivation(externalUserId: string | undefined = undefined): Promise<void> {
        return await this.withActivation(async activation => {
            const active = await this.server.activationUnblock(activation, externalUserId)
            if (!active) throw new Error('Failed to unblock activation')
        })
    }

    /**
     * Get activation status from the server.
     * @returns Promise with `ActivationStatus` in result.
     */
    async getActivationStatus(): Promise<ActivationStatus> {
        return (await this.getActivationDetail()).activationStatus
    }

    /**
     * Get activation detail from the server.
     * @param challenge Optional challenge. If provided, then V3.1 status blob is also produced in detail.
     * @returns Promise with `ActivationDetail` in result.
     */
    getActivationDetail(challenge: string | undefined = undefined): Promise<ActivationDetail> {
        return this.withActivation(activation => {
            return this.server.getActivationDetil(activation, challenge)
        })        
    }

    /**
     * Remove activation silently. All failures are ignored during the call.
     */
    async cleanup(): Promise<void> {
        try {
            if (await this.getActivationStatus() != ActivationStatus.REMOVED) {
                await this.removeActivation()
            }
        } catch (error) {
            // We don't care about errors in this function.
        }
    }
}