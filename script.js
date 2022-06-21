'use strict';

const input = document.querySelector('.input');
const resultsSection = document.querySelector('.results-section');
const miniSection = document.querySelector('.minis');
const backArrow = document.querySelector('.arrow');
const headerTitle = document.querySelector('.header-title');
const btn = document.querySelector('.btn');
const errorMessageSearch = document.querySelector('.error-search');
const errorMessageGeo = document.querySelector('.error-geo');

const state = {
  query: '',
  cityInfo: [],
  weatherInfo: [],
  futureInfo: [],
};

// Helper Functions

const capitalised = function (name) {
  const split = name.split(' ');
  const newWord = [];
  split.forEach(word => {
    newWord.push(word[0].toUpperCase() + word.slice(1));
  });
  return newWord.join(' ');
};

const getDay = function (date) {
  return date.split(' ')[0].split('-')[2];
};

const filterDates = function (allDates, curDate) {
  if (!curDate) return;
  const futureDates = allDates.filter(
    data => getDay(data.dt_txt) !== getDay(curDate)
  );
  if (state.futureInfo.length === 4) return;

  state.futureInfo.push(futureDates[0]);

  filterDates(futureDates, futureDates[0].dt_txt);
};

const generateHTML = function (el) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date(el.timeStamp * 1000);

  return `
    <div class="mini fade-in">
      <span class="title-mini">${days[date.getDay()]}</span>
      <div><i class="icon-mini wi wi-owm-${el.id}"></i></div>
      <h2 class="temp-mini">
        <span class="temp-num-mini">${(el.temp - 273.15).toFixed(
          0
        )}</span>&#176;C
      </h2>
    </div>
`;
};

const closeWindow = function () {
  input.value = '';
  resultsSection.innerHTML = '';
  miniSection.innerHTML = '';
  state.futureInfo = [];
  backArrow.classList.add('nodisplay');
  errorMessageSearch.classList.add('nodisplay');
  errorMessageSearch.textContent = '';
  errorMessageGeo.classList.add('nodisplay');
  errorMessageGeo.textContent = '';
};

const displayError = function (el, err) {
  el.classList.remove('nodisplay');
  el.textContent = err.message;
};

const success = async function (pos) {
  const crd = pos.coords;
  const [lat, lon] = [crd.latitude, crd.longitude];
  const data = await returnData(lat, lon);
  citySearch(data.city.name);
};

const failure = function (err) {
  try {
    if (err) throw new Error('Unable to get device location!');
  } catch (err) {
    backArrow.classList.remove('nodisplay');
    displayError(errorMessageGeo, err);
  }
};

const getGeoCoords = async function (city) {
  try {
    const result = await fetch(
      `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`
    );

    const data = await result.json();

    state.cityInfo = {
      country: data[0].country,
      cityName: data[0].name,
    };

    return data.flatMap(data => {
      return [data.lat, data.lon];
    });
  } catch (err) {
    throw new Error('No city found, please search again!');
  }
};

const returnData = async function (lat, lon) {
  try {
    const result = await fetch(
      `http://api.openweathermap.org/data/2.5/forecast?&lat=${lat}&lon=${lon}&appid=${API_KEY}`
    );

    const data = await result.json();

    return data;
  } catch (err) {
    displaySearch(errorMessageGeo);
  }
};

const citySearch = async function (city) {
  try {
    closeWindow();
    backArrow.classList.remove('nodisplay');
    errorMessageSearch.classList.add('nodisplay');

    const [lat, lon] = await getGeoCoords(city);

    const data = await returnData(lat, lon);

    state.query = city;

    state.weatherInfo = data.list.map(el => {
      return {
        timeOfRecording: el.dt_txt,
        temp: el.main.temp,
        feelsLike: el.main.feels_like,
        humidity: el.main.humidity,
        description: el.weather
          .map(el => {
            return el.description;
          })
          .join(''),
        id: el.weather
          .map(el => {
            return el.id;
          })
          .join(''),
      };
    });

    const html = `
        <div class="main-results fade-in">
          <span class="day">Today</span>
          <div><i class="icon wi wi-owm-${state.weatherInfo[0].id}"></i></div>
          <h2 class="temp"><span class="temp-num">${(
            state.weatherInfo[0].temp - 273.15
          ).toFixed(0)}</span>&#176;C</h2>
          <p class="description">${capitalised(
            state.weatherInfo[0].description
          )}</p>
          <p class="location">
            <ion-icon name="location-outline"></ion-icon> ${
              state.cityInfo.cityName
            }
            <span class="country-tag">${state.cityInfo.country}</span>
          </p>
        </div>

        <div class="footer-main-results fade-in">
            <div class="feels-like-section">
              <ion-icon
                class="thermometer-outline"
                name="thermometer-outline"
              ></ion-icon>
              <div class="footer-desc">
                <p class="footer-temp">${(
                  state.weatherInfo[0].feelsLike - 273.15
                ).toFixed(0)}&#176;C</p>
                <p class="footer-mini-desc">Feels like</p>
            </div>
          </div>

          <div class="humidity-section">
            <ion-icon class="water-outline" name="water-outline"></ion-icon>
            <div class="footer-desc">
                <p class="footer-temp">${state.weatherInfo[0].humidity}%</p>
                <p class="footer-mini-desc">Humidity</p>
              </div>
          </div>
        </div>
    `;

    resultsSection.insertAdjacentHTML('beforeend', html);

    filterDates(data.list, state.weatherInfo[0].timeOfRecording);

    state.futureInfo = state.futureInfo.map(el => {
      return {
        timeStamp: el.dt,
        temp: el.main.temp,
        id: el.weather
          .map(el => {
            return el.id;
          })
          .join(''),
      };
    });

    state.futureInfo.forEach(el =>
      miniSection.insertAdjacentHTML('beforeend', generateHTML(el))
    );

    input.value = '';
  } catch (err) {
    displayError(errorMessageSearch, err);
  }
};

const pressEnterKey = e => {
  if (e.keyCode === 13) {
    citySearch(input.value);
  }
};

// Event Handlers

input.addEventListener('keydown', pressEnterKey);
btn.addEventListener('click', function () {
  navigator.geolocation.getCurrentPosition(success, failure);
});
headerTitle.addEventListener('click', closeWindow);
