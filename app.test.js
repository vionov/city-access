const moment = require('moment');

const { 
    convertStringToObject, 
    formatDateDigits, 
    formatTimeDigits,
    addFileToDb,
    getTimeDiff,
    convertTimeDiffToTime,
    sumDurations,
    sumDayWorkingHours,
    arrangeDatesToRow
} = require('./lib');

describe('Формирование объектов', () => {
    test('Преобразование строки лога в объект', () => {
        const row = "4:41:55	1.04.2019	Иванова	Анна Евгеньевна	Отдел 001	Улица Снаружи	1234567	";
        const obj = {
            '1234567': {
                dates: {
                    '01.04.2019': {
                        '04:41:55': 'Улица Снаружи'
                    }
                },
                name: 'Иванова Анна Евгеньевна',
                team: 'Отдел 001'
            }
        };
        
        expect(convertStringToObject(row)).toMatchObject(obj);
    });

    test('Преобразование массива строк лога в объект', () => {
        const inputArray = [
            "14:41:55	01.04.2019	Иванова	Анна Евгеньевна	Отдел 001	Улица Снаружи	1234567	",
            "12:43:55	01.04.2019	Иванова	Анна Евгеньевна	Отдел 001	Еще где-то	1234567	",
            "12:3:55	02.04.2019	Сидорова	Наталья Михайловна	Отдел 002	Еще где-то	1236666	",
            "1:3:2	2.04.2019	Иванова	Анна Евгеньевна	Отдел 001	Еще где-то	1234567	",
        ];

        const outPutObj = {
            "1234567": {
                dates: {
                    "01.04.2019": {
                        "14:41:55": "Улица Снаружи",
                        "12:43:55": "Еще где-то"
                    },
                    "02.04.2019" : {
                        "01:03:02": "Еще где-то",
                    }
                },
                name: "Иванова Анна Евгеньевна",
                team: "Отдел 001"
            },
            "1236666": {
                dates: {
                    "02.04.2019": {
                        "12:03:55": "Еще где-то"
                    }
                },
                name: "Сидорова Наталья Михайловна",
                team: "Отдел 002"
            }
        };

        expect(addFileToDb({}, inputArray)).toMatchObject(outPutObj);
    });
});

describe('Преобразования дат и времени', () => {
    test('Дополнение дня даты до 2 цифр', () => {
        const wrongDate = '6.11.2009';
        const goodDate = '06.11.2009';

        expect(formatDateDigits(wrongDate)).toMatch(goodDate);
    });

    test('Дополнение месяца даты до 2 цифр', () => {
        const wrongDate = '06.1.2009';
        const goodDate = '06.01.2009';

        expect(formatDateDigits(wrongDate)).toMatch(goodDate);
    });

    test('Без изменений', () => {
        const wrongTime = '01:14:37';
        const goodTime = '01:14:37';

        expect(formatTimeDigits(wrongTime)).toMatch(goodTime);
    });

    test('Нет часа и минут', () => {
        const wrongTime = '1:4:37';
        const goodTime = '01:04:37';

        expect(formatTimeDigits(wrongTime)).toMatch(goodTime);
    });

    test('Все нули', () => {
        const wrongTime = '0:0:00';
        const goodTime = '00:00:00';

        expect(formatTimeDigits(wrongTime)).toMatch(goodTime);
    });
});

