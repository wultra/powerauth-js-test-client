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

import { deriveAllSecretKeys } from '../MiniProtocolUtils'

// AES-KDF test data

interface AesKdfTestVector {
    masterSecretKey: string
    signaturePossessionKey: string
    signatureKnowledgeKey: string
    signatureBiometryKey: string
    transportKey: string
    vaultEncryptionKey: string
}
interface AesKdfTestData {
    testVectors: AesKdfTestVector[]
}
import * as AesKdfTestData from './test-data/aes-kdf.json';

describe('Test PowerAuth protocol utils', () => {
    test('Test AES-KDF', () => {
        AesKdfTestData.testVectors.forEach(td => {
            const masterSecret = Buffer.from(td.masterSecretKey, 'base64')
            const derived = deriveAllSecretKeys(masterSecret)
            expect(derived.possessionKey.toString('base64')).toEqual(td.signaturePossessionKey)
            expect(derived.knowledgeKey.toString('base64')).toEqual(td.signatureKnowledgeKey)
            expect(derived.biometryKey.toString('base64')).toEqual(td.signatureBiometryKey)
            expect(derived.vaultKey.toString('base64')).toEqual(td.vaultEncryptionKey)
            expect(derived.transportKey.toString('base64')).toEqual(td.transportKey)
        })
    })
})