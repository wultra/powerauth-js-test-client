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

import { Base64 } from "js-base64"
import {
    ApplicationSetup,
    OnlineSignature,
    PowerAuthTestServer } from "../index"

export class SignatureHelper {

    readonly server: PowerAuthTestServer
    readonly appSetup: ApplicationSetup

    static readonly signatureVersion = "3.1"
    static readonly signatureMagic = 'PowerAuth '

    // Construction

    /**
     * Construct SignatureHelper with known server and app setup.
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
     * Verify online signature on the server.
     * @param method Method supported on the endpoint.
     * @param uriId URI identifier
     * @param body String with request body or map with URL parameters.
     * @param signature Calculated signature
     * @returns Promise with boolean result.
     */
    async verifyOnlineSignature(method: string, uriId: string, body: string | Map<string, string> | undefined, signature: string): Promise<boolean> {
        const sig = this.parseHeader(signature)
        const bodyData = typeof body === 'string' ? body : this.normalizeParametersForGetRequest(body) 
        const normalizedData = this.normalizeDataForOnlineSignature(method, uriId, bodyData, sig.nonce)
        const result = await this.server.verifyOnlineSignature({
            activationId: sig.activationId,
            applicationKey: sig.applicationKey,
            signatureType: sig.signatureType,
            signatureVersion: sig.signatureVersion,
            signature: sig.signature,
            data: normalizedData
        })
        return result.signatureValid
    }

    /**
     * Verify offline signature on the server.
     * @param activationId Activation identifier.
     * @param uriId URI identifier
     * @param data String with signed data.
     * @param nonceBase64 Pre-agreed nonce in Base64 format.
     * @param allowBiometry If true, then biometric signature is allowed.
     * @param signature Calculated signature.
     * @returns Promise with boolean result.
     */
    async verifyOfflineSignature(activationId: string, uriId: string, data: string | undefined, nonceBase64: string, allowBiometry: boolean, signature: string) {
        const normalizedData = this.normalizeDataForOfflineSignature(uriId, data, nonceBase64)
        const result = await this.server.verifyOfflineSignature({
            activationId: activationId,
            data: normalizedData,
            signature: signature,
            allowBiometry: allowBiometry
        })
        return result.signatureValid
    }

    /**
     * Normalize data for online siganture verification purposes.
     * @param method HTTP method.
     * @param uriId URI Identifier.
     * @param data String with signed data.
     * @param nonceBase64 Nonce in Base64 format.
     * @returns String with normalized data.
     */
    normalizeDataForOnlineSignature(method: string, uriId: string, data: string | undefined, nonceBase64: string): string {
        const dataB64 = Base64.encode(data ?? '')
        const uriIdB64 = Base64.encode(uriId)
        return [ method, uriIdB64, nonceBase64, dataB64 ].join('&')
    }

    /**
     * Normalize key-value pairs representing a parameters for GET (or similar) request. Such string then can be used
     * as a body for signature verification.
     * @param params Paramters for request
     * @returns Normalized
     */
    normalizeParametersForGetRequest(params: Map<string, string> | undefined): string {
        if (params === undefined) {
            return ''
        }
        const sorted = new Map([...params].sort())
        const result: string[] = []
        sorted.forEach((key, value) => {
            const keyEncoded = encodeURIComponent(key)
            const valueEncoded = encodeURIComponent(value)
            result.push(`${keyEncoded}=${valueEncoded}`)
        })
        return result.join('&')
    }

    /**
     * Normalize data for offline siganture verification purposes.
     * @param uriId URI Identifier.
     * @param data String with signed data.
     * @param nonceBase64 Pre-agreed nonce in Base64 format.
     * @returns String with normalized data.
     */
    normalizeDataForOfflineSignature(uriId: string, data: string | undefined, nonceBase64: string): string {
        return this.normalizeDataForOnlineSignature('POST', uriId, data, nonceBase64)
    }

    /**
     * Parse authentication header produced in mobile SDK.
     * @param header HTTP header's value.
     * @returns Object representing an online signature.
     */
    parseHeader(header: string): OnlineSignature {
        if (!header.startsWith(SignatureHelper.signatureMagic)) {
            throw new Error('Signature string must begin with PowerAuth')
        }
        const components = new Map<string, string>()
        header.substring(SignatureHelper.signatureMagic.length)
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
        const version       = components['pa_version']
        const activationId  = components['pa_activation_id']
        const nonce         = components['pa_nonce']
        const signatureType = components['pa_signature_type']
        const signature     = components['pa_signature']
        if (!version)       throw new Error('Missing pa_version in PA signature')
        if (!activationId)  throw new Error('Missing pa_activation_id in PA signature')
        if (!nonce)         throw new Error('Missing pa_nonce in PA signature')
        if (!signatureType) throw new Error('Missing pa_signature_type in PA signature')
        if (!signature)     throw new Error('Missing pa_signature in PA signature')
        return {
            signature: signature,
            activationId: activationId,
            applicationKey: this.appSetup.appKey,
            nonce: nonce,
            signatureType: signatureType.toUpperCase(),
            signatureVersion: version
        }
    }
}

