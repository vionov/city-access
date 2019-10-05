const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const { addFileToDb, calculateDays, convertToCsvFormat } = require('./lib');

processFiles();

function processFiles() {
    const filesList = fs.readdirSync('./../data', { withFileTypes: '*.txt'});
    const db = addAllFilestoDb(filesList);
    const resultsObj = calculateDays(db);

    const csvData = convertToCsvFormat(resultsObj);

    fs.writeFileSync('result.csv', csvData.join('\n'));
}

function addAllFilestoDb(filesList) {
    const db = {};

    for(let i=0; i<filesList.length; i++) {
        const filePath = path.resolve('./../data', filesList[i].name);
        const rowsArr = readFileToArray(filePath);
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