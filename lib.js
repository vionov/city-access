const moment = require('moment');

function convertStringToObject (row) {
    const columns = row.trim().split('\t');
    
    if (columns.length === 7) {
        const obj = {};
        const time = formatTimeDigits(columns[0]);
        const date = formatDateDigits(columns[1]);
        const surname = columns[2];
        const name = columns[3];
        const team = columns[4];
        const entrance = columns[5];
        const id = columns[6];
        
        obj[id] = {
            dates: {
                [date]: {
                    [time]: entrance
                }
            },
            name: `${surname} ${name}`,
            team
        }
        return obj;
    }
}

function formatDateDigits(date) {
    const dateDelimeter = '.';
    if (date.length === 10) {
        return date;
    }

    return date
        .split(dateDelimeter)
        .map((item, index) => {
            // год всегда 4 цифры
            if (index !== 2) {
                if (item.length === 1) {
                    return `0${item}`;
                }
            }
            return item;
        })
        .join(dateDelimeter);
}

function formatTimeDigits(time) {
    const timeDelimeter = ':';
    if (time.length === 8) {
        return time;
    }

    return time
        .split(timeDelimeter)
        .map(item => {
            if (item.length === 1) {
                return `0${item}`;
            }
            return item;
        })
        .join(timeDelimeter);
}

function addFileToDb(db = {}, rowsArr) {    
    for(let i=0; i<rowsArr.length; i++) {
        let obj = convertStringToObject(rowsArr[i]);
        if (obj) {
            const id = Object.keys(obj)[0];
            const date = Object.keys(obj[id].dates)[0];
            const time = Object.keys(obj[id].dates[date])[0];

            if (db[id]) {
                if (db[id].dates[date]) {
                    if (!db[id].dates[date][time]) {
                        db[id].dates[date][time] = obj[id].dates[date][time];
                    }
                } else {
                    db[id].dates[date] = obj[id].dates[date];
                }
            } else {
                db[id] = obj[id];
            }
        }
    }

    return db;
}

function getTimeDiff(timeOne, timeTwo) {
    const date = '01.01.2019';
    const first = moment(`${date} ${timeOne}`, 'DD.MM.YYYY HH:mm:ss');
    const second = moment(`${date} ${timeTwo}`, 'DD.MM.YYYY HH:mm:ss');

    return moment.duration(first.diff(second));
}

function convertTimeDiffToTime(diffObject) {
    const parts = diffObject._data;
    const daysInHours = parts.days ? parts.days * 24 : 0;
    const hours = Math.abs(parts.hours) + daysInHours;

    const diffWithoutZeros = `${hours}:${Math.abs(parts.minutes)}:${Math.abs(parts.seconds)}`;

    return formatTimeDigits(diffWithoutZeros);
}

function sumDurations(durationsArr) {
    if (!durationsArr.length) {
        return '00:00:00';
    }
    
    if (durationsArr.length === 1) {
        const durationObj = convertToDurationObject(durationsArr[0]);
        return convertTimeDiffToTime(durationObj);
    }
    
    // если пришли строки - превращаем их в объекты
    let baseDuration = convertToDurationObject(durationsArr[0]);
    for(let i=1; i<durationsArr.length; i++) {
        const durationObj = convertToDurationObject(durationsArr[i]);
        baseDuration.add(durationObj);
    }
    
    return convertTimeDiffToTime(baseDuration);
}

function convertToDurationObject(stringOrObj) {
    return stringOrObj.isValid ? stringOrObj : moment.duration(stringOrObj);
}

