'use strict';

var express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('./javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('./javascript/AppUtil.js');

var app = express();

var path = require('path');
var fs = require('fs');

var expressSession = require('express-session');
const exp = require('constants');
//view Engine EJS로 지정 >> npm install ejs --save


app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// static /public -> ./public
app.use('/public', express.static(path.join(__dirname,'public')));

// body-parser app.use
app.use(express.urlencoded({ extended : false}));
app.use(express.json());

const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');

const ccp = buildCCPOrg1();
const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');


app.post('/user', async(req, res) => {
    var name = req.body.name;
    var department = req.body.department;

    console.log("/user start -- ", name, department);

    try {
        const wallet = await buildWallet(Wallets, walletPath);
		await enrollAdmin(caClient, wallet, mspOrg1); // wallet/admin.id
		await registerAndEnrollUser(caClient, wallet, mspOrg1, name, department); // wallet/${name}.id
    } catch (error) {
        var result = `{"result":"fail", "id":"${name}", "affiliation":"${department}"}`;
        var obj = JSON.parse(result);
        console.log("/user end -- failed");
        res.status(200).send(obj);
        //선생님이 생각해내셨습니다.
        return;
    }

    var result = `{"result":"success", "id":"${name}", "affiliation":"${department}"}`;
    var obj = JSON.parse(result);
    console.log("/user end -- success");
    res.status(200).send(obj);

});

//emo_create.html과 라우팅으로 연결
app.post('/emo/create', async (req, res) => {

    
    var id = req.body.id;
    var owner = req.body.owner;
    var image = req.body.image;
    var opensrc = req.body.opensrc;
    var faceValue = req.body.faceValue;

    //get인 경우에는 query에서 꺼내야함
    console.log("/create emoticon start -- ", id, owner, image, opensrc, faceValue);
    try {
        //GW연결 > connect > CH > CC > submit transaction        
        const wallet = await buildWallet(Wallets, walletPath);
        console.log('wallet 가지고 옴. 그 다음 gateway생성 시도합니다.');
        const gateway = new Gateway();

        console.log('gateway생성완료');
        
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser", //수정
            discovery: { enabled: true, asLocalhost: true }
        });
        
        console.log('deployCC input값이 정상적인지 확인')
        //deployCC 할때 지정한 채널네임에 따라 설정 config파일을 만들어도 된다.
        //deployCC 할때 지정한 -channel name은 marble.
        const network = await gateway.getNetwork("mychannel");

        //deployCC할때 지정한 -ccn
        const contract = network.getContract("mychannel");


        //submit transaction => 초기 마블 만들기. 
        //parameter : name, color, size, owner
        console.log('트랜잭션 제출 시도합니다.');
        await contract.submitTransaction('EmoCreate', id, owner, image, opensrc, faceValue);
        console.log('*** 트랜잭션 제출 완료');

    } catch (error) {
        var result = `{"result":"fail", "message":"create emoticon tx hasn't subjected"}`;
        console.log(result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);
        console.log("/emoticon end -- failed", error);
        return;
    }

    var result = `{"result":"success", "message":"create emoticon tx had subjected"}`;
    console.log(result);
    var obj = JSON.parse(result);
    res.status(200).send(obj);

    console.log("/create emoticon end -- ", id, owner, image, opensrc, faceValue);
});

app.post('/emo/transfer', async (req, res) => {

    var name = req.body.name;
    var author = req.body.author;
    var image = req.body.image;

    //get인 경우에는 query에서 꺼내야함
    console.log("/transfer start -- ", name, author, image);
    try {
        //GW연결 > connect > CH > CC > submit transaction        
        const wallet = await buildWallet(Wallets, walletPath);
        console.log('wallet 가지고 옴. 그 다음 gateway생성 시도합니다.');
        const gateway = new Gateway();

        console.log('gateway생성완료');
        
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser", //수정
            discovery: { enabled: true, asLocalhost: true }
        });
        //deployCC 할때 지정한 채널네임에 따라 설정 config파일을 만들어도 된다.
        //deployCC 할때 지정한 -channel name은 marble.
        const network = await gateway.getNetwork("mychannel");

        //deployCC할때 지정한 -ccn
        const contract = network.getContract("mychannel");

        //TransferTransaction - 주인만 예은으로 - name, newOwner
        console.log('\n--> Submit Transaction: TransferMarble, function creates the marble on the ledger');
        await contract.submitTransaction('EmoTransfer', name, author, image);
        console.log('*** Result: Transfered');


    } catch (error) {
        var result = `{"result":"fail", "message":"tx hasn't subjected"}`;
        console.log(result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);
        console.log("/marble end -- failed", error);
        return;
    }

    var result = `{"result":"success", "message":"tx had subjected"}`;
    console.log(result);
    var obj = JSON.parse(result);
    res.status(200).send(obj);

    //console.log(res);
});

