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

import { SignedOfflineDataPayload } from "../src"
import { parseOfflinePayloadData } from "../src/private/OfflineDataParser"

describe('Utility function parseOfflinePayloadData()', () => {
    test('Offline payload parser should work', () => {
        const data: SignedOfflineDataPayload = {
            offlineData: '',
            nonce: ''
        }
        data.offlineData = [
            "SIGNED DATA",
            "NONCE-XYZ",
            "0master-key-signature"
        ].join('\n')

        parseOfflinePayloadData(data)

        expect(data.parsedNonce).toBe('NONCE-XYZ')
        expect(data.parsedSignature).toBe('master-key-signature')
        expect(data.parsedSigningKey).toBe('0')
        expect(data.parsedData).toBe('SIGNED DATA')
        expect(data.parsedSignedData).toBe('SIGNED DATA\nNONCE-XYZ\n0')
        
        data.offlineData = [
            "SIGNED DATA line 1",
            "",
            "SIGNED_DATA line 3",
            "NONCE2",
            "1OTHER-SIGNATURE"
        ].join('\n')
        
        parseOfflinePayloadData(data)

        expect(data.parsedNonce).toBe('NONCE2')
        expect(data.parsedSignature).toBe('OTHER-SIGNATURE')
        expect(data.parsedSigningKey).toBe('1')
        expect(data.parsedData).toBe('SIGNED DATA line 1\n\nSIGNED_DATA line 3')
        expect(data.parsedSignedData).toBe('SIGNED DATA line 1\n\nSIGNED_DATA line 3\nNONCE2\n1')

        data.offlineData = [
            "",
            "NONCE3",
            "1SIG_X"
        ].join('\n')
        
        parseOfflinePayloadData(data)

        expect(data.parsedNonce).toBe('NONCE3')
        expect(data.parsedSignature).toBe('SIG_X')
        expect(data.parsedSigningKey).toBe('1')
        expect(data.parsedData).toBe('')
        expect(data.parsedSignedData).toBe('\nNONCE3\n1')

        data.offlineData = [
            "SIGNED DATA line 1",
            "",
            "SIGNED_DATA line 3",
            "NONCE2",
            "3OTHER-SIGNATURE"
        ].join('\n')

        expect(() => parseOfflinePayloadData(data)).toThrow()
    })
})