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
//

import {
    ApplicationSetup,
    PowerAuthTestServer, 
    TokenDigest,
    TokenDigestVerifyResult} from "../index"

export class TokenHelper {

    readonly server: PowerAuthTestServer
    readonly appSetup: ApplicationSetup

    static readonly signatureVersion = "3.1"
    static readonly signatureMagic = 'PowerAuth '

    // Construction

    /**
     * Construct TokenHelper with known server and app setup.
     * @param server `PowerAuthTestServer` instance.
     * @param appSetup `ApplicationSetup` instance
     */
     constructor(
        server: PowerAuthTestServer,
        appSetup: ApplicationSetup,
    ) {
        this.server = server
        this.appSetup = appSetup
    }

    /**
     * Parse token header produced in mobile SDK.
     * @param header HTTP header's value
     * @returns Object representing a token digest.
     */
    parseHeader(header: string): TokenDigest {
        if (!header.startsWith(TokenHelper.signatureMagic)) {
            throw new Error('Signature string must begin with PowerAuth')
        }
        const components = new Map<string, string>()
        header.substring(TokenHelper.signatureMagic.length)
            .split(', ')
            .forEach((keyValue, index) => {
                const equalIdx = keyValue.indexOf('=')
                if (equalIdx == -1) {
                    throw new Error(`Unknown component in header: ${keyValue}`)
                }
                const key = keyValue.substring(0, equalIdx)
                let value = keyValue.substring(equalIdx + 1)
                if (!value.startsWith('\"') || !value.endsWith('\"')) {
                    throw new Error(`Value is not closed in parenthesis:: ${keyValue}`)
                }
                components[key] = value.substring(1, value.length - 1)
            })
        const version       = components['version']
        const tokenId       = components['token_id']
        const tokenDigest   = components['token_digest']
        const nonce         = components['nonce']
        const timestamp     = components['timestamp']
        if (!version)       throw Error('Missing version in token header')
        if (!tokenId)       throw Error('Missing token_id in token header')
        if (!tokenDigest)   throw Error('Missing token_digest in token header')
        if (!nonce)         throw Error('Missing nonce in token header')
        if (!timestamp)     throw Error('Missing timestamp in token header')
        const timestampVal = parseInt(timestamp)
        if (Number.isNaN(timestampVal)) throw Error('Invalid timestamp value in token header')
        return {
            tokenId: tokenId,
            tokenDigest: tokenDigest,
            nonce: nonce,
            timestamp: timestampVal
        }
    }

    /**
     * Verify token digest on the server.
     * @param tokenDigest Token digest to verify in form of header's value or parsed header.
     * @returns Promise with result from verification.
     */
    verifyTokenDigest(tokenDigest: TokenDigest | string): Promise<TokenDigestVerifyResult> {
        const digest = typeof tokenDigest === 'string' ? this.parseHeader(tokenDigest) : tokenDigest
        return this.server.verifyTokenDigest(digest)
    }
}