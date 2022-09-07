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
 * The `Application` class represents an PowerAuth application.
 */
export class Application {
    /**
     * Application's identifier.
     */
    readonly applicationId: ObjectId
    /**
     * Application's roles.
     */
    readonly applicationRoles: string[]
    /**
     * Contains application's name.
     */
    get applicationName(): string {
        return this.applicationId.objectName
    }

    /**
     * Construct application from provided values.
     * @param applicationId Application's identifier.
     * @param applicationRoles Application roles.
     */
    constructor(applicationId: ObjectId, applicationRoles: string[] | undefined) {
        this.applicationId = applicationId
        this.applicationRoles = applicationRoles ?? []
    }

    /**
     * Construct Application object from data returned by servers 1.3 and newer.
     * @param applicationId Application identifier.
     * @param applicationRoles Application roles.
     * @returns Application object created from provided data.
     */
    static fromV13Data(applicationId: string, applicationRoles: string[] | undefined): Application {
        return new Application(ObjectId.fromV13Data(applicationId), applicationRoles)
    }

    /**
     * Construct Application object from servers older than 1.3.
     * @param legacyAppId Legacy application identifier.
     * @param applicationName Application name.
     * @param applicationRoles Application roles.
     * @returns Application object created from provided data.
     */
    static fromV10Data(legacyAppId: number, applicationName: string, applicationRoles: string[] | undefined): Application {
        return new Application(ObjectId.fromV10Data(legacyAppId, applicationName), applicationRoles)
    }

    /**
     * Construct Application object from Application defail.
     * @param applicationDetail Application detail.
     * @returns Application constructed from Application detail.
     */
    static fromDetail(applicationDetail: ApplicationDetail): Application {
        return new Application(applicationDetail.applicationId, applicationDetail.applicationRoles)
    }
}

/**
 * Object representing an activation detail on the server.
 */
export interface ApplicationDetail {
    applicationId: ObjectId
    applicationRoles: string[]
    masterPublicKey: string
    versions: ApplicationVersion[]
}

/**
 * Object representing an application's version on the server.
 */
export interface ApplicationVersion {
    applicationId: ObjectId
    applicationVersionId: ObjectId
    applicationKey: string
    applicationSecret: string
    supported: boolean
}

/**
 * Object representing an exact combination of application and its version.
 */
export class ApplicationSetup {
    readonly application: Application
    readonly applicationDetail: ApplicationDetail
    readonly applicationVersion: ApplicationVersion

    readonly appKey: string
    readonly appSecret: string
    readonly masterServerPublicKey: string

    constructor(applicationDetail: ApplicationDetail, applicationVersion: ApplicationVersion) {
        this.applicationDetail = applicationDetail
        this.applicationVersion = applicationVersion
        this.application = Application.fromDetail(applicationDetail)
        this.appKey = applicationVersion.applicationKey
        this.appSecret = applicationVersion.applicationSecret
        this.masterServerPublicKey = applicationDetail.masterPublicKey
    }
}
