const xlsx = require('xlsx');
const mysql = require('mysql');
const fs = require('fs');
const procFolder = './proc';
const stockFolder = './stock';
const mysql_conn_info={
    host     : "127.0.0.1",
    user     : "root",
    password : 'fmbdb12#$',
    database : 'fmb',
    port:'3307'
  }

const conn = mysql.createConnection(mysql_conn_info);

  conn.connect((error) => {
    if (error) {
        console.error(error);
    } else {
        console.log('connection successful');
    }
});


const resData = {};
var resultData=[];


//작업진행현황
fs.readdir(procFolder, function(error, filelist){
    console.log(filelist);
    let sucCnt=0,failCnt=0;
  
    filelist.forEach(element=>{
        if(element=='done'){
            return;
        }
  
        console.log(element)
        let file_Name=element
  
        const workbook = xlsx.readFile(procFolder+"/"+file_Name);
        const sheetnames = Object.keys(workbook.Sheets);
        
        const sheetname = sheetnames[0];
        resData[sheetname] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetname]);
        resultData=resData[sheetname];
        
  
        resultData.forEach(element => {
  
  
          let req=element['작업지시ID'],
          user=element['작업자'],
          due_date=intTodate(element['납기일자']),
          customer=element['고객사'],
          file1=element['도면 파일'],
          file2=element['견적서 파일'],
          mat_type=element['소재 재질'],
          mat_thick=element['소재 두께'],
          oper=changeOPERCODE(element['작업공정']),
          comment=regExp_test(element['비고']),
          order_date=intTodate(element['작업일시'])
          qty=checkValue(element['작업수량']),
          loss_qty=checkValue(element['불량수량'])
          
      
      
          let sql_mfmblothis = `
          truncate table mfmblothis;
          INSERT INTO mfmblothis (ORDER_ID,TRAN_USER_ID,DUE_DATE,CUSTOMER,OPER,TRAN_COMMENT,TRAN_TIME,QTY,LOSS_QTY) VALUES 
          ('${req}','${user}','${due_date}','${customer}','${oper}','${comment}','${order_date}',${qty},${loss_qty}); 
          `;
            
          let sql_mfmblotsts = ` 
          update mfmblothis
          set
          INSERT INTO mfmblotsts (ORDER_ID,DUE_DATE,CUSTOMER,FILE1,FILE2,MAT_TYPE,MAT_THICK,OPER,QTY,LOSS_QTY,LAST_COMMENT,LAST_TRAN_TIME) VALUES 
          ('${req}','${due_date}','${customer}','${file1}','${file2}','${mat_type}','${mat_thick}','${oper}','${qty}','${loss_qty}','${comment}','${order_date}')
          `;
      
  
          //console.log(sql_mfmblothis+sql_mfmblotsts)
      
      
          conn.query(sql_mfmblothis, function(err, rows, fields){
              if(err){
                  console.log("에러 : "+err,rows);
                /*   let failSql=`INSERT INTO excel_import_fail_logs
                  (eORDER_IDX, eComment, eCreateDate)
                  VALUES ('${req}', '${err}', NOW())`;
                  conn.query(failSql, function(err, rows, fields){
                      if(err){
                          console.log(err)
                      }else{
  
                      }
                  }); */
                  failCnt++
              } else {
                  //console.log("성공 : "+rows.insertId);
                  sucCnt++
              }
           
          });
  

          conn.query(sql_mfmblotsts, function(err, rows, fields){
              if(err){
                  console.log("에러 : "+err,rows);
                /*   let failSql=`INSERT INTO excel_import_fail_logs
                  (eORDER_IDX, eComment, eCreateDate)
                  VALUES ('${req}', '${err}', NOW())`;
                  conn.query(failSql, function(err, rows, fields){
                      if(err){
                          console.log(err)
                      }else{
  
                      }
                  }); */
                  failCnt++
              } else {
                  //console.log("성공 : "+rows.insertId);
                  sucCnt++
              }
           
          });
          
      }); 

      fs.rename(procFolder+"/"+file_Name, procFolder+"/done/"+file_Name,function(err){
          if(err){
              console.log('err : '+err)
          }else{
            let doneSql=`INSERT INTO excel_import_logs
            (eFile_name, eSucCnt, eFailCnt, eCreateDate)
            VALUES ('${file_Name}', ${sucCnt}, ${failCnt}, NOW())`;
            conn.query(doneSql, function(err, rows, fields){
                if(err){
                    console.log(err)
                }else{
    
                }
            });
          }
      });

    })
    
  })


