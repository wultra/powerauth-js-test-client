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
    HMAC_SHA256,
    AES128_CBC_PKCS7_Decrypt,
    AES128_CBC_PKCS7_Encrypt, 
    KDF_X9_63_SHA256 } from "../MiniCrypto";
import {
    deriveAllSecretKeys } from "../MiniProtocolUtils";


// ---------------------------------------------------------------
// AES test data

interface AesTestVector {
    plain: string
    key: string
    iv: string
    enc: string
}
interface AesTestData {
    testVectors: AesTestVector[]
}
import * as AesTestData from './test-data/aes-cbc-pkcs7.json';

// HMAC test data

interface HmacTestVector {
    key: string
    data: string
    hmac: string
}
interface HmacTestData {
    testVectors: HmacTestVector[]
}
import * as HmacTestData from './test-data/hmac.json';

// X9.63 KDF test data

interface KdfTestVector {
    secret: string
    sinfo: string
    expected: string
}
interface KdfTestData {
    testVectors: KdfTestVector[]
}
import * as KdfTestData from './test-data/kdf-x963.json';

// ---------------------------------------------------------------
// Tests

describe('MiniCrypto functions tests', () => {

    test('AES Encrypt & Decrypt', () => {
        AesTestData.testVectors.forEach(td => {
            const plain = Buffer.from(td.plain, 'hex')
            const key = Buffer.from(td.key, 'hex')
            const iv = Buffer.from(td.iv, 'hex')
            const enc = Buffer.from(td.enc, 'hex')

            const encrypted = AES128_CBC_PKCS7_Encrypt(key, iv, plain)
            const encryptedHex = encrypted.toString('hex')
            expect(encryptedHex).toEqual(td.enc)

            const decrypted = AES128_CBC_PKCS7_Decrypt(key, iv, enc)
            const decryptedHex = decrypted.toString('hex')
            expect(decryptedHex).toEqual(td.plain)
        })
    })

    test('Test HMAC-SHA256', () => {
        HmacTestData.testVectors.forEach(td => {
            const key = Buffer.from(td.key, 'hex')
            const data = Buffer.from(td.data, 'hex')
            const hmac = Buffer.from(td.hmac, 'hex')

            const mac = HMAC_SHA256(key, data, hmac.length)
            const macHex = mac.toString('hex')
            expect(macHex).toEqual(td.hmac)
        })
    })
    
    test('Test X9.63 KDF', () => {
        KdfTestData.testVectors.forEach(td => {
            const secret = Buffer.from(td.secret, 'hex')
            const sinfo = Buffer.from(td.sinfo, 'hex')
            const expected = Buffer.from(td.expected, 'hex')

            const derived = KDF_X9_63_SHA256(secret, sinfo, expected.length)
            const derivedHex = derived.toString('hex')
            expect(derivedHex).toEqual(td.expected)
        })
    })
})