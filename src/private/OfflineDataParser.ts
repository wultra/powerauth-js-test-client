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

import { SignedOfflineDataPayload, SigningKey } from "../model/Signature";

export function parseOfflinePayloadData(data: SignedOfflineDataPayload): SignedOfflineDataPayload {
    const componetns = data.offlineData.split('\n')
    const cc = componetns.length
    if (cc > 2) {
        const nonce      = componetns[cc - 2]
        const sigWithKey = componetns[cc - 1]
        const keyType    = sigWithKey.charAt(0)
        const signature  = sigWithKey.substring(1)
        if (keyType !== SigningKey.KEY_SERVER_PRIVATE && keyType !== SigningKey.KEY_SERVER_MASTER_PRIVATE) {
            throw new Error(`Unsupported signing key ${keyType}`)
        }
        const payload = componetns.slice(0, cc - 2).join('\n')

        data.parsedNonce        = nonce
        data.parsedSigningKey   = keyType
        data.parsedSignature    = signature
        data.parsedData         = payload
        data.parsedSignedData   = `${payload}\n${nonce}\n${keyType}`
    }
    return data
}