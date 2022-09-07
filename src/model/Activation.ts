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

import { ObjectId } from "./ObjectId"

/**
 * All possible states in which activation can be on the server.
 */
export enum ActivationStatus {
    /**
     * Activation is just created.
     */
    CREATED = "CREATED",
    /**
     * Activation is waiting for commit.
     */
    PENDING_COMMIT = "PENDING_COMMIT",
    /**
     * Activation is active.
     */
    ACTIVE = "ACTIVE",
    /**
     * Activation is blocked.
     */
    BLOCKED = "BLOCKED",
    /**
     * Activation is removed.
     */
    REMOVED = "REMOVED"
}

/**
 * Type of OTP validation expected when activation is creating.
 */
export enum ActivationOtpValidation {
    /**
     * No OTP validation is used.
     */
    NONE = "NONE",
    /**
     * OTP is validated during the key-exchange phase.
     */
    ON_KEY_EXCHANGE = "ON_KEY_EXCHANGE",
    /**
     * OTP is validated on activation commit.
     */
    ON_COMMIT = "ON_COMMIT"
}

/**
 * Object representing an activation on the server.
 */
export interface Activation {
    userId: string
    applicationId: ObjectId
    activationId: string

    activationCode?: string
    activationSignature?: string
}

/**
 * Object representing an activation detail on the server. 
 */
export interface ActivationDetail {
    applicationId: ObjectId
    userId: string

    activationId: string
    activationStatus: ActivationStatus
    activationOtpValidation: ActivationOtpValidation
    
    blockedReason?: string
    activationName?: string
    
    extras?: string
    platform?: string
    deviceInfo?: string
    activationFlags?: Array<string>

    encryptedStatusBlob?: string
    encryptedStatusBlobNonce?: string

    activationCode?: string
    activationSignature?: string
    devicePublicKeyFingerprint?: string

    protocolVersion?: number
}

/**
 * Object representing data for activation prepare
 */
export interface ActivationPrepareData {
    activationCode: string
    applicationKey: string
    ephemeralPublicKey: string
    encryptedData: string
    mac: string
    nonce?: string
}

/**
 * Object representing data returned from activation prepare.
 */
 export interface ActivationPrepareResult {
    applicationId: ObjectId
    activationId: string
    activationStatus: ActivationStatus
    userId: string
    encryptedData: string
    mac: string
}