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

/**
 * The `ObjectId` class represents named object in API.
 */
export class ObjectId {
    /**
     * Object name.
     */
    readonly objectName: string
    /**
     * Object identifier in string form (Server 1.3 and older)
     */
    private readonly objectId: string | undefined
    /**
     * Object identifier in numberic form (Servers older than 1.3)
     */
    private readonly legacyId: number | undefined

    /**
     * Contains object identifier in string form. If such form is not available
     * then throws an error.
     */
    get identifier(): string {
        if (!this.objectId) {
            throw new Error("API object has no string identifier set")
        }
        return this.objectId
    }

    /**
     * Contains object identifier in legacy form. If such form is not available
     * then throws an error.
     */
    get legacyIdentifier(): number {
        if (!this.legacyId) {
            throw new Error("API object has no legacy identifier set")
        }
        return this.legacyId
    }

    /**
     * Construct `ObjectId` from legacy data (Servers older than 1.3)
     * @param legacyId Legacy object identifier.
     * @param objectName Optional object name. If name is not available, then it's created from legacy identifier.
     * @returns ObjectId created from legacy data.
     */
    static fromV10Data(legacyId: number, objectName: string | undefined = undefined): ObjectId {
        return new ObjectId(!objectName ? legacyId.toString() : objectName, undefined, legacyId)
    }

    /**
     * Construct `ObjectId` from object identifier (Servers 1.3 and newer)
     * @param objectId Object identifier in string form.
     * @returns ObjectId created from object identifier.
     */
    static fromV13Data(objectId: string): ObjectId {
        return new ObjectId(objectId, objectId, undefined)
    }

    private constructor(objectName: string, objectId: string | undefined, legacyId: number | undefined) {
        this.objectName = objectName
        this.objectId = objectId
        this.legacyId = legacyId
    }
}
