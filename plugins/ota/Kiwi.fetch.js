const moment = require('moment');

const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.kiwi.com/us/search';
const UrlResults = 'https://www.kiwi.com/us/search/';

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, { addFile }) {
  const status = { isOnResultsPage: false };
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
    waitUntil: 'domcontentloaded'
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);
    await page.waitFor('.SearchForm');

    console.log('CLEARING FIELDS')
    await clearAptField(page, 'origin');
    await clearAptField(page, 'destination');
    await Utils.sleep(500);

    // oneway or roundtrip
    if (req.retDate) {
      console.log('SET ROUNDTRIP')
      await page.click('.SearchFormModesPicker-scrollContainer .RadioButtonsOption:nth-child(1)')
    } else {
      console.log('SET ONEWAY')
      await page.click('.SearchFormModesPicker-scrollContainer .RadioButtonsOption:nth-child(2)')
    }

    console.log('INSERTING depDate')
    await selectDate(page, req.depDate, '.SearchDateField.outboundDate', 'outboundDate')
    await Utils.sleep(200);

    if (req.retDate) {
      console.log('INSERTING retDate')
      await selectDate(page, req.retDate, '.SearchDateField.inboundDate', 'inboundDate')
      await Utils.sleep(200);
    }

    console.log('INSERTING depApt')
    await insertAptCode(page, 'origin', req.depApt);
    await Utils.sleep(100);

    console.log('INSERTING arrApt')
    await insertAptCode(page, 'destination', req.arrApt);

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.resultsPageIsLoaded(true);
    await Utils.sleep(2000);

    await page.waitForFunction(function() {
      const resultsElem = document.querySelector('.Results')
      if (!resultsElem) return false
      const loadingLineElem = document.querySelector('.Results .LoadingLine')
      if (loadingLineElem) return false;

      const loadingBarElem = document.querySelector('.Results .LoadingBar')
      return (loadingBarElem && loadingBarElem.className.includes('is-active')) ? false : true;
    }, { polling: 50, timeout: 60000 });

    return await page.content()

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

const usableResponse = [
  'https://api.skypicker.com/flights',
  'https://r-umbrella-app.skypicker.com/graphql'
  // 'https://meta-searches.skypicker.com/search'
];

async function processFiles(response, addFile, status) {
  if (!status.isOnResultsPage) return;
  const request = response.request();
  const type = request.resourceType();
  const url = response.url();
  const prefix = url.match(/[^?]+/)[0];

  if (!['script','xhr'].includes(type)) return;
  const isUsableFile = usableResponse.some(prefix => url.includes(prefix));
  const body = await response.text();
  if (isUsableFile && body) {
    const content = JSON.parse(body);
    addFile(prefix, content);
    // console.log('--------------------------------------------')
    // console.log(`  - ${type} : ${url}`)
  } else if (!isUsableFile) {
    console.log('--------------------------------------------')
    console.log(`  - ${type} : ${url}`)
    // console.log(body)
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

async function selectDate(page, reqDate, inputSel, modalClass) {
  await page.click(inputSel);
  await page.evaluate((inputSel, modalClass) => {
    return new Promise((resolve, reject) => {
      (function checkCalendar() {
        const modalPicker = document.querySelector('.ModalPicker');
        if (modalPicker && !modalPicker.classList.contains(modalClass)) {
          console.log('clicking on ', inputSel)
          document.querySelector(inputSel).click();
        } else if (!modalPicker) {
          console.log('clicking on ', inputSel)
          document.querySelector(inputSel).click();
        } else {
          const calendar = document.querySelector('.PickerCalendarFrame .calendar-view .Calendar .Calendar-month');
          if (calendar) return resolve()
        }
        console.log('waiting for calendar');
        setTimeout(checkCalendar, 100);
      })();
    });
  }, inputSel, modalClass)

  const months = Array(12).fill(null).map((v,i) => moment().add(i,'month').format('MMMM YYYY'))
  page.evaluate((months, reqDate, reqDay) => {
    return new Promise((resolve, reject) => {
      const reqIndex = months.indexOf(reqDate);
      (function selMonth() {
        const curDate = document.querySelector('.PickerCalendarFrame .calendar-view .Calendar .Calendar-month').innerText;
        const curIndex = months.indexOf(curDate);
        if (curIndex === reqIndex) return selDay();
        else if (curIndex > reqIndex) document.querySelector('.PickerCalendarFrame > .prev').click();
        else if (curIndex < reqIndex) document.querySelector('.PickerCalendarFrame > .next').click();
        setTimeout(selMonth, 100);
      })();
      function selDay() {
        const elems = document.querySelectorAll('.PickerCalendarFrame .calendar-view-1 .CalendarDay');
        for (var i = 0; i < elems.length; ++i) {
          const elem = elems[i];
          const curDay = elem.querySelector('.day-number').innerText;
          if (reqDay === curDay) {
            elem.click();
            resolve();
          }
        }
      };
    });
  }, months, reqDate.format('MMMM YYYY'), reqDate.format('D'))
}

async function clearAptField(page, type) {
  await page.evaluate((type) => {
    return new Promise((resolve, reject) => {
      (function removeSelection() {
        const elem = document.querySelector(`.SearchField.${type} .input-place-close`);
        if (!elem) return resolve();
        elem.click();
        setTimeout(removeSelection, 100);
      })();
    })
  }, type);
}

async function insertAptCode(page, type, aptCode) {
  await clearAptField(page, type);
  await Utils.sleep(400);
  await page.click(`input.input-${type}`);
  await page.type(`input.input-${type}`, aptCode, { delay: 100 });
  const optionsSelector = `.PlacePicker-content .PlacePicker-places .places-list .PlacePickerRow.clickable`;
  console.log('waiting for optionsSelector');
  await page.waitFor(optionsSelector);

  console.log('evaluating optionsSelector')
  await page.evaluate(function(optionsSelector, aptCode) {
    return new Promise((resolve, reject) => {
      const modeAll = document.querySelector(`.PlacePicker .ModalPickerMenu .mode-all`);
      // console.log('modeAll: ', modeAll);
      if (modeAll) modeAll.click();
      (function checkElems() {
        const regex = new RegExp(`^${aptCode}`);
        const elems = document.querySelectorAll(optionsSelector);
        for (var i = 0; i < elems.length; ++i) {
          var elem = elems[i];
          // console.log('elem: ', elem)
          if (!elem.querySelector('.ic_flight') && !elem.querySelector('.ic_add_circle')) continue;
          const text = elem.querySelector('.PlacePickerRow-name').innerText.trim();
          if (elem.getAttribute('tabindex') === aptCode || text.match(regex)) {
            elem.click();
            return resolve();
          }
        }
        setTimeout(checkElems, 100);
      })();
    })
  }, optionsSelector, aptCode);
}
