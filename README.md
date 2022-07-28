# emo_project
# hyperledger fabric sample
## pre-condition
* curl, docker, docker-compose, go, nodejs, python
* hyperledger fabric-docker images are installed
* GOPATH are configured
* hyperledger bineries are installed (cryptogen, configtxgen ... etcs)
# -network
## 1. generating crypto-config directory, genesis.block, channel and anchor peer transactions
cd emo_network

## 2. starting the network, create channel and join
./network.sh createChannel -ca

# -chaincode
## 3. chaincode install, instsantiate and test(invoke, query, invoke)
./network.sh deployCC -ccn mychannel -ccp ../emo_contract -ccv 1.1 -ccl go

# -prototype
cd ../application

## 4. nodejs module install
npm install
(npm install init, npm install body-parser, npm install fabric-ca-client, npm install fabric-network 등)

## 5. server start
node main.js

## 6. open web browser and connect to localhost:3000
