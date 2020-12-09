const xlsx = require('xlsx');
const mysql = require('mysql');
const fs = require('fs');
const schedule = require('node-schedule')
const procFolder = './proc';
const stockFolder = './stock';
const mysql_conn_info = {
    // host     : "115.23.164.16",
    host: "115.23.164.16",
    user: "root",
    password: 'fmbdb12#$',
    database: 'corechips_opc',
    port: '3307'
}

const conn = mysql.createConnection(mysql_conn_info);
let oper_code=[];

conn.connect((error) => {
    if (error) {
        console.error(error);
    } else {
        console.log('connection successful');
    }
});

conn.query('select * from oper_code',function (err, result) {
    if (err) throw err;
    //console.log('result',result)
    oper_code=JSON.parse(JSON.stringify(result) ) 
    
})




const resData = {};
var resultData = [];

let rule = new schedule.RecurrenceRule();
rule.second = 10;
let job = schedule.scheduleJob(rule, function () {
    console.log("10초마다 돈다.");
    procSTS();
    procHIS();
})






//작업진행현황
function procSTS() {

    fs.readdir(procFolder, function (error, filelist) {
        console.log(filelist);
        let sucCnt = 0, failCnt = 0;

        filelist.forEach(element => {
            if (element == 'done') {
                return;
            }

            console.log(element)
            let file_Name = element

            const workbook = xlsx.readFile(procFolder + "/" + file_Name);
            const sheetnames = Object.keys(workbook.Sheets);

            const sheetname = sheetnames[0];
            resData[sheetname] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetname]);
            resultData = resData[sheetname];


            resultData.forEach(element => {


                let req = element['작업지시ID'],
                    user = element['작업자'],
                    //due_date=intTodate(element['납기일자']),
                    due_date = element['납기일자'],
                    customer = element['고객사'],
                    file1 = element['도면 파일'],
                    file2 = element['견적서 파일'],
                    mat_type = element['제품타입'],
                    mat_thick = element['소재 두께'],
                    //oper = changeOPERCODE(element['작업공정']),
                    
                    comment = regExp_test(element['비고']),
                    //order_date=intTodate(element['작업일시']),
                    order_date = element['작업일시'],
                    qty = checkValue(element['작업수량']),
                    //qty = element['작업수량'],
                    loss_qty = checkValue(element['불량수량']),
                    time_type = '';
               

                let oper=oper_code.filter(x => {
                    return x.oName==element['작업공정']
                });

                if(oper.length!=0){
                    oper=oper[0].oCode
                }else{
                    oper='INV001'
                }
                



                if (oper == 'ASSY001') {
                    time_type = 'END_TIME';
                } else {
                    time_type = 'SHIP_TIME';
                }

             

                console.log('oper',oper)

                let sql_mfmblothis =
                    `INSERT INTO mfmblothis (ORDER_ID,TRAN_USER_ID,DUE_DATE,CUSTOMER,OPER,
                    TRAN_COMMENT,TRAN_TIME,QTY,LOSS_QTY) VALUES 
          ('${req}','${user}','${due_date}','${customer}','${oper}',
           '${comment}','${order_date}',${qty},${loss_qty},'${order_date}'); `;




                let update_sql = `UPDATE mfmblotsts 
            SET QTY = '${qty}',
            OPER='${oper}',`
                    + `${time_type} = '${order_date}'` +
                    ` WHERE ORDER_ID = '${req}'`;
                console.log(update_sql)

                conn.query(update_sql, function (err, result) {
                    if (err) throw err;
                    console.log(result.affectedRows + " record(s) updated\n");
                    if (result.affectedRows == 0) { //update가 안될경우 insert해준다

                        let sql_mfmblotsts = ` INSERT INTO mfmblotsts (ORDER_ID,DUE_DATE,CUSTOMER,FILE1,FILE2,MAT_TYPE,MAT_THICK,OPER,CREATE_QTY,LOSS_QTY,LAST_COMMENT,LAST_TRAN_TIME) VALUES 
              ('${req}','${due_date}','${customer}','${file1}','${file2}','${mat_type}','${mat_thick}','${oper}','${qty}','${loss_qty}','${comment}','${order_date}')`;






                        conn.query(sql_mfmblotsts, function (err, rows, fields) {
                            if (err) {
                                console.log("mfmblotsts 에러 : " + err, rows);
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

                    }

                    let sql_mfmblothis = `INSERT INTO mfmblothis (ORDER_ID,TRAN_USER_ID,DUE_DATE,CUSTOMER,OPER,TRAN_COMMENT,TRAN_TIME,QTY,LOSS_QTY) VALUES 
              ('${req}','${user}','${due_date}','${customer}','${oper}','${comment}','${order_date}',${qty},${loss_qty}); `;

                    conn.query(sql_mfmblothis, function (err, rows, fields) {
                        if (err) {
                            console.log("mfmblothis 에러 : " + err, rows);
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
            });

            fs.rename(procFolder + "/" + file_Name, procFolder + "/done/" + file_Name, function (err) {
                if (err) {
                    console.log('err : ' + err)
                } else {
                    let doneSql = `INSERT INTO excel_import_logs
            (eFile_name, eSucCnt, eFailCnt, eCreateDate)
            VALUES ('${file_Name}', ${sucCnt}, ${failCnt}, NOW())`;
                    conn.query(doneSql, function (err, rows, fields) {
                        if (err) {
                            console.log(err)
                        } else {

                        }
                    });
                }
            });

        })

    })

}
//자재현황
function procHIS() {

    fs.readdir(stockFolder, function (error, filelist) {
        console.log(filelist);
        let sucCnt = 0, failCnt = 0;

        filelist.forEach(element => {
            if (element == 'done') {
                return;
            }

            console.log(element)
            let file_Name = element

            const workbook = xlsx.readFile(stockFolder + "/" + file_Name);
            const sheetnames = Object.keys(workbook.Sheets);

            const sheetname = sheetnames[0];
            resData[sheetname] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetname]);
            resultData = resData[sheetname];


            resultData.forEach(element => {


                let req = element['작업지시ID'],
                    vendor = element['공급사'],
                    //last_tran=intTodate(element['입/출고 시간']),
                    last_tran = element['입/출고 시간'],
                    store = element['창고'],
                    mat_id = element['자재품번'],
                    qty = element['입/출고수량'];
                unit = element['단위'],
                    comment = regExp_test(element['비고']),
                    file1 = element['첨부파일'],
                    data_stat = element['상태'],
                    date_type = 'TRAN_TIME'

                if (req == undefined) {
                    req = mat_id;
                }

                if (data_stat == '입고') {
                    date_type = 'START_TIME'
                } else if (data_stat == '출고') {
                    date_type = 'END_TIME'
                }


                let update_sql = `UPDATE mfmblotsts 
                                    SET QTY = '${qty}',
                                    UNIT='${unit}',
                                    OPER='INV001',`
                                    + `${date_type} = '${last_tran}'` +
                                    ` WHERE ORDER_ID = '${req}'`;

                                    console.log('update_sql',update_sql)
                conn.query(update_sql, function (err, result) {
                    if (err) throw err;
                    console.log(result.affectedRows + " record(s) updated");
                  
                    if (result.affectedRows == 0) {




                        let sql_mfmblotsts =
                            ` INSERT INTO mfmblotsts (ORDER_ID,VENDOR,LAST_TRAN_TIME,STORE_ID,MAT_ID,CREATE_QTY,LAST_COMMENT,FILE1,CREATE_TIME,OPER,QTY) VALUES 
                            ('${req}','${vendor}','${last_tran}','${store}','${mat_id}','${checkNum(qty)}','${comment}','${file1}','${last_tran}','INV001','${checkNum(qty)}')`;




                        //resultData2.push(params)

                        console.log(sql_mfmblothis + sql_mfmblotsts)




                        conn.query(sql_mfmblotsts, function (err, rows, fields) {
                            if (err) {
                                console.log("에러 : " + err, rows);
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
                    }

                    let sql_mfmblothis = `INSERT INTO mfmblothis (ORDER_ID,VENDOR,TRAN_TIME,STORE_ID,MAT_ID,QTY,TRAN_COMMENT,OPER) VALUES 
            ('${req}','${vendor}','${last_tran}','${store}','${mat_id}','${checkNum(qty)}','${comment}','INV001') `;





                    conn.query(sql_mfmblothis, function (err, rows, fields) {
                        if (err) {
                            console.log("에러 : " + err, rows);
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
            });


            fs.rename(stockFolder + "/" + file_Name, stockFolder + "/done/" + file_Name, function (err) {
                if (err) {
                    console.log('err : ' + err)
                } else {
                    let doneSql = `INSERT INTO excel_import_logs
          (eFile_name, eSucCnt, eFailCnt, eCreateDate)
          VALUES ('${file_Name}', ${sucCnt}, ${failCnt}, NOW())`;
                    conn.query(doneSql, function (err, rows, fields) {
                        if (err) {
                            console.log(err)
                        } else {

                        }
                    });
                }
            });

        })

    })
}





function checkValue(val) {
    if (typeof  val == "undefined") {
        return 0
    }
    return val

}


function checkNum(val) {
    if (val == '' || val == undefined) {
        return 0
    }
    return val;
}


function changeOPERCODE(val) {

    if (val == undefined) {
        return val
    }
    let result = val.split(',');
    result = result[result.length - 1]

    switch (result) {
        case '파이프 절단':
            //console.log(result);
            return 'CUT001'
        case '레이저':
            //console.log(result);
            return 'CUT001'
        case '샤링':
            //console.log(result);
            return 'CUT001'
        case '절곡(노컷)':
            //console.log(result);
            return 'BEND001'
        case '절곡(v-cut)':
            //console.log(result);
            return 'BEND002'
        case '제작(용접)':
            //console.log(result);
            return 'ASSY001'
        case '로라 가공':
            //console.log(result);
            return 'ASSY001'
        case '샤링':
            //console.log(result);
            return 'ASSY001'
        default:
            return result

    }
}

function intTodate(val) {
    if (val == '') {
        return '0000-00-00'
    }
    let date = new Date((parseInt(val) - (25567 + 2)) * 86400 * 1000)
    let unix = date.getUTCFullYear() + '-' + lpad((date.getMonth() + 1), 2, '0') + '-' + lpad(date.getUTCDate(), 2, '0')

    return unix
}


function regExp_test(str) {
    //함수를 호출하여 특수문자 검증 시작.

    var regExp = /[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi;
    if (regExp.test(str)) {
        var t = str.replace(regExp, "");
        //특수문자를 대체. ""
        //console.log("특수문자 제거. ==>" + t);
        //특수문자 제거. ==>20171031
        return t;
    } else {
        if (str == '' || str == undefined) {
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




