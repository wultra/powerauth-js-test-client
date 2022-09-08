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

import { AES_KDF, HMAC_SHA256 } from "./MiniCrypto"

export interface SignatureKeys {
    possessionKey: Buffer
    knowledgeKey: Buffer
    biometryKey: Buffer
    transportKey: Buffer
    vaultKey: Buffer
}

export function deriveAllSecretKeys(masterSecret: Buffer): SignatureKeys {
    return {
        possessionKey: AES_KDF(masterSecret, 1),
        knowledgeKey: AES_KDF(masterSecret, 2),
        biometryKey: AES_KDF(masterSecret, 3),
        transportKey: AES_KDF(masterSecret, 1000),
        vaultKey: AES_KDF(masterSecret, 2000)
    }
}

export function reduceSharedSecret(secret: Buffer): Buffer {
    if (secret.length != 32) {
        throw new Error('Secret for reduce must be 32 bytes long')
    }
    const reducedSize = secret.length / 2
    const result = Buffer.allocUnsafe(reducedSize)
    for (let i = 0; i < reducedSize; i++) {
        result[i] = secret[i] ^ secret[i + reducedSize]
    }
    return result
}

export function deriveSecretKeyFromIndex(masterSecret: Buffer, index: Buffer) {
    const derived = HMAC_SHA256(masterSecret, index)
    return reduceSharedSecret(derived)
}