function sumDayWorkingHours(dayObject) {
    const enteringLogTitle = 'фипс';
    const timeIntervals = Object.keys(dayObject);

    let pair = [];
    const durationsArr = [];

    for(let i=0; i<timeIntervals.length;i++) {
        const time = timeIntervals[i];
        const logLocation = dayObject[time];
        
        // первая запист в массиве pair должна быть временем входа
        if (logLocation.toLowerCase().includes(enteringLogTitle)) {
            pair.push(time);
        } else {
            // если первая запись - выход, значит считаем, что вход был в полночь
            if (i === 0) {
                pair.push('00:00:00');
            }

            // если запись была выходная на этой итерации, а на прошлой уже был вход - делаем пару вход-выход
            if (pair.length === 1) {
                pair.push(time);
            }
        }

        // если мы уже обработали последнюю запись и она была "входной", значит рабочие часы считаем до конца дня
        if (pair.length === 1 && i === timeIntervals.length - 1) {
            pair.push('23:59:59');
        }

        // если пара укомплектована, знаит можно посчитать разницу между входом и выходом и сохранить 
        // в массив промежутков для дальнейшего суммирования
        if (pair.length === 2) {
            const duration = getTimeDiff(...pair);
            durationsArr.push(duration);
            pair = [];
        }
    }

    if (!durationsArr.length) {
        return '00:00:00';
    } else {
        return sumDurations(durationsArr);
    }
}

function calculateDays(dataObj) {
    const peopleIdsArr = Object.keys(dataObj);
    const resultObj = {};

    for(let i=0; i<peopleIdsArr.length; i++) {
        const id = peopleIdsArr[i];
        const { name, team } = dataObj[id];
        const datesArr = Object.keys(dataObj[id].dates);
        const dates = {};

        for(let j=0; j<datesArr.length; j++) {
            const day = datesArr[j];
            const dayIntervalsObj = dataObj[id].dates[day];
            dates[day] = sumDayWorkingHours(dayIntervalsObj);
        }

        const valuesArr = Object.values(dates);
        const total = sumDurations(valuesArr);

        if (!resultObj[id]) {
            resultObj[id] = {
                name,
                team,
                dates,
                total
            };
        }
    }

    return resultObj;
}

function convertToCsvFormat(dataObj) {
    const title = '№ отдела,Ф.И.О.,';
    const peopleIdsArr = Object.keys(dataObj);
    const generatDatesListSorted = findAllDates(dataObj);
    const resultRowsArray = [];

    resultRowsArray.push(`${title}${generatDatesListSorted.join(',')}, Всего`);

    for(let i=0; i<peopleIdsArr.length; i++) {
        const person = dataObj[peopleIdsArr[i]];
        const dates = arrangeDatesToRow(person.dates, generatDatesListSorted);
        const row = `${person.team},${person.name},${dates}${person.total}`;
        resultRowsArray.push(row);
    }

   return resultRowsArray.sort((a, b) => {
        const teamA = a.slice(0, a.indexOf(','));
        const teamB = b.slice(0, b.indexOf(','));
        return teamA.localeCompare(teamB);
    });
}

function arrangeDatesToRow(currentDates, allDatesArr) {
    let row = '';

    for(let i=0; i<allDatesArr.length; i++) {
        const date = allDatesArr[i];
        
        if (currentDates[date]) {
            row += `${currentDates[date]},`;
        } else {
            row += ',';
        }
    }

    return row;
}

function findAllDates(dataObj) {
    const generalDatesList = {};
    const peopleIdsArr = Object.keys(dataObj);

    for(let i=0; i<peopleIdsArr.length; i++) {
        const { dates } = dataObj[peopleIdsArr[i]];
        const dateKeys = Object.keys(dates);
        
        for(let j=0; j<dateKeys.length; j++) {
            const date = dateKeys[j];
            if (!generalDatesList[date]) {
                generalDatesList[date] = true;
            }
        }
    }
    return Object.keys(generalDatesList).sort((a, b) => moment(a, 'DD.MM.YYYY').unix() - moment(b, 'DD.MM.YYYY').unix());
}

module.exports = {
    convertStringToObject,
    formatDateDigits,
    formatTimeDigits,
    addFileToDb,
    getTimeDiff,
    convertTimeDiffToTime,
    sumDurations,
    sumDayWorkingHours,
    calculateDays,
    convertToCsvFormat,
    arrangeDatesToRow
};