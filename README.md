# MeetX

## producer flow
- ask the server for rtpCapabilites
- use rtpCapabilities to create and load device
- ask the server to create webRTC transport and get transport parameters
- create sendTransport with parameters you got from the server
- produce stream from you display or camera
- connect event triggered send you dtls paramters to the server and connect
- produce event triggered with kind, rtp parameters send them to the server
- call produce method with kind, rtp parameters and you will get producer object
- return producer id to client side

----
## consumer flow
- ask the server for rtpCapabilites
- use rtpCapabilities to create and load device
- ask the server to create webRTC transport and get transport parameters
- create recvTransport with parameters you got from the server
- send to the server device.rtpCapabilities and producer id
- on the server check if you can consume
- if you can , consumer object will be returned with parameters (consumer id, producer id, kind, rtpParameters)
- return this parameters to the client and call consume
- connect event will be triggered send dtls parameters to the server and connect
