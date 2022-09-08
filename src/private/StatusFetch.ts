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

import { SystemStatus } from "../model/SystemStatus"
import { PowerAuthServerError } from "../PowerAuthServerError"
import { HttpClient } from "./HttpClient"
import { Endpoints } from "./v10/Endpoints"

/**
 * Receive system status from the server.
 * @param client HTTP client.
 * @param failIfNoOK If `true` then the call will fail is system's status is not 'OK'.
 * @returns Promise with SystemStatus.
 */
export async function getSystemStatus(client: HttpClient, failIfNoOK: boolean): Promise<SystemStatus> {
    const status = await client.postEmpty<SystemStatus>(Endpoints.getSystemStatus)
    if (status.status != 'OK' && failIfNoOK) {
        throw new PowerAuthServerError(`System status is not OK. Status = '${status.status}'`)
    }
    return status
}