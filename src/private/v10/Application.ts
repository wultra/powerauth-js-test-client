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

export interface ApplicationV10 {
    id: number
    applicationName: string
    applicationRoles: string[]
}

export interface ApplicationVersionV10 {
    applicationVersionId: number
    applicationVersionName: string
    applicationKey: string
    applicationSecret: string
    supported: boolean
}

// Get List

export interface ApplicationList_Response {
    applications?: ApplicationV10[]
}

// Create application

export interface ApplicationCreate_Request {
    applicationName: string
}

export interface ApplicationCreate_Response {
    applicationId: number
    applicationName: string
    applicationRoles?: string[]
}

// Get application detail

export interface ApplicationDetail_Request {
    applicationId: number
}

export interface ApplicationDetail_Response {
    applicationId: number
    applicationName: string
    applicationRoles?: string[]
    masterPublicKey: string
    versions?: ApplicationVersionV10[]
}

// Version create

export interface ApplicationVersionCreate_Request {
    applicationId: number
    applicationVersionName: string
}

export interface ApplicationVersionCreate_Response extends ApplicationVersionV10 {}

// Version set supported / unsupported

export interface ApplicationVersionSupport_Request {
    applicationVersionId: number
}

export interface ApplicationVersionSupport_Response {
    applicationVersionId: number
    supported: boolean
}
