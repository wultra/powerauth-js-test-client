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

import { Config, Logger, ServerVersion } from "../index";
import { ServerAPI } from "./ServerAPI";
import { HttpClient } from "./HttpClient";
import { getSystemStatus } from "./StatusFetch";
import { createV10Client } from "./v10/v10";
import { createV13Client } from "./v13/v13";

export class ClientFactory {
    /**
     * Create PowerAuthServerAPI and validate connection to the server.
     * @param config Client configuration.
     * @returns Object implementing PowerAuthServerAPI
     */
    static async createTestServerApi(config: Config): Promise<ServerAPI> {
        let connection = config.connection
        Logger.info(`Connecting to PowerAuth Server located at ${connection.baseUrl}`)
        let client = new HttpClient(config)
        let api: ServerAPI
        if (connection.serverVersion?.version != undefined) {
            // Server's version is known, so try to create API from config directly.
            api = this.createServerForKnownVersion(client, config, connection.serverVersion?.version)
            // Now validate connection by getting version from API.
            await api.getServerVersion()
        } else {
            // Server's version is not known, so get status first.
            let status = await getSystemStatus(client, true)
            // Now create API depeneding on version received in status.
            api = this.createServerForKnownVersion(client, config, status.version)
        }
        Logger.info("Connection to PowerAuth Server succeded")
        return api
    }

    /**
     * Create PowerAuthServerAPI depending on version provided.
     * @param client HTTP client.
     * @param config Client configuration.
     * @param versionString Server's version.
     * @returns Object implementing PowerAuthServerAPI.
     */
    private static createServerForKnownVersion(client: HttpClient, config: Config, versionString: string): ServerAPI {
        let version = ServerVersion.fromString(versionString)
        let api: ServerAPI
        if (version.numericVersion <= ServerVersion.V1_2_5.numericVersion) {
            Logger.info(`Creating interface for servers 1.0.x up to 1.2.x`)
            api = createV10Client(config, client)
        } else {
            Logger.info(`Creating interface for servers 1.3 and newer`)
            api = createV13Client(config, client)
        }
        api.validateServerVersion(versionString)
        return api
    }
}