//자재현황
fs.readdir(stockFolder, function(error, filelist){
    console.log(filelist);
    let sucCnt=0,failCnt=0;
  
    filelist.forEach(element=>{
        if(element=='done'){
            return;
        }
  
        console.log(element)
        let file_Name=element
  
        const workbook = xlsx.readFile(stockFolder+"/"+file_Name);
        const sheetnames = Object.keys(workbook.Sheets);
        
        const sheetname = sheetnames[0];
        resData[sheetname] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetname]);
        resultData=resData[sheetname];
        
  
        resultData.forEach(element => {
  
  
          let req=element['작업지시ID'],
          vendor=element['공급사'],
          last_tran=intTodate(element['입/출고 시간']),
          store=element['창고'],
          mat_id=element['자재품번'],
          qty=element['입/출고수량'];
          unit=element['단위'],
          comment=regExp_test(element['비고']),
          file1=element['첨부파일']
          
         
      
      
          let sql_mfmblothis = `INSERT INTO mfmblothis (ORDER_ID,VENDOR,TRAN_TIME,STORE_ID,MAT_ID,QTY,TRAN_COMMENT) VALUES 
          ('${req}','${vendor}','${last_tran}','${store}','${mat_id}','${checkNum(qty)}','${comment}') `;
  
          let sql_mfmblotsts = ` INSERT INTO mfmblotsts (ORDER_ID,VENDOR,LAST_TRAN_TIME,STORE_ID,MAT_ID,QTY,LAST_COMMENT,FILE1) VALUES 
          ('${req}','${vendor}','${last_tran}','${store}','${mat_id}','${checkNum(qty)}','${comment}','${file1}')`;
      
          //resultData2.push(params)
  
          console.log(sql_mfmblothis+sql_mfmblotsts)
      
      
          conn.query(sql_mfmblothis, function(err, rows, fields){           v
              if(err){
                  console.log("에러 : "+err,rows);
                /*   let failSql=`INSERT INTO excel_import_fail_logs
                  (eORDER_IDX, eComment, eCreateDate)
                  VALUES ('${req}', '${err}', NOW())`;
                  conn.query(failSql, function(err, rows, fields){
                      if(err){
                          console.log(err)
                      }else{
  
                      }
                  }); */
                  failCnt++
              } else {
                  //console.log("성공 : "+rows.insertId);
                  sucCnt++
              }
           
          });
  

          conn.query(sql_mfmblotsts, function(err, rows, fields){
              if(err){
                  console.log("에러 : "+err,rows);
                /*   let failSql=`INSERT INTO excel_import_fail_logs
                  (eORDER_IDX, eComment, eCreateDate)
                  VALUES ('${req}', '${err}', NOW())`;
                  conn.query(failSql, function(err, rows, fields){
                      if(err){
                          console.log(err)
                      }else{
  
                      }
                  }); */
                  failCnt++
              } else {
                  //console.log("성공 : "+rows.insertId);
                  sucCnt++
              }
           
          });

      }); 


      fs.rename(stockFolder+"/"+file_Name, stockFolder+"/done/"+file_Name,function(err){
        if(err){
            console.log('err : '+err)
        }else{
          let doneSql=`INSERT INTO excel_import_logs
          (eFile_name, eSucCnt, eFailCnt, eCreateDate)
          VALUES ('${file_Name}', ${sucCnt}, ${failCnt}, NOW())`;
          conn.query(doneSql, function(err, rows, fields){
              if(err){
                  console.log(err)
              }else{
  
              }
          });
        }
    });

  
  
    })
    
  })


function checkValue(val){
    if(val==''||val==undefined){
        return 0
    }

}


function checkNum(val){
    if(val==''||val==undefined){
        return val
    }
    return val.replace(/[^0-9]/g,'');
}


function changeOPERCODE(val){

    if(val==undefined){
        return val
    }
    let result=val.split(',');
    result=result[result.length-1]

    switch(result){
        case '파이프 절단':
            //console.log(result);
            return 'CUT001'
        case '레이저':
            //console.log(result);
            return 'CUT001'
        case '샤링':
            //console.log(result);
            return 'CUT001'
        case '절곡(노컷)' :
            //console.log(result);
            return 'BEND001'
        case '절곡(v-cut)' :
            //console.log(result);
            return 'BEND002'
        case '제작(용접)' :
            //console.log(result);
            return 'ASSY001'
        case '로라 가공' :
            //console.log(result);
            return 'ASSY001'
        case '샤링' :
            //console.log(result);
            return 'ASSYㅋ ㅋ001'
        default:
            return result

    }
}

function intTodate(val){
    if(val==''){
        return '0000-00-00'
    }
    let date = new Date(( parseInt(val) - (25567 + 2))*86400*1000)
    let unix = date.getUTCFullYear()+'-'+lpad((date.getMonth()+1),2,'0')+'-'+lpad(date.getUTCDate(),2,'0')
   
    return unix
}


function regExp_test(str){
    //함수를 호출하여 특수문자 검증 시작.
 
    var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
    if(regExp.test(str)){
        var t = str.replace(regExp, "");
        //특수문자를 대체. ""
        //console.log("특수문자 제거. ==>" + t);
        //특수문자 제거. ==>20171031
        return t;
    }else{
        if(str==''||str==undefined){
            return ''
        }
        return str
        //console.log("특수문자 없음 "+str);
    }
}


function lpad(str, padLen, padStr) {
    if (padStr.length > padLen) {
        console.log("오류 : 채우고자 하는 문자열이 요청 길이보다 큽니다");
        return str;
    }
    str += ""; // 문자로
    padStr += ""; // 문자로
    while (str.length < padLen)
        str = padStr + str;
    str = str.length >= padLen ? str.substring(0, padLen) : str;
    return str;
}




