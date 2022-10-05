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

import { ActivationStatus } from "./Activation"

/**
 * Enum representing a type of PowerAuth symmetric signature
 */
export enum SignatureType {
    POSSESSION = "POSSESSION",
    POSSESSION_KNOWLEDGE = "POSSESSION_KNOWLEDGE",
    POSSESSION_BIOMETRY = "POSSESSION_BIOMETRY",
}

/**
 * Object representing an online PowerAuth symmetric signature.
 */
export interface OnlineSignature {
    activationId: string
    applicationKey: string
    signature: string
    signatureType: string
    signatureVersion: string
    nonce: string
}

/**
 * Object representing a data required for online PowerAuth symmetric signature verification.
 */
export interface OnlineSignatureData extends Omit<OnlineSignature, 'nonce'> {
    data: string
    forcedSignatureVersion?: number
}

/**
 * Object representing a data required for offline PowerAuth symmetric signature verification.
 */
export interface OfflineSignatureData {
    activationId: string
    data: string
    signature: string
    allowBiometry: boolean
}

/**
 * Object representing a result from PowerAuth symmetric signature verification.
 */
export interface SignatureVerifyResult {
    signatureValid: boolean
    activationStatus: ActivationStatus
    blockedReason?: string
    signatureType?: SignatureType
    remainingAttempts?: number
}