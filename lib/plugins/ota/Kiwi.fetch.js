const moment = require('moment');

const Utils = require('../../Utils');

const UrlHome = 'https://www.kiwi.com/us/search';
const UrlResults = 'https://www.kiwi.com/us/search/';

////////////////////////////////////////////////////////////////////////////////

let isOnResultsPage = false;

module.exports = async function fetch(req, browser) {
  const filesByName = {}
  browser.config({
    async onResponse(res) { await addToFiles(res, filesByName) },
    waitUntil: 'domcontentloaded'
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);
    await page.waitFor('.SearchForm');

    console.log('CLEARING FIELDS')
    await clearAptField(page, 'origin');
    await clearAptField(page, 'destination');
    await Utils.sleep(1000);

    console.log('INSERTING DATE')
    await selectDate(page, req.depDate)
    await Utils.sleep(1000);

    console.log('INSERTING ORIGIN')
    await insertAptCode(page, 'origin', req.depApt);
    await Utils.sleep(1000);

    console.log('INSERTING DESTINATION')
    await insertAptCode(page, 'destination', req.arrApt);

    isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.resultsPageIsLoaded(true);

    await page.waitForFunction(function() {
      const loadingBar = document.querySelector('.NormalResults .LoadingBar')
      return (!loadingBar || loadingBar.className.includes('is-active')) ? false : true;
    }, { polling: 50, timeout: 60000 });

    const html = await page.content()
    console.log('DONE!!!!!')
    await Utils.sleep(5000);

    return { html, filesByName };

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

const usableResponse = [
  'https://api.skypicker.com/flights',
  // 'https://meta-searches.skypicker.com/search'
];

async function addToFiles(response, filesByName) {
  const request = response.request();
  const type = request.resourceType();
  const url = response.url();
  const prefix = url.match(/[^?]+/)[0];

  if (!['script','xhr'].includes(type)) return;
  const isUsableFile = usableResponse.some(prefix => url.includes(prefix));
  const body = await response.text();
  if (isUsableFile && body && isOnResultsPage) {
    const content = JSON.parse(body);
    filesByName[prefix] = filesByName[prefix] || [];
    filesByName[prefix].push(content);
    // console.log('--------------------------------------------')
    // console.log(`  - ${type} : ${url}`)
  // } else if (!isUsableFile) {
  //   console.log('--------------------------------------------')
  //   console.log(`  - ${type} : ${url}`)
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

async function selectDate(page, reqDate) {
  await page.click('.SearchDateField.outboundDate');
  await page.evaluate(() => {
    return new Promise((resolve, reject) => {
      (function checkCalendar() {
        const calendar = document.querySelector('.PickerCalendarFrame .calendar-view .Calendar');
        if (calendar) return resolve()

        const destinationPicker = document.querySelector('.ModalPicker.destination');
        if (destinationPicker) document.querySelector('.SearchDateField.outboundDate').click();

        console.log('waiting for calendar');
        setTimeout(checkCalendar, 100);
      })();
    });
  })

  const months = Array(12).fill(null).map((v,i) => moment().add(i,'month').format('MMMM YYYY'))
  console.log('MONTHS: ', months)
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
  await Utils.sleep(100);
  await page.type(`input.input-${type}`, aptCode);
  const optionsSelector = `.PlacePicker .Places .places-list .place-row.clickable`;
  await page.waitFor(optionsSelector);
  await page.evaluate(function(optionsSelector, aptCode) {
    return new Promise((resolve, reject) => {
      const modeAll = document.querySelector(`.PlacePicker .ModalPickerMenu .mode-all`);
      if (modeAll) modeAll.click();
      (function checkElems() {
        const regex = new RegExp(`^${aptCode}`);
        const elems = document.querySelectorAll(optionsSelector);
        for (var i = 0; i < elems.length; ++i) {
          var elem = elems[i];
          if (!elem.querySelector('.place-icon.ic_flight') && !elem.querySelector('.ic_add_circle')) continue;
          const text = elem.querySelector('.name .main').innerText.trim();
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