//emo_read_getHistory.html과 라우팅으로 연결
app.get('/emo/read', async(req, res) =>{
    var id = req.query.id;
    //var userkey = req.query.userkey;
    console.log("/emo get start -- ", id);
    const gateway = new Gateway();

    try {
        const wallet = await buildWallet(Wallets, walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed 
        });
        console.log('deployCC값이 정상적인지 확인');
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("mychannel");
        var result = await contract.evaluateTransaction('EmoRead',id);
        // result 가 byte array라고 생각하고
        var result = `{"result":"success", "message":${result}}`;
        console.log("/emo get end -- success", result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);
    } catch (error) {
        var result = `{"result":"fail", "message":"EmoRead has a error"}`;
        var obj = JSON.parse(result);
        console.log("/emo get end -- failed ", error);
        res.status(200).send(obj);
        return;
    } finally {
        gateway.disconnect();
    }
});

//emo_read_getHistory.html과 라우팅으로 연결
app.get('/emo/getHistory', async(req, res) =>{
    var id = req.query.id;
    //var userkey = req.query.userkey;
    console.log("/emo get start -- ", id);
    const gateway = new Gateway();
    try {
        const wallet = await buildWallet(Wallets, walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed 
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("mychannel");
        var result = await contract.evaluateTransaction('MyEmoGetHistory',id);
        // result 가 byte array라고 생각하고
        var result = `{"result":"success", "message":${result}}`;
        console.log("/emo/getHistory get end -- success", result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);
    } catch (error) {
        var result = `{"result":"fail", "message":"MyEmoGetHistory has a error"}`;
        var obj = JSON.parse(result);
        console.log("/emo/getHistory get end -- failed ", error);
        res.status(200).send(obj);
        return;
    } finally {
        gateway.disconnect();
    }
});

//emo_index의 대시보드와 라우팅으로 연결
app.get('/emo/blockNumber', async(req, res) =>{
    var index = req.query.index;

    try {
        //GW연결 > connect > CH > CC > submit transaction        
        const wallet = await buildWallet(Wallets, walletPath);
        console.log('wallet 가지고 옴. 그 다음 gateway생성 시도합니다.');
        const gateway = new Gateway();

        console.log('gateway생성완료');
        
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser",
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("mychannel");
        await contract.evaluateTransaction('BlockNumber');

        var result = `{"result":"success", "message":${result}}`;
        console.log("/emo/blockNumber get end -- success", result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);


    } catch (error) {
        var result = `{"result":"fail", "message":"blockNumber has a error"}`;
        var obj = JSON.parse(result);
        console.log("/emo/blockNumber get end -- failed ", error);
        res.status(200).send(obj);
    }

});

//emo_like.html과 라우팅으로 연결
app.post('/emo/like', async (req, res) => {
    
    var name = req.body.name;
    //var like = 1;

    //get인 경우에는 query에서 꺼내야함
    console.log("/like start -- ", name);
    try {
        //GW연결 > connect > CH > CC > submit transaction        
        const wallet = await buildWallet(Wallets, walletPath);
        console.log('wallet 가지고 옴. 그 다음 gateway생성 시도합니다.');
        const gateway = new Gateway();

        console.log('gateway생성완료');

        await gateway.connect(ccp, {
            wallet,
            identity: "appUser", //수정
            discovery: { enabled: true, asLocalhost: true }
        });
        //deployCC 할때 지정한 채널네임에 따라 설정 config파일을 만들어도 된다.
        //deployCC 할때 지정한 -channel name은 marble.
        const network = await gateway.getNetwork("mychannel");

        //deployCC할때 지정한 -ccn
        const contract = network.getContract("mychannel");

        //TransferTransaction - 주인만 예은으로 - name, newOwner
        console.log('\n--> Submit Transaction: TransferMarble, function creates the marble on the ledger');
        var resultcount=await contract.submitTransaction('EmoLike', name);
        var resultobj=JSON.parse(resultcount);
        console.log('*** Result: Transfered', resultobj);
        var result = `{"result":"success", "message":"tx had subjected", "resultcount":${resultobj.like}}`;
        console.log('***출력될 데이터 :', result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);


    } catch (error) {
        var result = `{"result":"fail", "message":"tx hasn't subjected"}`;
        console.log(result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);
        console.log("/marble end -- failed", error);
        return;
    }

    

});

app.get('/', (req, res)=>{
    console.log('index.html에서 받아온 정보를 출력합니다.');
    
    res.writeHead('200', {'Content-Type':'text/html;charset = utf8'});
    
    req.app.render('emo_index', function(err, html){
        //‘marble_index’라는 html file EJS view templete을 읽어오면 html에 해당하는 context data를 뿌려주고, function을 수행하는 것이다. Function은 수행되며 err.stack을 에러가 있을 경우 리턴하고, 아니면 html을 리턴한다.
        if(err) {
            console.error('While Rendering, Error emerged. Error => ' + err.stack);
            res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
            res.write('<h2>Error Encoutered</h2>');
            res.write('<p>'+err.stack+'</p>');
            res.end();
            return;
        }
        //err=nil
        console.log('Success to Render.');
        res.end(html); //성공한 경우 ejs를 반환
    });
});

// server listen
app.listen(3000, () => {
    console.log('Express server is started: 3000');
});