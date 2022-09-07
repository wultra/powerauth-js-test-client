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
            let plain = Buffer.from(td.plain, 'hex')
            let key = Buffer.from(td.key, 'hex')
            let iv = Buffer.from(td.iv, 'hex')
            let enc = Buffer.from(td.enc, 'hex')

            let encrypted = AES128_CBC_PKCS7_Encrypt(key, iv, plain)
            let encryptedHex = encrypted.toString('hex')
            expect(encryptedHex).toEqual(td.enc)

            let decrypted = AES128_CBC_PKCS7_Decrypt(key, iv, enc)
            let decryptedHex = decrypted.toString('hex')
            expect(decryptedHex).toEqual(td.plain)
        })
    })

    test('Test HMAC-SHA256', () => {
        HmacTestData.testVectors.forEach(td => {
            let key = Buffer.from(td.key, 'hex')
            let data = Buffer.from(td.data, 'hex')
            let hmac = Buffer.from(td.hmac, 'hex')

            let mac = HMAC_SHA256(key, data, hmac.length)
            let macHex = mac.toString('hex')
            expect(macHex).toEqual(td.hmac)
        })
    })
    
    test('Test X9.63 KDF', () => {
        KdfTestData.testVectors.forEach(td => {
            let secret = Buffer.from(td.secret, 'hex')
            let sinfo = Buffer.from(td.sinfo, 'hex')
            let expected = Buffer.from(td.expected, 'hex')

            let derived = KDF_X9_63_SHA256(secret, sinfo, expected.length)
            let derivedHex = derived.toString('hex')
            expect(derivedHex).toEqual(td.expected)
        })
    })
})