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

import { Application, ApplicationDetail } from "../../model/Application"

// Model objects

export interface ApplicationV13 {
    applicationId: string
    applicationRoles: string[]
}

export interface ApplicationVersionV13 {
    applicationVersionId: string
    applicationKey: string
    applicationSecret: string
    supported: boolean
}

// Get List

export interface ApplicationList_Response {
    applications?: ApplicationV13[]
}

// Create application

export interface ApplicationCreate_Request {
    applicationId: string
}

export interface ApplicationCreate_Response {
    applicationId: string
    applicationRoles?: string[]
}

// Get application detail

export interface ApplicationDetail_Request {
    applicationId: string
}

export interface ApplicationDetail_Response {
    applicationId: string
    applicationRoles?: string[]
    masterPublicKey: string
    versions?: ApplicationVersionV13[]
}

// Version create

export interface ApplicationVersionCreate_Request {
    applicationId: string
    applicationVersionId: string
}

export interface ApplicationVersionCreate_Response extends ApplicationVersionV13 {}

// Version set supported / unsupported

export interface ApplicationVersionSupport_Request {
    applicationId: string
    applicationVersionId: string
}

export interface ApplicationVersionSupport_Response {
    applicationId: string
    applicationVersionId: string
    supported: boolean
}