describe('Подсчет времени', () => {
    test('Преобразование объекта временной разницы в строку', () => {
        const duration = moment.duration('22:22:22');
        const row = '22:22:22';

        expect(convertTimeDiffToTime(duration)).toMatch(row);
    });

    test('Сумма в днях превращается в часы', () => {
        const durationOne = moment.duration('22:22:22');
        const durationTwo = moment.duration('22:33:33');
        const durationsSum = durationOne.add(durationTwo);
        const sum = '44:55:55';

        expect(convertTimeDiffToTime(durationsSum)).toMatch(sum);
    });

    test('Разница между двумя временными промежутками', () => {
        const timeOne = '11:13:44';
        const timeTwo = '11:11:02';
        const diff = '00:02:42';

        expect(convertTimeDiffToTime(getTimeDiff(timeOne, timeTwo))).toMatch(diff);
    });

    test('Разница между двумя временными промежутками с неправильным порядком', () => {
        const timeOne = '11:13:44';
        const timeTwo = '11:11:02';
        const diff = '00:02:42';

        expect(convertTimeDiffToTime(getTimeDiff(timeTwo, timeOne))).toMatch(diff);
    });

    test('Нулевая разница + плохой формат', () => {
        const timeOne = '1:13:44';
        const timeTwo = '01:13:44';
        const diff = '00:00:00';

        expect(convertTimeDiffToTime(getTimeDiff(timeTwo, timeOne))).toMatch(diff);
    });

    test('Суммирование 0 разниц во времени', () => {
        expect(sumDurations([])).toMatch('00:00:00');
    });

    test('Суммирование 1 разницы во времени с самой собой', () => {
        const timeOne = '01:13:44';
        const timeTwo = '11:11:02';
        const computedDiff = getTimeDiff(timeTwo, timeOne);

        expect(sumDurations([computedDiff])).toMatch('09:57:18');
    });

    test('Суммирование трех временных промежутков', () => {
        const computedDiff = getTimeDiff('01:10:10', '01:05:05');
        const computedDiff2 = getTimeDiff('01:20:20', '01:10:10');
        const computedDiff3 = getTimeDiff('01:12:12', '01:06:06');
        const durationsSum = sumDurations([computedDiff, computedDiff2, computedDiff3]);

        expect(durationsSum).toMatch('00:21:21');
    });

    test('Суммирование корректных промежутков внутри даты', () => {
        const dayObject = {
            "01:05:05": "ЗОНА ФИПС",
            "01:10:10": "Пространство Снаружи",
            "01:15:15": "ЗОНА ФИПС",
            "01:20:20": "Пространство Снаружи",
            "01:25:25": "ЗОНА ФИПС",
            "01:30:30": "Пространство Снаружи"
        };
        const intervalsSum = sumDayWorkingHours(dayObject);

        expect(intervalsSum).toMatch('00:15:15');
    });

    test('Суммирование непарных промежутков внутри даты (нет первого входа)', () => {
        const dayObject = {
            "01:10:10": "Пространство Снаружи",
            "01:15:15": "ЗОНА ФИПС",
            "01:20:20": "Пространство Снаружи",
            "01:25:25": "ЗОНА ФИПС",
            "01:30:30": "Пространство Снаружи"
        };
        const intervalsSum = sumDayWorkingHours(dayObject);

        expect(intervalsSum).toMatch('01:20:20');
    });

    test('Суммирование непарных промежутков внутри даты (нет последнего выхода)', () => {
        const dayObject = {
            "01:05:05": "ЗОНА ФИПС",
            "01:10:10": "Пространство Снаружи",
            "01:15:15": "ЗОНА ФИПС",
            "01:20:20": "Пространство Снаружи",
            "22:59:59": "ЗОНА ФИПС"
        };
        const intervalsSum = sumDayWorkingHours(dayObject);

        expect(intervalsSum).toMatch('01:10:10');
    });

    test('Зашел и до конца дня не вышел', () => {
        const dayObject = {
            "01:05:05": "ЗОНА ФИПС"
        };
        const intervalsSum = sumDayWorkingHours(dayObject);

        expect(intervalsSum).toMatch('22:54:54');
    });

    test('Не было входов за сутки', () => {
        const dayObject = {
            "01:05:05": "Пространство Снаружи"
        };
        const intervalsSum = sumDayWorkingHours(dayObject);

        expect(intervalsSum).toMatch('01:05:05');
    });

    test('Не было входов за сутки', () => {
        const datesObj = {
            '02.04.2019': '10:39:12',
            '04.04.2019': '09:27:34',
            '09.04.2019': '09:27:05',
            '05.04.2019': '08:23:56',
            '08.04.2019': '10:13:36'
        };
        const sortedArr = ['01.04.2019', '02.04.2019', '03.04.2019', '04.04.2019', '05.04.2019', '08.04.2019', '09.04.2019', '10.04.2019'];
        const row = arrangeDatesToRow(datesObj, sortedArr);
        const correctRow = ',10:39:12,,09:27:34,08:23:56,10:13:36,09:27:05,';

        expect(row).toMatch(correctRow);
    });
});