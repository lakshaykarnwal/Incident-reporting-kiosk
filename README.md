# Incident Reporting Management gRPC Backend

This repository contains a gRPC backend implementation for managing incidents. The backend provides two primary RPC methods: reporting an incident and retrieving an incident by ID.

## Overview

The backend service is implemented using TypeScript and the `@grpc/grpc-js` library. It utilizes in-memory storage to manage incidents and includes basic CRUD operations exposed through gRPC.

## Proto File

The `incident.proto` file defines the protocol for communication between clients and the server.

### `incident.proto`

```proto
syntax = "proto3";

package incident;

message Incident {
  string id = 1;
  string type = 2;
  string description = 3;
  bool anonymous = 4;
  string created = 5;
}

message ReportIncidentRequest {
  Incident incident = 1;
}

message ReportIncidentResponse {
  string message = 1;
}

message GetIncidentRequest {
  string id = 1;
}

message GetIncidentResponse {
  Incident incident = 1;
}

service IncidentService {
  rpc ReportIncident(ReportIncidentRequest) returns (ReportIncidentResponse);
  rpc GetIncident(GetIncidentRequest) returns (GetIncidentResponse);
}
```

## Server Implementation

The server implementation is located in `server.ts`. It includes:

- **In-memory storage** for incidents.
- **RPC methods** for reporting and retrieving incidents.
- **Error handling** for invalid requests and not found incidents.

### `server.ts`

```typescript
import * as grpc from '@grpc/grpc-js';
import {
  IncidentServiceService,
  IIncidentServiceServer
} from './generated/incident_grpc_pb';
import {
  ReportIncidentRequest,
  ReportIncidentResponse,
  GetIncidentRequest,
  GetIncidentResponse,
  Incident
} from './generated/incident_pb';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for incidents
const incidents: Record<string, Incident.AsObject> = {};

// Implement the RPC methods
const reportIncident: grpc.handleUnaryCall<ReportIncidentRequest, ReportIncidentResponse> = (call, callback) => {
  const incident = call.request.getIncident();
  
  if (!incident) {
    callback({
      code: grpc.status.INVALID_ARGUMENT,
      details: 'Incident data is missing'
    }, null);
    return;
  }

  const incidentId = uuidv4(); // Generate a unique ID

  const newIncident = {
    id: incident.getId() || incidentId, 
    type: incident.getType() || '',
    description: incident.getDescription() || '',
    anonymous: incident.getAnonymous() || false,
    created: new Date().toISOString() 
  };

  incidents[newIncident.id] = newIncident;

  const response = new ReportIncidentResponse();
  response.setMessage('Incident reported successfully');
  callback(null, response);
};

const getIncident: grpc.handleUnaryCall<GetIncidentRequest, GetIncidentResponse> = (call, callback) => {
  const incidentId = call.request.getId();
  const incident = incidents[incidentId];

  if (incident) {
    const response = new GetIncidentResponse();
    const incidentMessage = new Incident();
    incidentMessage.setId(incident.id);
    incidentMessage.setType(incident.type);
    incidentMessage.setDescription(incident.description);
    incidentMessage.setAnonymous(incident.anonymous);
    incidentMessage.setCreated(incident.created); 
    response.setIncident(incidentMessage);
    callback(null, response);
  } else {
    callback({
      code: grpc.status.NOT_FOUND,
      details: 'Incident not found'
    }, null);
  }
};

// Create and start the server
const server = new grpc.Server();

server.addService(IncidentServiceService as unknown as grpc.ServiceDefinition<IIncidentServiceServer>, {
  reportIncident,
  getIncident
});

const PORT = '0.0.0.0:50051';
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error(`Failed to bind server: ${error.message}`);
    return;
  }
  console.log(`Server running at http://localhost:${port}`);
});

```


