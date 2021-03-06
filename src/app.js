const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const express = require('express');
const multer = require('multer');

const { addFileToDb, calculateDays, convertToCsvFormat } = require('./lib');

const port = process.env.PORT || 3000;
const inputPath = path.resolve(__dirname, 'input');
const outputPath = path.resolve(__dirname, 'output');

const app = express();
app.use(express.static(path.resolve(__dirname, 'ui')));

cleanDirs();
prepareDirs();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, inputPath);
    },
    filename: (req, file, cb) => {
        cb(
            null,
            file.originalname.slice(0, file.originalname.indexOf('.')) +
                '_' +
                Date.now() +
                '.txt'
        );
    }
});

const upload = multer({ storage: storage });

app.post('/', upload.array('logs'), (req, res, next) => {
    const filesList = Array.from(req.files).map(file =>
        path.resolve(file.destination, file.filename)
    );
    const resultFilePath = processFiles(filesList);

    res.send({
        url: resultFilePath
    });
});

app.get('/', (req, res) => {
    res.sendFile('index.html');
});

app.get('/output/:name', (req, res) => {
    const filePath = __dirname + req.url;
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.send({
            error: 'Файл уже удален!'
        });
    }
});

app.listen(port, () => console.log(`http://localhost:${port}`));

function prepareDirs() {
    fs.access(inputPath, fs.constants.F_OK, err => {
        if (err) {
            fs.mkdir(inputPath, err => {
                if (err) throw err;
            });
        }
    });
    fs.access(outputPath, fs.constants.F_OK, err => {
        if (err) {
            fs.mkdir(outputPath, err => {
                if (err) throw err;
            });
        }
    });
}

function cleanDirs() {
    fs.access(inputPath, fs.constants.F_OK, err => {
        if (!err) {
            fs.readdir(inputPath, (err, files) => {
                deleteFiles(files.map(file => path.resolve(inputPath, file)));
            });
        }
    });
    fs.access(inputPath, fs.constants.F_OK, err => {
        if (!err) {
            fs.readdir(outputPath, (err, files) => {
                deleteFiles(files.map(file => path.resolve(outputPath, file)));
            });
        }
    });
}

function deleteFiles(fileList) {
    if (fileList.length) {
        fileList.forEach(file => {
            fs.unlink(path.resolve(file), err => {
                if (err) {
                    console.log(err);
                }
            });
        });
    }
}

function processFiles(filesList) {
    const db = addAllFilestoDb(filesList);
    const resultsObj = calculateDays(db);
    const csvData = convertToCsvFormat(resultsObj);
    const resultFileName = `output/result_${Date.now()}.csv`;
    const resultFilePath = path.resolve(__dirname, resultFileName);
    fs.writeFileSync(resultFilePath, csvData.join('\n'));

    deleteFiles(filesList);

    setTimeout(() => {
        deleteFiles([resultFilePath]);
    }, 10 * 60 * 1000);

    return resultFileName;
}

function addAllFilestoDb(filesList) {
    const db = {};

    for (let i = 0; i < filesList.length; i++) {
        const rowsArr = readFileToArray(filesList[i]);
        addFileToDb(db, rowsArr);
    }
    return db;
}

function readFileToArray(file) {
    const content = fs.readFileSync(file);
    const contentUtf = iconv
        .encode(iconv.decode(content, 'win1251'), 'utf8')
        .toString();
    const arr = contentUtf.split('\n');
    return arr;
}
