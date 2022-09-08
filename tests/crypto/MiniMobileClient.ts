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

import { ActivationPrepareResult, ApplicationSetup } from "../../src";
import { EcKeyAgreement, EcKeyPair, HMAC_SHA256, SHA256 } from "./MiniCrypto";
import { EciesCryptogram, EciesEncryptor } from "./MiniEcies";
import { deriveAllSecretKeys, reduceSharedSecret, SignatureKeys } from "./MiniProtocolUtils";

// TODO: Documentation

export interface CreateActivationData {
    activationName: string
    platform: string
    deviceInfo: string
    extras?: string
    activationOtp?: string
}

export interface CreateActivationResponse {
    activationId: string
    serverPublicKey: string
    ctrData: string
    activationRecovery?: RecoveryData
}

export interface RecoveryData {
    recoveryCode: string
    puk: string
}

export interface ActivationData {
    devicePrivateKey: Buffer
    devicePublicKey: Buffer
    serverPublicKey: Buffer
    keys: SignatureKeys
    activationId: string

    recoveryData?: RecoveryData
}

interface PendingActivationData {
    deviceKeyPair: EcKeyPair
    encryptor: EciesEncryptor
}

export class MiniMobileClient {

    setup: ApplicationSetup
    activationData: ActivationData | undefined
    private pedningActivationData: PendingActivationData | undefined

    constructor(config: ApplicationSetup) {
        this.setup = config
    }

    hasActivation(): boolean {
        return this.activationData != undefined
    }

    hasPendingActivation(): boolean {
        return this.pedningActivationData != undefined
    }

    createActivation(activationData: CreateActivationData): EciesCryptogram {
        if (this.hasPendingActivation() || this.hasActivation()) {
            throw new Error('Activation is pending or active')
        }
        // Create new device key-pair
        let deviceKeyPair = EcKeyPair.create()
        let encryptor = this.encryptorForApplicationScope('/pa/activation')
        this.pedningActivationData = {
            deviceKeyPair: deviceKeyPair,
            encryptor: encryptor
        }
        // Encrypt request
        
        let payload = { ...activationData, devicePublicKey: deviceKeyPair.formattedPublicKey() }
        return encryptor.encryptRequestObject(payload)
    }

    commitActivation(activationResponse: ActivationPrepareResult) {
        if (!this.hasPendingActivation()) {
            throw new Error('Missing pending activation')
        }
        let pending = this.pedningActivationData!
        let encryptor = pending.encryptor
        let responseData = encryptor.decryptResponseOject({
            body: activationResponse.encryptedData,
            mac: activationResponse.mac
        }) as CreateActivationResponse
        if (responseData.activationId != activationResponse.activationId) {
            throw new Error("Encrypted activationId doesn't match received")
        }
        let serverPublicKey = Buffer.from(responseData.serverPublicKey, 'base64')
        let keyAgreement = new EcKeyAgreement(pending.deviceKeyPair)
        let masterSecret = keyAgreement.computeSharedSecret(serverPublicKey)
        let reducedSecret = reduceSharedSecret(masterSecret)
        this.activationData = {
            devicePrivateKey: pending.deviceKeyPair.privateKey(),
            devicePublicKey: pending.deviceKeyPair.publicKey(),
            serverPublicKey: serverPublicKey,
            keys: deriveAllSecretKeys(reducedSecret),
            activationId: activationResponse.activationId
        }
        this.pedningActivationData = undefined
    }

    removeActivation() {
        this.pedningActivationData = undefined
        this.activationData = undefined
    }


    encryptorForApplicationScope(sh1: string): EciesEncryptor {
        let sharedInfo1 = Buffer.from(sh1)
        let sharedInfo2 = SHA256(Buffer.from(this.setup.appSecret))
        let pubKey = Buffer.from(this.setup.masterServerPublicKey, 'base64')
        return new EciesEncryptor(pubKey, sharedInfo1, sharedInfo2)
    }

    encryptorForActivationScope(sh1: string): EciesEncryptor {
        if (!this.hasActivation()) {
            throw new Error('Missing activation')
        }
        let sharedInfo1 = Buffer.from(sh1)
        let sharedInfo2 = HMAC_SHA256(this.activationData!.keys.transportKey, Buffer.from(this.setup.appSecret))
        let pubKey = this.activationData!.serverPublicKey
        return new EciesEncryptor(pubKey, sharedInfo1, sharedInfo2)
    }
}