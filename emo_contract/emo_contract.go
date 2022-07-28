package main

//import
import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/golang/protobuf/ptypes"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

//chaincode struct
type SimpleChaincode struct {
	contractapi.Contract
}

var indexForEmo int = 0

//WS Marble struct
type Emo struct {
	Emo_index int `json:"index"`
	ObjectType string `json:"docType"`
	Emo_ID string `json:"id"`
	Emo_Owner string `json:"owner"`
	Emo_IsOpen string `json:"isopen"`
	Emo_Img string `json:"img"`
	Emo_Face_Value int `json:"faceValue"`
	Emo_Author string `json:"author"`
	Emo_Like int `json:"like"`
}

type HistoryQueryResult struct {
	Record    *Emo    `json:"record"`
	TxId     string    `json:"txId"`
	Timestamp time.Time `json:"timestamp"`
	IsDelete  bool      `json:"isDelete"`
}


//EmoCreate 함수
func(t *SimpleChaincode) EmoCreate(ctx contractapi.TransactionContextInterface, Emo_ID string, Emo_Img string, Emo_Owner string, Emo_IsOpen string, Emo_Face_Value int) error{
	fmt.Println("- start init emoticon")
	
	//기등록 이모티콘 검색
	emoAsBytes, err := ctx.GetStub().GetState(Emo_ID)
	if err != nil{
		return fmt.Errorf("Failed to get emoticon: " + err.Error())
	}else if emoAsBytes != nil{
		return fmt.Errorf("This emoticon already exists: " + Emo_ID)
	}
	//구조체 생성 -> 마샬링 -> PutState
	emo := &Emo{indexForEmo,"Emo", Emo_ID, Emo_Owner, Emo_IsOpen, Emo_Img, Emo_Face_Value,"",0}
	emoJSONasBytes, err := json.Marshal(emo)
	if err != nil{
		return err
	}
	err = ctx.GetStub().PutState(Emo_ID, emoJSONasBytes)
	if err !=nil{
		return err
	}
	indexForEmo +=1
	return nil
}


//EmoRead
func (t *SimpleChaincode) EmoRead(ctx contractapi.TransactionContextInterface, Emo_ID string) (*Emo, error) {
	emoBytes, err := ctx.GetStub().GetState(Emo_ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get marble %s: %v", Emo_ID, err)
	}
	if emoBytes == nil {
		return nil, fmt.Errorf("marble %s does not exist", Emo_ID)
	}

	var emo Emo
	err = json.Unmarshal(emoBytes, &emo)
	if err != nil {
		return nil, err
	}

	return &emo, nil
}


//EmoTransfer
func (t *SimpleChaincode) EmoTransfer(ctx contractapi.TransactionContextInterface, Emo_ID string, Emo_Author string, Emo_Img string) error {
	fmt.Println("- start init emoticon")
	
	//기등록 emo 검색
	emoAsBytes, err := ctx.GetStub().GetState(Emo_ID)
	if err != nil{
		return fmt.Errorf("Failed to get emoticon: " + err.Error())
	}else if emoAsBytes == nil{
		return fmt.Errorf("This emoticon does not exists: " + Emo_ID)
	}
	//검증 : 해당 이모가 Emo_Author에게 transfer approve되었나?
	//unmarshal 시키기
	emo := Emo{}
	_ = json.Unmarshal(emoAsBytes,&emo)
	//수정 : 오너 변경
	emo.Emo_Author = Emo_Author

	emoJSONasBytes, err := json.Marshal(emo)
	if err != nil{
		return err
	}
	err = ctx.GetStub().PutState(Emo_ID, emoJSONasBytes)
	if err !=nil{
		return err
	}
	return nil
}

//EmoLike
func (t *SimpleChaincode) EmoLike(ctx contractapi.TransactionContextInterface, Emo_ID string)(*Emo, error) {
	//기등록 이모티콘 검색
	emoAsBytes, err := ctx.GetStub().GetState(Emo_ID)
	if err != nil{
		return nil, fmt.Errorf("Failed to get emoticon: " + err.Error())
	}else if emoAsBytes == nil{
		return nil, fmt.Errorf("This emoticon does not exists: " + Emo_ID)
	}
	emo := Emo{}
	_ = json.Unmarshal(emoAsBytes,&emo)
	//좋아요 1회 더하기
	emo.Emo_Like += 1

	emoJSONasBytes, err := json.Marshal(emo)
	if err != nil{
		return nil, err
	}
	err = ctx.GetStub().PutState(Emo_ID, emoJSONasBytes)
	if err !=nil{
		return nil, err
	}
	return &emo, nil
}

//MyEmoGetHistory 함수
func (t *SimpleChaincode) MyEmoGetHistory(ctx contractapi.TransactionContextInterface, Emo_ID string) ([]HistoryQueryResult, error) {
	log.Printf("MyEmoGetHistory: ID %v", Emo_ID)

	resultsIterator, err := ctx.GetStub().GetHistoryForKey(Emo_ID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var emo Emo
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &emo)
			if err != nil {
				return nil, err
			}
		} else {
			emo = Emo {
				Emo_ID: Emo_ID,
			}
		}

		timestamp, err := ptypes.Timestamp(response.Timestamp)
		if err != nil {
			return nil, err
		}

		record := HistoryQueryResult{
			TxId:      response.TxId,
			Timestamp: timestamp,
			Record:    &emo,
			IsDelete:  response.IsDelete,
		}
		records = append(records, record)
	}

	return records, nil
}

//BlockNumber 함수(블록 개수 보여주는 함수)
func(t *SimpleChaincode)BlockNumber(ctx contractapi.TransactionContextInterface) (*Emo, error) {
	emo1 := &Emo{indexForEmo,"", "emoindex", "", "", "", 0,"",0}
	emoJSONasBytes, err := json.Marshal(emo1)
	if err != nil{
		return nil,err
	}
	err = ctx.GetStub().PutState("emoindex", emoJSONasBytes)
	if err !=nil{
		return nil,err
	}

	emoAsBytes, err := ctx.GetStub().GetState("emoindex")
	if err != nil{
		return nil, fmt.Errorf("Failed to get index: " + err.Error())
	}else if emoAsBytes == nil{
		return nil, fmt.Errorf("Failed to get index...")
	}
	emo2 := Emo{}
	_ = json.Unmarshal(emoAsBytes,&emo2)
	return &emo2, nil
}

//main 함수
func main(){
	chaincode, err := contractapi.NewChaincode(&SimpleChaincode{})
	if err != nil {
		log.Panicf("Error creating emo chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("Error starting emo chaincode: %v", err)
	}
}


