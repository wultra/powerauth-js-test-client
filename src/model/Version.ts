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

import { Logger } from "../Logger"

/**
 * The `ProtocolVersion` enumeration defines maximum protocol version
 * supported by the server.
 */
export class ProtocolVersion {
    
    readonly version: number
    readonly versionForHeader: string

    static readonly V2_0 = new ProtocolVersion(20, "2.0")
    static readonly V2_1 = new ProtocolVersion(21, "2.1")
    static readonly V3_0 = new ProtocolVersion(30, "3.0")
    static readonly V3_1 = new ProtocolVersion(31, "3.1")

    private constructor(version: number, versionForHeader: string) {
        this.version = version
        this.versionForHeader = versionForHeader
    }
}

/**
 * The `ServerVersion` enumeration defines PowerAuth Server versions.
 */
export class ServerVersion {
    /**
     * String representation of server version.
     */
    readonly version: string
    /**
     * Numeric representation of server verion.
     */
    readonly numericVersion: number
    /**
     * Protocol version supported by this server. 
     */
    readonly protocolVersion: ProtocolVersion
    /**
     * Numeric representation of major server version.
     */
    readonly majorVersion: number
    /**
     * Numeric representation of minor server version.
     */
    readonly minorVersion: number

    /**
     * Construct version object with parameters.
     * @param version Version in string representation. You must omit zero patch component, for example, for `1.0.0`, use `1.0`.
     * @param numericVersion Version in numeric representation.
     * @param protocolVersion Protocol version supported in this server. 
     */
    private constructor(version: string, numericVersion: number, protocolVersion: ProtocolVersion) {
        this.version = version
        this.numericVersion = numericVersion
        this.protocolVersion = protocolVersion
        this.majorVersion = numericVersion / 1000000
        this.minorVersion = (numericVersion % 1000000) / 1000
    }

    // List of supported version. If you add a new one, then please also update `LATEST` and `allValues`
    // properties.

    static readonly V1_0_0 = new ServerVersion("1.0",   1000000, ProtocolVersion.V3_1)
    static readonly V1_1_0 = new ServerVersion("1.1",   1001000, ProtocolVersion.V3_1)
    static readonly V1_2_0 = new ServerVersion("1.2",   1002000, ProtocolVersion.V3_1)
    static readonly V1_2_5 = new ServerVersion("1.2.5", 1002005, ProtocolVersion.V3_1)
    static readonly V1_3_0 = new ServerVersion("1.3",   1003000, ProtocolVersion.V3_1)
    static readonly V1_4_0 = new ServerVersion("1.4",   1004000, ProtocolVersion.V3_1)
    
    /**
     * Latest server version recognized by this library.
     */
    static readonly LATEST = this.V1_4_0
    
    /**
     * Array with all defined versions.
     */
    static readonly allValues = [
        this.V1_0_0,
        this.V1_1_0,
        this.V1_2_0,
        this.V1_2_5,
        this.V1_3_0,
        this.V1_4_0,
    ]

    /**
     * Convert string to version object.
     * @param version Version string to match.
     * @param allowPrefixMatch If `true` then `1.0.x` version will be matched with `1.0` enum.
     * @returns Version object.
     */
    static fromString(version: string | undefined, allowPrefixMatch: boolean = true): ServerVersion {
        if (version == undefined) {
            throw Error("Server version is not provided")
        }
        const ver = version.endsWith("-SNAPSHOT") ? version.substring(0, version.length - 9) : version
        const found = allowPrefixMatch
            ? this.allValues.find(e => ver.startsWith(e.version))
            : this.allValues.find(e => e.version == ver)
        if (!found) {
            throw new Error(`Uknown server version ${version}`)
        }
        return found
    }
}
