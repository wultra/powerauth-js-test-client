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
    createHmac,
    createHash,
    createCipheriv,
    createDecipheriv,
    createECDH,
    randomBytes,
    BinaryToTextEncoding,
    ECDH,
    ECDHKeyFormat
 } from 'crypto'
import { Logger } from '../../src'

export function getRandomData(size: number): Buffer {
    return randomBytes(size)
}

// ---------------------------------------------------------------------------
// Hash

export const HASH_NAME = 'sha256'
export const HASH_LENGTH = 32

export function SHA256(data: Buffer): Buffer {
    const hash = createHash(HASH_NAME)
    hash.update(data)
    return hash.digest()
}

// ---------------------------------------------------------------------------
// MAC

export function HMAC_SHA256(key: Buffer, data: Buffer, macLength: number = HASH_LENGTH): Buffer {
    const hmac = createHmac(HASH_NAME, key)
    hmac.update(data)
    let result = hmac.digest()
    if (macLength < HASH_LENGTH) {
        result = result.subarray(0, macLength)
    }
    return result
}

// ---------------------------------------------------------------------------
// AES-CBC

const AES_CBC = 'aes-128-cbc'

export function AES128_CBC_PKCS7_Encrypt(key: Buffer, iv: Buffer, plaintext: Buffer): Buffer {
    const cipher = createCipheriv(AES_CBC, key, iv)
    const buffers = [ cipher.update(plaintext), cipher.final() ]
    return Buffer.concat(buffers)
}

export function AES128_CBC_PKCS7_Decrypt(key: Buffer, iv: Buffer, ciphertext: Buffer): Buffer {
    const cipher = createDecipheriv(AES_CBC, key, iv)
    const buffers = [ cipher.update(ciphertext), cipher.final() ]
    return Buffer.concat(buffers)
}

// ---------------------------------------------------------------------------
// Key derivation

export function KDF_X9_63_SHA256(secret: Buffer, info1: Buffer, keySize: number): Buffer {
    let result = Buffer.allocUnsafe(0)
    let counter = 1
    while (result.length < keySize) {
        const counterBytes = Buffer.allocUnsafe(4)
        counterBytes.writeUInt32BE(counter)
        const iteration = SHA256(Buffer.concat([secret, counterBytes, info1]))
        result = Buffer.concat([result, iteration])
        counter++
    }
    return result.subarray(0, keySize)
}

export function AES_KDF(secret: Buffer, index: number): Buffer {
    // Currently, we don't use indexes greater than 2^32, so we can be tricky here
    // and store 64 bit counter in two steps.
    const zero = Buffer.alloc(12)
    const indexData = Buffer.allocUnsafe(4)
    indexData.writeUint32BE(index)
    const key = Buffer.concat([zero, indexData])
    const cipher = createCipheriv('aes-128-ecb', secret, null)
    const result = cipher.update(key)
    cipher.final()
    return result
}

// ---------------------------------------------------------------------------
// ECC

export const EC_CURVE_NAME = 'prime256v1'

export class EcKeyPair {

    keyPair: ECDH

    publicKey(format: ECDHKeyFormat = 'compressed'): Buffer {
        return this.keyPair.getPublicKey(null, format)
    }

    privateKey(): Buffer {
        return this.keyPair.getPrivateKey()
    }

    formattedPublicKey(encoding: BinaryToTextEncoding = 'base64', format: ECDHKeyFormat = 'compressed'): string {
        return this.keyPair.getPublicKey(encoding, format)
    }

    formattedPrivateKey(encoding: BinaryToTextEncoding = 'base64'): string {
        return this.keyPair.getPrivateKey(encoding)
    }

    constructor(keyPair: ECDH) {
        this.keyPair = keyPair
    }

    static create(): EcKeyPair {
        const keyPair = createECDH(EC_CURVE_NAME)
        keyPair.generateKeys()
        return new EcKeyPair(keyPair)
    }

    static import(privateKey: Buffer): EcKeyPair {
        const keyPair = createECDH(EC_CURVE_NAME)
        keyPair.setPrivateKey(privateKey)
        return new EcKeyPair(keyPair)
    }
}

export class EcKeyAgreement {
    keyPair: EcKeyPair
    constructor(keyPair: EcKeyPair) {
        this.keyPair = keyPair
    }

    computeSharedSecret(publicKey: Buffer): Buffer {
        return this.keyPair.keyPair.computeSecret(publicKey)
    } 
}