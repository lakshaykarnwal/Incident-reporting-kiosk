import * as grpc from '@grpc/grpc-js';
import { HelloServiceService } from './generated/incident_grpc_pb';
import { HelloRequest, HelloResponse, GetGreetingRequest, GetGreetingResponse, Greeting } from './generated/incident_pb';

// In-memory storage for greetings
const greetings: Record<string, Greeting.AsObject> = {};

// Implement SayHello method
const sayHello: grpc.handleUnaryCall<HelloRequest, HelloResponse> = (call, callback) => {
  const name = call.request.getName();
  const response = new HelloResponse();
  response.setMessage(`Hello, ${name}!`);
  callback(null, response);
};

// Implement GetGreeting method
const getGreeting: grpc.handleUnaryCall<GetGreetingRequest, GetGreetingResponse> = (call, callback) => {
  const id = call.request.getId();
  const greeting = greetings[id];

  if (greeting) {
    const response = new GetGreetingResponse();
    const greetingMessage = new Greeting();
    greetingMessage.setId(greeting.id);
    greetingMessage.setGreeting(greeting.greeting);
    response.setGreeting(greetingMessage);
    callback(null, response);
  } else {
    callback({
      code: grpc.status.NOT_FOUND,
      details: 'Greeting not found'
    }, null);
  }
};

// Create and configure the gRPC server
const server = new grpc.Server();
server.addService(HelloServiceService as unknown as grpc.ServiceDefinition<grpc.UntypedServiceImplementation>, {
  sayHello,
  getGreeting
});

const PORT = '0.0.0.0:50051';

// Bind and start the server
server.bindAsync(PORT, grpc.ServerCredentials.createInsecure(), (error, port) => {
  if (error) {
    console.error(`Failed to bind server: ${error.message}`);
    return;
  }
  console.log(`Server running at http://localhost:${port}`);
});
