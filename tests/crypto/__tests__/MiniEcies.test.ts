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

import { EcKeyPair } from "../MiniCrypto"
import { EciesDecryptor, EciesEncryptor } from "../MiniEcies"

describe('Validate ECIES functionality', () => {
    test('ECIES encrypt and decrypt', () => {
        let sh1 = Buffer.from('/shared/secret1')
        let sh2 = Buffer.from('/shared/secret2')

        let server = EcKeyPair.create()
        let clientEncryptor = new EciesEncryptor(server.publicKey(), sh1, sh2)
        let serverDecryptor = new EciesDecryptor(server.privateKey(), sh1, sh2)

        let requestData = {
            hello: "world!",
            password: "nbusr123"
        }

        let responseData = {
            something: "isWrong",
            username: "unknown"
        }

        // [ 1 ] Client: Generate encrypted request
        let encryptedRequest = clientEncryptor.encryptRequestObject(requestData)
        expect(encryptedRequest).toBeDefined()

        // [ 2 ] Server: Decrypt request data
        let decrypedRequest = serverDecryptor.decryptRequestObject(encryptedRequest)
        expect(decrypedRequest).toEqual(requestData)

        // [ 3 ] Server: Encrypt response
        let encryptedResponse = serverDecryptor.encryptResponseObject(responseData)
        expect(encryptedResponse).toBeDefined()

        // [ 4 ] Client: Decrypt response
        let decryptedRespnse = clientEncryptor.decryptResponseOject(encryptedResponse)
        expect(decryptedRespnse).toEqual(responseData)
    })
})