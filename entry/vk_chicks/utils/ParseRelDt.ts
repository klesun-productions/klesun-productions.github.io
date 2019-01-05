
/// <reference path="../../../src/references.ts" />

let months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

let parseAmount = (str: string) => {
    let words: {[p: string]: number} = {
        'один': 1,
        'одну': 1,
        'одно': 1,
        'два': 2,
        'две': 2,
        'три': 3,
        'четыре': 4,
        'пять': 5,
        'шесть': 6,
        'семь': 7,
        'восемь': 8,
        'девять': 9,
    };
    return words[str.trim()] || + str;
};

// 'заходила 5 ноября 2018 в 13:19'
// 'заходила сегодня в 13:19'
// 'заходила вчера в 23:16'
// 'Online'
// 'заходила 6 минут назад'
export let ParseRelDt = (baseDt: string, relDt: string | null): string | null => {
    let tmpDtObj = new Date(baseDt.replace(' ', 'T') + 'Z');
    tmpDtObj.setSeconds(0);
    let match;
    let error = null;
    if (!relDt) {
        return null;
    } else if (['заходила только что', 'online'].includes(relDt.trim().toLowerCase())) {
        return baseDt;
    } else if (match = relDt.match(/заходила( [а-я0-9]+|) ([а-я]+) назад/i)) {
        let [_, amountStr, units] = match;
        let amount = parseAmount(amountStr);
        if (['секунд', 'секунды', 'секунду'].includes(units)) {
            tmpDtObj.setSeconds(tmpDtObj.getSeconds() - amount);
        } else if (['минут', 'минуты', 'минуту'].includes(units)) {
            tmpDtObj.setMinutes(tmpDtObj.getMinutes() - amount);
        } else if (['часов', 'часа', 'час'].includes(units)) {
            tmpDtObj.setHours(tmpDtObj.getHours() - amount);
        } else if (['дней', 'дня', 'день'].includes(units)) {
            tmpDtObj.setDate(tmpDtObj.getDate() - amount);
        } else if (['месяцев', 'месяца', 'месяц'].includes(units)) {
            tmpDtObj.setMonth(tmpDtObj.getMonth() - amount);
        } else {
            error = 'unsupported units - ' + units;
        }
    } else if (match = relDt.match(/заходила сегодня в (\d{1,2}):(\d{2})/i)) {
        let [_, h, i] = match;
        tmpDtObj.setHours(+h);
        tmpDtObj.setMinutes(+i);
    } else if (match = relDt.match(/заходила вчера в (\d{1,2}):(\d{2})/i)) {
        let [_, h, i] = match;
        tmpDtObj.setDate(tmpDtObj.getDate() - 1);
        tmpDtObj.setHours(+h);
        tmpDtObj.setMinutes(+i);
    } else if (match = relDt.match(/заходила (\d+) ([а-я]+)( \d{4}|) в (\d{1,2}):(\d{2})/i)) {
        let [_, d, month, y, h, i] = match;
        if (y.trim()) {
            tmpDtObj.setFullYear(+y);
        }
        let m = months.indexOf(month);
        if (m < 0) {
            error = 'unsupported month - ' + month;
        }
        tmpDtObj.setMonth(+m);
        tmpDtObj.setDate(+d);
        tmpDtObj.setMinutes(+i);
        tmpDtObj.setHours(+h);
        tmpDtObj.setMinutes(+i);
        if (tmpDtObj.toISOString().slice(0, 10) > baseDt.slice(0, 10)) {
            tmpDtObj.setFullYear(tmpDtObj.getFullYear() - 1);
        }
    } else {
        error = 'unsupported format';
    }
    if (error) {
        console.error('Failed to parse relative date ' + relDt + ' - ' + error);
        return null;
    } else {
        return tmpDtObj.toISOString();
    }
};