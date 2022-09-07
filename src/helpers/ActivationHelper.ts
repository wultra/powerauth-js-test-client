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


export type ActivationPrepareFunc = (helper: ActivationHelper, activation: Activation, otp: string | undefined) => Promise<void>

/**
 * The `ActivationHelper` class helps with various activation related tasks.
 */
export class ActivationHelper {

    readonly server: PowerAuthTestServer
    readonly appSetup: ApplicationSetup
    readonly prepareStep: ActivationPrepareFunc | undefined

    activation: Activation | undefined

    disableAutoCommitSupport = false

    // Construction

    /**
     * Construct ActivationHelper with known server and app setup.
     * @param server `PowerAuthTestServer` instance.
     * @param appSetup `ApplicationSetup` instance
     */
    constructor(
        server: PowerAuthTestServer,
        appSetup: ApplicationSetup,
        prepareStep: ActivationPrepareFunc | undefined = undefined
    ) {
        this.server = server
        this.appSetup = appSetup
        this.prepareStep = prepareStep
    }

    /**
     * Create instance of `ActivationHelper` with default or with provided `ApplicationConfig`. The function also 
     * guarantees that connection to the server works.
     * @param server `PowerAuthTestServer` instance.
     * @param applicationConfig `ApplicationConfig` instance or undefined, if default configuration will be used.
     * @param prepareStep Optional closure with prepare step implementation.
     * @returns Promise with `ActivationHelper` instance in result.
     */
    static async create(
        server: PowerAuthTestServer,
        applicationConfig: ApplicationConfig | undefined = undefined,
        prepareStep: ActivationPrepareFunc | undefined = undefined
    ): Promise<ActivationHelper> {
        await server.connect()
        let appSetup = await server.prepareApplicationFromConfiguration(applicationConfig)
        return new ActivationHelper(server, appSetup, prepareStep)
    }

    /**
     * Create instance of `ActivationHelper` with server created with server's configuration. The function also 
     * guarantees that connection to the server works.
     * @param config Configuration for `PowerAuthTestServer`.
     * @returns Promise with `ActivationHelper` instance in result.
     */
    static async createWithConfig(
        config: Config,
        prepareStep: ActivationPrepareFunc | undefined = undefined
    ): Promise<ActivationHelper> {
        return this.create(new PowerAuthTestServer(config), undefined, prepareStep)
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
     * Activation object. If activation is not known, then throws error.
     */
    get activationId(): string {
        return this.withActivation(a => a.activationId)
    }

    /**
     * Execute action with valid activation. If there's no activation then throws an error.
     * @param action Action to execute.
     * @returns Type returned from action.
     */
    withActivation<T>(action: (activation: Activation) => T): T {
        if (this.activation == undefined) {
            throw new Error('Activation is not available')
        }
        return action(this.activation)
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
        let activation = await this.server.activationInit(this.application, userId, otp, otpValidation, maxFailureCount)
        this.activation = activation
        return activation
    }

    /**
     * Prepare activation. This function works only if helper is created with an optional prepare step.
     * The prepare step typically implements activation preparation with using a mobile SDK library.
     * If prepate step is not defined, then function throws an error.
     * @param otp Optional OTP that should be used during key-exchange phase of activation.
     * @returns Promise with void.
     */
    async prepareActivation(otp: string | undefined = undefined): Promise<void> {
        await this.withActivation(async activation => await this.prepareActivationImpl(activation, otp))
    }

    /**
     * Prepare activation implementation.
     */
    private async prepareActivationImpl(activation: Activation, otp: string | undefined): Promise<void> {
        if (this.prepareStep == undefined) {
            throw new Error('Missing prepare step in ActivationHelper')
        }
        await this.prepareStep(this, activation, otp)
    }

    /**
     * Commit activation.
     * @param otp Optional OTP, that should be used during commit phase of activation.
     * @returns Promise with void.
     */
    async commitActivation(otp: string | undefined = undefined): Promise<void> {
        await this.withActivation(async activation => await this.server.activationCommit(activation, otp))
    }

    /**
     * Initialize, prepare and commit activation in one function.
     * @param userId User identifier. If nothing is provided, then default user identifier will be used.
     * @param otp Optional activation OTP.
     * @param otpValidation Optional activation OTP validation mode, that must be provided together with OTP.
     * @param maxFailureCount Optional maximum failure count. If not provided, value 5 will be used.
     * @returns Promise with `Activation` object in result.
     */
    async createActivation(
        userId: string = this.userId,
        otp: string | undefined = undefined,
        otpValidation: ActivationOtpValidation | undefined = undefined,
        maxFailureCount: number = DEFAULT_MAX_FAILED_ATTEMPTS
    ): Promise<Activation> {
        let activation = await this.initActivation(userId, otp, otpValidation, maxFailureCount)
        let otpOnKeyExchange = otp != undefined && otp == ActivationOtpValidation.ON_KEY_EXCHANGE ? otp : undefined
        let otpOnCommit = otp != undefined && otp == ActivationOtpValidation.ON_COMMIT ? otp : undefined
        await this.prepareActivationImpl(activation, otpOnKeyExchange)
        let status = await this.getActivationStatus()
        if (status == ActivationStatus.PENDING_COMMIT) {
            await this.commitActivation(otpOnCommit)
        }
        return activation
    }

    /**
     * Remove activation. Function throws an error if no such activation is available.
     * @returns Void promise.
     */
    async removeActivation(revokeRecoveryCodes: boolean = true, externalUserId: string | undefined = undefined): Promise<void> {
        return await this.withActivation(async activation => {
            let status = (await this.server.getActivationDetil(activation)).activationStatus
            if (status != ActivationStatus.REMOVED) {
                await this.server.activationRemove(activation, revokeRecoveryCodes, externalUserId)
            }
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
    async getActivationDetail(challenge: string | undefined = undefined): Promise<ActivationDetail> {
        return await this.withActivation(async (activation) => {
            return await this.server.getActivationDetil(activation, challenge)
        })        
    }

    /**
     * Remove activation silently. All failures are ignored during the call.
     */
    async cleanup(): Promise<void> {
        try {
            await this.removeActivation()
        } catch (error) {
            // We don't care about errors in this function.
        }
    }

}