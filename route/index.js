const express = require('express');
const router = express.Router();
const parseXlsx = require("excel");
const excelFolder="C:\Users\GoodusSmartSolution\Desktop\쌍용스텐_fmb\excel";


router.get("/excelShow", function(req,res,next){
  parseXlsx(excelFolder + "/작업진행현황.xlsx", function(err,data){
    res.json(data)
  })
})

module.exports = router;