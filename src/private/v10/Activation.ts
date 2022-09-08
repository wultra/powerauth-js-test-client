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

import { ActivationDetail, ActivationOtpValidation, ActivationPrepareData, ActivationStatus } from "../../model/Activation"

// Init

export interface ActivationInit_Request {
    userId: string
    applicationId: number

    activationOtp?: string
    activationOtpValidation?: ActivationOtpValidation
    maxFailureCount?: number
}

export interface ActivationInit_Response {
    activationId: string
    activationCode: string
    activationSignature: string
    userId: string
    applicationId: number
}

// Update OTP

export interface ActivationOtpUpdate_Request {
    activationId: string
    activationOtp: string
    externalUserId?: string
}

export interface ActivationOtpUpdate_Response {
    activationId: string
    updated: boolean
}

// Commit

export interface ActivationCommit_Request {
    activationId: string
    activationOtp?: string
    externalUserId?: string
}

export interface ActivationCommit_Response {
    activationId: string
    activated: boolean
}

// Block

export interface ActivationBlock_Request {
    activationId: string
    externalUserId?: string
    reason?: string
}

export interface ActivationBlock_Response {
    activationId: string
    activationStatus: ActivationStatus
}

// Unblock

export interface ActivationUnblock_Request {
    activationId: string
    externalUserId?: string
}

export interface ActivationUnblock_Response {
    activationId: string
    activationStatus: ActivationStatus
}

// Remove

export interface ActivationRemove_Request {
    activationId: string
    externalUserId?: string
    revokeRecoveryCodes: boolean
}

export interface ActivationRemove_Response {
    activationId: string
    removed: boolean
}

// Detail (e.g. status)

export interface ActivationStatus_Request {
    activationId: string
    challenge?: string
}

export interface ActivationStatus_Response extends ActivationDetail {
}

// Prepare

export interface ActivationPrepare_Request extends ActivationPrepareData {
}

export interface ActivationPrepare_Response {
    applicationId: number
    activationId: string
    activationStatus: ActivationStatus
    userId: string
    encryptedData: string
    mac: string
}

