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

import { createECDH, timingSafeEqual } from 'crypto'
import { Logger } from '../../src';
import { AES128_CBC_PKCS7_Decrypt, AES128_CBC_PKCS7_Encrypt, getRandomData, HMAC_SHA256, KDF_X9_63_SHA256 } from './MiniCrypto';
import { deriveSecretKeyFromIndex } from './MiniProtocolUtils';

const DUMP_ENVELOPE_KEYS = false

export interface EciesCryptogram {
    body?: string
    mac?: string
    key?: string
    nonce?: string
}

export interface EciesEnvelopeKey {
    encKey: Buffer
    macKey: Buffer
    ivKey: Buffer
}

const CURVE_NAME = 'prime256v1'
const ENVELOPE_KEY_SIZE = 48
const SUBKEY_SIZE = 16
const NONCE_SIZE = 16

export class EciesEnvelopeKey {
    encKey: Buffer
    macKey: Buffer
    ivKey: Buffer

    ephemeralKey: Buffer

    private constructor(key: Buffer, ephemeralKey: Buffer) {
        this.encKey = key.subarray(0, SUBKEY_SIZE)
        this.macKey = key.subarray(SUBKEY_SIZE, 2*SUBKEY_SIZE)
        this.ivKey = key.subarray(2*SUBKEY_SIZE, 3*SUBKEY_SIZE)
        this.ephemeralKey = ephemeralKey
    }

    static fromPublicKey(publicKey: Buffer, sh1: Buffer): EciesEnvelopeKey {
        const ephemeralKeyPair = createECDH(CURVE_NAME)
        const ephemeralPublicKey = Buffer.from(ephemeralKeyPair.generateKeys('base64', 'compressed'), 'base64')
        const sharedSecret = ephemeralKeyPair.computeSecret(publicKey)
        const info1 = Buffer.concat([sh1, ephemeralPublicKey])
        const key = KDF_X9_63_SHA256(sharedSecret, info1, ENVELOPE_KEY_SIZE)
        return new EciesEnvelopeKey(key, ephemeralPublicKey)
    }

    static fromPrivateKey(privateKey: Buffer, ephemeralPublicKey: Buffer, sh1: Buffer): EciesEnvelopeKey {
        const keyPair = createECDH(CURVE_NAME)
        keyPair.setPrivateKey(privateKey)
        const sharedSecret = keyPair.computeSecret(ephemeralPublicKey)
        const info1 = Buffer.concat([sh1, ephemeralPublicKey])
        const key = KDF_X9_63_SHA256(sharedSecret, info1, ENVELOPE_KEY_SIZE)
        return new EciesEnvelopeKey(key, ephemeralPublicKey)
    }

    deriveIvForNonce(nonce: Buffer): Buffer {
        return deriveSecretKeyFromIndex(this.ivKey, nonce)
    }

    dumpKeys(purpose: string) {
        Logger.info(`Envelope keys fot ${purpose}\n - enc: ${this.encKey.toString('hex')}\n - mac: ${this.macKey.toString('hex')}\n - iv : ${this.ivKey.toString('hex')}\n - ephemeral: ${this.ephemeralKey.toString('base64')}`)
    }
}

// Private encrypt & decrypt

function eciesEncrypt(envelopeKey: EciesEnvelopeKey, sh2: Buffer, data: Buffer, iv: Buffer, outCryptogram: EciesCryptogram) {
    const encrypted = AES128_CBC_PKCS7_Encrypt(envelopeKey.encKey, iv, data)
    const dataForMac = Buffer.concat([encrypted, sh2])
    const mac = HMAC_SHA256(envelopeKey.macKey, dataForMac)
    outCryptogram.body = encrypted.toString('base64')
    outCryptogram.mac = mac.toString('base64')
}

function eciesDecrypt(envelopeKey: EciesEnvelopeKey, sh2: Buffer, cryptogram: EciesCryptogram, iv: Buffer): Buffer {
    if (!cryptogram.body) {
        throw new Error("Cryptogram doesn't contain body")
    }
    if (!cryptogram.mac) {
        throw new Error("Cryptogram doesn't contain mac")
    }
    const body = Buffer.from(cryptogram.body, 'base64')
    const expectedMac = Buffer.from(cryptogram.mac, 'base64')

    const dataForMac = Buffer.concat([body, sh2])
    const mac = HMAC_SHA256(envelopeKey.macKey, dataForMac)
    if (!timingSafeEqual(mac, expectedMac)) {
        throw new Error('ECIES decrypt failed due to wrong MAC')
    }
    return AES128_CBC_PKCS7_Decrypt(envelopeKey.encKey, iv, body)
}

