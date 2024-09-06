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
