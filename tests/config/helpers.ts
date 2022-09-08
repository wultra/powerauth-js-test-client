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

import { ActivationHelper, ActivationHelperPrepareData, ActivationOtpValidation, Config } from "../../src";
import { CreateActivationData, MiniMobileClient } from "../crypto/MiniMobileClient";
import { testServerConfiguration } from "./config";

export type TypedActivationHelper = ActivationHelper<MiniMobileClient, boolean>

/**
 * Create activation helper with configured prepare step. This helper can automatically create activation
 * and move it to 'ACTIVE' state.
 */
export async function createActivationHelper(config: Config | undefined = undefined, prepareData: ActivationHelperPrepareData | undefined = undefined): Promise<TypedActivationHelper> {
    // Acquire config
    let cfg = config ?? await testServerConfiguration()
    let activationData = prepareData?.customData?.get('activationPayload') as CreateActivationData
    let activationPayload = activationData ?? {
        activationName: 'activation-test',
        platform: 'nodejs',
        deviceInfo: 'nodejs-tests',
        extras: 'some-extras'
    }
    // Create activation helper with using MiniMobileClient as SDK implementation
    let helper = await ActivationHelper.createWithConfig<MiniMobileClient,boolean>(cfg)
    helper.createSdk = async (appSetup, _) => {
        return new MiniMobileClient(appSetup)
    }
    helper.prepareStep = async (helper, activation, prepareData) => {
        let sdk = await helper.getPowerAuthSdk()
        // Encrypt inner activation data with fake mobile client
        let otp = prepareData?.otpValidation == ActivationOtpValidation.ON_KEY_EXCHANGE ? prepareData.otp : undefined
        let encryptedPayload = sdk.createActivation({...activationPayload, activationOtp: otp})
        // Prepare activation on the server
        let response = await helper.server.activationPrepare({
            activationCode: activation.activationCode!,
            applicationKey: helper.appSetup.appKey,
            ephemeralPublicKey: encryptedPayload.key!,
            encryptedData: encryptedPayload.body!,
            mac: encryptedPayload.mac!,
            nonce: encryptedPayload.nonce!
        })
        // Commit activation on the mini client
        sdk.commitActivation(response)
        return true
    }
    return helper
}

/**
 * Create fully prepared activation in ACTIVE state.
 */
export async function createActivationWithActivationHelper(config: Config | undefined = undefined, prepareData: ActivationHelperPrepareData | undefined = undefined): Promise<TypedActivationHelper> {
    let helper = await createActivationHelper(config, prepareData)
    await helper.createActivation(helper.userId, prepareData)
    return helper
}