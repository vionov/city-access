const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const { addFileToDb, calculateDays, convertToCsvFormat } = require('./lib');

const filesInDir = fs.readdirSync('data', { withFileTypes: '*.txt'});
const db = addAllFilestoDb();

let resultsObj = {};
resultsObj = calculateDays(db);

let csvData = convertToCsvFormat(resultsObj);
// console.log(csvData);

fs.writeFileSync('result.csv', csvData.join('\n'));

function addAllFilestoDb() {
    const db = {};

    for(let i=0; i<filesInDir.length; i++) {
        const rowsArr = readFileToArray(path.resolve('data', filesInDir[i].name));
        addFileToDb(db, rowsArr);
    }
    return db;
}

function readFileToArray(file) {
    const content = fs.readFileSync(file);
    const contentUtf = iconv.encode(iconv.decode(content, 'win1251'), 'utf8').toString();
    const arr = contentUtf.split('\n');
    return arr;
}