/**
 * ECIES encryptor to simulate PowerAuth mobile SDK
 */
export class EciesEncryptor {
    
    publicKey: Buffer | undefined
    sh1: Buffer
    sh2: Buffer

    envelopeKey: EciesEnvelopeKey | undefined
    ivForDecryption: Buffer | undefined

    constructor(publicKey: Buffer, sh1: Buffer, sh2: Buffer) {
        this.publicKey = publicKey
        this.sh1 = sh1
        this.sh2 = sh2
    }

    canEncryptRequest(): boolean {
        return this.publicKey != undefined
    }

    canDecryptResponse(): boolean {
        return this.envelopeKey != undefined && this.ivForDecryption != undefined
    }

    encryptRequestObject(object: any): EciesCryptogram {
        return this.encryptRequest(Buffer.from(JSON.stringify(object)))
    }

    encryptRequest(data: Buffer): EciesCryptogram {
        if (!this.canEncryptRequest()) {
            throw new Error('Encryptor is not ready for encryption')
        }
        this.envelopeKey = EciesEnvelopeKey.fromPublicKey(this.publicKey!, this.sh1)
        if (DUMP_ENVELOPE_KEYS) { this.envelopeKey.dumpKeys('encryptor') }
        let nonce = getRandomData(NONCE_SIZE)
        this.ivForDecryption = this.envelopeKey.deriveIvForNonce(nonce)

        let cryptogram: EciesCryptogram = {
            nonce: nonce.toString('base64'),
            key: this.envelopeKey.ephemeralKey.toString('base64')
        }
        eciesEncrypt(this.envelopeKey, this.sh2, data, this.ivForDecryption, cryptogram)
        return cryptogram
    }

    decryptResponse(cryptogram: EciesCryptogram): Buffer {
        if (!this.canDecryptResponse()) {
            throw new Error('Encryptor is not ready for decryption')
        }
        return eciesDecrypt(this.envelopeKey!, this.sh2, cryptogram, this.ivForDecryption!)
    }

    decryptResponseOject(cryptogram: EciesCryptogram): any {
        let decrypted = this.decryptResponse(cryptogram).toString('utf-8')
        return JSON.parse(decrypted)
    }
}

/**
 * ECIES decryptor to simulate PowerAuth Server part of ECIES
 */
 export class EciesDecryptor {
    
    privateKey: Buffer | undefined
    sh1: Buffer
    sh2: Buffer

    envelopeKey: EciesEnvelopeKey | undefined
    ivForEncryption: Buffer | undefined

    constructor(privateKey: Buffer, sh1: Buffer, sh2: Buffer) {
        this.privateKey = privateKey
        this.sh1 = sh1
        this.sh2 = sh2
    }

    canEncryptResponse(): boolean {
        return this.ivForEncryption != undefined && this.envelopeKey != undefined
    }

    canDecryptRequest(): boolean {
        return this.privateKey != undefined
    }

    decryptRequest(cryptogram: EciesCryptogram): Buffer {
        if (!this.canDecryptRequest()) {
            throw new Error('Decryptor is not ready for decryption')
        }
        let ephemeralPublicKey = cryptogram.key
        let nonce = cryptogram.nonce
        if (!ephemeralPublicKey) { throw new Error('Missing key in cryptogram') }
        if (!nonce) { throw new Error('Missing nonce in cryptogram')}

        this.envelopeKey = EciesEnvelopeKey.fromPrivateKey(this.privateKey!, Buffer.from(ephemeralPublicKey, 'base64'), this.sh1)
        if (DUMP_ENVELOPE_KEYS) { this.envelopeKey.dumpKeys('decryptor') }
        this.ivForEncryption = this.envelopeKey.deriveIvForNonce(Buffer.from(nonce, 'base64'))
        return eciesDecrypt(this.envelopeKey, this.sh2, cryptogram, this.ivForEncryption)
    }

    decryptRequestObject(cryptogram: EciesCryptogram): any {
        let decrypted = this.decryptRequest(cryptogram).toString('utf-8')
        return JSON.parse(decrypted)
    }

    encryptResponse(data: Buffer): EciesCryptogram {
        if (!this.canEncryptResponse()) {
            throw new Error('Decryptor is not ready for encryption')
        }
        let cryptogram: EciesCryptogram = {}
        eciesEncrypt(this.envelopeKey!, this.sh2, data, this.ivForEncryption!, cryptogram)
        return cryptogram
    }

    encryptResponseObject(object: any): EciesCryptogram {
        let data = Buffer.from(JSON.stringify(object))
        return this.encryptResponse(data)
    }
}